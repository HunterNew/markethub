import { Pool, PoolClient } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pgPool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/postgres',
  ssl: process.env.DB_SSL === 'false' ? false : { rejectUnauthorized: false },
});

// Convert MySQL ? placeholders to PostgreSQL $1, $2, etc.
function convertPlaceholders(sql: string): string {
  let index = 0;
  // Don't replace ? inside quoted strings
  return sql.replace(/\?/g, () => `$${++index}`);
}

// Convert MySQL-specific SQL to PostgreSQL-compatible SQL
function convertSQL(sql: string): string {
  let converted = sql;

  // Convert double-quoted string values to single quotes BEFORE backtick conversion
  // Match "word" patterns that are SQL string values (not identifiers)
  // These appear after =, IN (, LIKE, !=, SET col =, VALUES(, THEN, WHEN, etc.
  converted = converted.replace(
    /(=\s*|IN\s*\(|,\s*|THEN\s+|WHEN\s+|!=\s*|<>\s*)"([^"]*?)"/gi,
    (match, prefix, value) => `${prefix}'${value}'`
  );
  // Handle remaining double-quoted strings inside IN(...) that weren't caught
  converted = converted.replace(/\bIN\s*\(([^)]+)\)/gi, (match, inner) => {
    const fixed = inner.replace(/"([^"]*?)"/g, "'$1'");
    return `IN (${fixed})`;
  });

  // INSERT IGNORE -> INSERT ... ON CONFLICT DO NOTHING
  converted = converted.replace(/INSERT\s+IGNORE\s+INTO/gi, 'INSERT INTO');
  if (/INSERT\s+IGNORE/i.test(sql)) {
    if (!/ON\s+CONFLICT/i.test(converted)) {
      converted = converted.replace(/(\)\s*)$/, '$1 ON CONFLICT DO NOTHING');
    }
  }
  // backtick quoted identifiers -> double quotes
  converted = converted.replace(/`([^`]+)`/g, '"$1"');
  // ON DUPLICATE KEY UPDATE -> ON CONFLICT DO UPDATE
  converted = converted.replace(
    /ON\s+DUPLICATE\s+KEY\s+UPDATE\s+(.+?)$/gim,
    (match, updates) => {
      return `ON CONFLICT DO UPDATE SET ${updates}`;
    }
  );
  // IFNULL -> COALESCE
  converted = converted.replace(/IFNULL\s*\(/gi, 'COALESCE(');
  // Add RETURNING id to INSERT statements (for insertId compatibility)
  if (/^\s*INSERT\s+INTO/i.test(converted) && !/RETURNING/i.test(converted)) {
    converted = converted.replace(/\s*$/, ' RETURNING id');
  }
  return converted;
}

interface CompatConnection {
  query(sql: string, params?: any[]): Promise<[any[], any]>;
  release(): void;
  beginTransaction(): Promise<void>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
}

function wrapClient(client: PoolClient): CompatConnection {
  return {
    async query(sql: string, params?: any[]) {
      let converted = convertSQL(sql);
      converted = convertPlaceholders(converted);
      try {
        const result = await client.query(converted, params);
        // MySQL returns { insertId, affectedRows } - simulate for INSERT/UPDATE/DELETE
        if (/^\s*(INSERT|UPDATE|DELETE)/i.test(sql)) {
          const resultObj: any = result.rows || [];
          resultObj.insertId = result.rows?.[0]?.id || 0;
          resultObj.affectedRows = result.rowCount || 0;
          return [resultObj, result.fields];
        }
        return [result.rows, result.fields];
      } catch (err: any) {
        // If ON CONFLICT fails, try without it
        if (err.code === '42P10' || err.message?.includes('ON CONFLICT')) {
          const fallback = converted.replace(/ON\s+CONFLICT\s+DO\s+(NOTHING|UPDATE\s+SET\s+.+?)$/gi, '');
          try {
            const result = await client.query(fallback, params);
            return [result.rows, result.fields];
          } catch {
            throw err;
          }
        }
        throw err;
      }
    },
    release() {
      client.release();
    },
    async beginTransaction() {
      await client.query('BEGIN');
    },
    async commit() {
      await client.query('COMMIT');
    },
    async rollback() {
      await client.query('ROLLBACK');
    },
  };
}

const pool = {
  async end() {
    await pgPool.end();
  },
  async query(sql: string, params?: any[]) {
    let converted = convertSQL(sql);
    converted = convertPlaceholders(converted);
    try {
      const result = await pgPool.query(converted, params);
      if (/^\s*(INSERT|UPDATE|DELETE)/i.test(sql)) {
        const resultObj: any = result.rows || [];
        resultObj.insertId = result.rows?.[0]?.id || 0;
        resultObj.affectedRows = result.rowCount || 0;
        return [resultObj, result.fields];
      }
      return [result.rows, result.fields];
    } catch (err: any) {
      if (err.code === '42P10' || err.message?.includes('ON CONFLICT')) {
        const fallback = converted.replace(/ON\s+CONFLICT\s+DO\s+(NOTHING|UPDATE\s+SET\s+.+?)$/gi, '');
        try {
          const result = await pgPool.query(fallback, params);
          return [result.rows, result.fields];
        } catch {
          throw err;
        }
      }
      throw err;
    }
  },
  async getConnection(): Promise<CompatConnection> {
    const client = await pgPool.connect();
    return wrapClient(client);
  },
};

export default pool;
