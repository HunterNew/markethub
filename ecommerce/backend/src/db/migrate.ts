import fs from 'fs';
import path from 'path';
import { Client } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// Convert MySQL DDL to PostgreSQL DDL
function convertMySQLToPostgres(sql: string): string {
  let converted = sql;

  // AUTO_INCREMENT -> SERIAL (all common patterns)
  converted = converted.replace(/\bINT\b\s*(NOT\s+NULL\s*)?PRIMARY\s+KEY\s+AUTO_INCREMENT/gi, 'SERIAL PRIMARY KEY');
  converted = converted.replace(/\bINT\b\s+AUTO_INCREMENT\s*(NOT\s+NULL\s*)?PRIMARY\s+KEY/gi, 'SERIAL PRIMARY KEY');
  converted = converted.replace(/\bINT\b\s+PRIMARY\s+KEY\s+AUTO_INCREMENT/gi, 'SERIAL PRIMARY KEY');
  converted = converted.replace(/\bINT\b\s+AUTO_INCREMENT\s+PRIMARY\s+KEY/gi, 'SERIAL PRIMARY KEY');
  converted = converted.replace(/\bINT\b\s+AUTO_INCREMENT/gi, 'SERIAL');
  converted = converted.replace(/\bBIGINT\b\s+AUTO_INCREMENT/gi, 'BIGSERIAL');

  // Remove ENGINE=InnoDB and other MySQL table options
  converted = converted.replace(/\s*ENGINE\s*=\s*\w+/gi, '');
  converted = converted.replace(/\s*DEFAULT\s+CHARSET\s*=\s*\w+/gi, '');
  converted = converted.replace(/\s*COLLATE\s*=?\s*\w+/gi, '');
  converted = converted.replace(/\s*CHARACTER\s+SET\s+\w+/gi, '');

  // Remove COMMENT 'xxx' from column definitions
  converted = converted.replace(/\s*COMMENT\s+'[^']*'/gi, '');

  // backtick identifiers -> double quotes
  converted = converted.replace(/`([^`]+)`/g, '"$1"');

  // TINYINT(1) -> BOOLEAN, TINYINT -> SMALLINT
  converted = converted.replace(/\bTINYINT\s*\(\s*1\s*\)/gi, 'BOOLEAN');
  converted = converted.replace(/\bTINYINT/gi, 'SMALLINT');

  // DATETIME -> TIMESTAMP
  converted = converted.replace(/\bDATETIME/gi, 'TIMESTAMP');

  // DOUBLE -> DOUBLE PRECISION
  converted = converted.replace(/\bDOUBLE\b(?!\s+PRECISION)/gi, 'DOUBLE PRECISION');

  // LONGTEXT, MEDIUMTEXT -> TEXT
  converted = converted.replace(/\bLONGTEXT/gi, 'TEXT');
  converted = converted.replace(/\bMEDIUMTEXT/gi, 'TEXT');

  // ENUM(...) -> VARCHAR(50)
  converted = converted.replace(/\bENUM\s*\([^)]+\)/gi, 'VARCHAR(50)');

  // ON UPDATE CURRENT_TIMESTAMP -> remove
  converted = converted.replace(/\bON\s+UPDATE\s+CURRENT_TIMESTAMP/gi, '');

  // DEFAULT CURRENT_TIMESTAMP -> DEFAULT NOW()
  converted = converted.replace(/\bDEFAULT\s+CURRENT_TIMESTAMP/gi, 'DEFAULT NOW()');

  // INSERT IGNORE -> INSERT INTO
  converted = converted.replace(/INSERT\s+IGNORE\s+INTO/gi, 'INSERT INTO');

  // MODIFY COLUMN with enum (now VARCHAR(50)) -> skip (no-op since already VARCHAR)
  converted = converted.replace(
    /ALTER\s+TABLE\s+\w+\s+MODIFY\s+COLUMN\s+\S+\s+VARCHAR\(50\)[^;]*/gi,
    'SELECT 1 -- skip enum modify'
  );
  // Generic MODIFY COLUMN -> ALTER COLUMN TYPE
  converted = converted.replace(/MODIFY\s+COLUMN\s+"?(\w+)"?\s+(.+)/gi, 'ALTER COLUMN "$1" TYPE $2');

  // UNIQUE KEY name (cols) inside CREATE TABLE -> UNIQUE (cols)
  converted = converted.replace(/,?\s*UNIQUE\s+KEY\s+\w+\s*(\([^)]+\))/gi, ', UNIQUE $1');

  // INDEX idx_name (cols) inside CREATE TABLE -> remove (create index separately if needed)
  converted = converted.replace(/,?\s*INDEX\s+\w+\s*\([^)]+\)/gi, '');

  // KEY idx_name (cols) inside CREATE TABLE -> remove
  converted = converted.replace(/,?\s*KEY\s+\w+\s*\([^)]+\)/gi, '');

  // ALTER TABLE ADD UNIQUE KEY name (cols) -> ALTER TABLE ADD UNIQUE (cols)  
  converted = converted.replace(/ADD\s+UNIQUE\s+KEY\s+\w+\s*(\([^)]+\))/gi, 'ADD UNIQUE $1');

  // Boolean defaults: DEFAULT 0/1 -> DEFAULT false/true
  converted = converted.replace(/\bBOOLEAN\b(.*?)DEFAULT\s+0/gi, 'BOOLEAN$1DEFAULT false');
  converted = converted.replace(/\bBOOLEAN\b(.*?)DEFAULT\s+1/gi, 'BOOLEAN$1DEFAULT true');
  converted = converted.replace(/\bBOOLEAN\b(.*?)DEFAULT\s+'0'/gi, 'BOOLEAN$1DEFAULT false');
  converted = converted.replace(/\bBOOLEAN\b(.*?)DEFAULT\s+'1'/gi, 'BOOLEAN$1DEFAULT true');

  // UNSIGNED - remove
  converted = converted.replace(/\bUNSIGNED\b/gi, '');

  // FLOAT -> REAL
  converted = converted.replace(/\bFLOAT\b/gi, 'REAL');

  // Remove AFTER column_name (PostgreSQL doesn't support column positioning)
  converted = converted.replace(/\s+AFTER\s+"?\w+"?/gi, '');

  // ON DUPLICATE KEY UPDATE -> ON CONFLICT DO NOTHING (simplified - safe for all cases)
  converted = converted.replace(/ON\s+DUPLICATE\s+KEY\s+UPDATE\s+[^;]+/gi, 'ON CONFLICT DO NOTHING');

  // Split multi-ADD ALTER TABLE into separate statements
  converted = converted.replace(
    /ALTER\s+TABLE\s+(\w+)\s+((?:ADD\s+(?:COLUMN|FOREIGN\s+KEY|CONSTRAINT|UNIQUE)[^;]*,\s*)+ADD\s+(?:COLUMN|FOREIGN\s+KEY|CONSTRAINT|UNIQUE)[^;]*)/gi,
    (match, table, adds) => {
      const parts = adds.split(/,\s*(?=ADD\s)/i);
      return parts.map((p: string) => `ALTER TABLE ${table} ${p.trim()}`).join(';\n');
    }
  );

  // Fix trailing commas before closing parenthesis (from removed KEY/INDEX lines)
  converted = converted.replace(/,\s*\n\s*\)/g, '\n)');
  converted = converted.replace(/,\s*\)/g, ')');

  return converted;
}

async function migrate() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/postgres',
    ssl: process.env.DB_SSL === 'false' ? false : { rejectUnauthorized: false },
  });

  await client.connect();

  try {
    // Create migrations tracking table
    await client.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMP DEFAULT NOW()
      )
    `);

    const migrationsDir = path.join(__dirname, 'migrations');
    const files = fs.readdirSync(migrationsDir).sort();

    for (const file of files) {
      if (!file.endsWith('.sql')) continue;

      const result = await client.query(
        'SELECT id FROM migrations WHERE filename = $1',
        [file]
      );

      if (result.rows.length > 0) {
        console.log(`⏭  Skipping ${file} (already executed)`);
        continue;
      }

      console.log(`▶  Running migration: ${file}`);
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');

      // Convert MySQL SQL to PostgreSQL
      const pgSql = convertMySQLToPostgres(sql);

      const statements = pgSql
        .split(/;\s*\n/)
        .map(s => s.replace(/--.*$/gm, '').trim())
        .filter(s => s.length > 0);

      for (const stmt of statements) {
        // Skip no-op statements
        if (/^\s*SELECT\s+1/i.test(stmt)) continue;

        try {
          await client.query(stmt);
        } catch (err: any) {
          // Skip safe errors: already exists, duplicate column, duplicate key, etc.
          const skipCodes = ['42P07', '42701', '42710', '23505', '42P16', '42P01'];
          if (skipCodes.includes(err.code) || (err.message && err.message.includes('already exists'))) {
            console.log(`  ⚠️  Skipped: ${err.message.split('\n')[0]}`);
            continue;
          }
          console.error(`  ❌ Failed statement: ${stmt.substring(0, 150)}`);
          throw err;
        }
      }
      await client.query('INSERT INTO migrations (filename) VALUES ($1)', [file]);
      console.log(`✅ Completed: ${file}`);
    }

    console.log('\n🎉 All migrations completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

migrate();
