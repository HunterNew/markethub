import fs from 'fs';
import path from 'path';
import { Client } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// Convert MySQL DDL to PostgreSQL DDL
function convertMySQLToPostgres(sql: string): string {
  let converted = sql;

  // AUTO_INCREMENT -> SERIAL (handled by changing INT ... AUTO_INCREMENT to SERIAL)
  converted = converted.replace(/\bINT\b\s*(NOT\s+NULL\s*)?PRIMARY\s+KEY\s+AUTO_INCREMENT/gi, 'SERIAL PRIMARY KEY');
  converted = converted.replace(/\bINT\b\s+AUTO_INCREMENT\s*(NOT\s+NULL\s*)?PRIMARY\s+KEY/gi, 'SERIAL PRIMARY KEY');
  converted = converted.replace(/\bINT\b\s+PRIMARY\s+KEY\s+AUTO_INCREMENT/gi, 'SERIAL PRIMARY KEY');
  converted = converted.replace(/\bINT\b\s+AUTO_INCREMENT/gi, 'SERIAL');
  converted = converted.replace(/\bBIGINT\b\s+AUTO_INCREMENT/gi, 'BIGSERIAL');

  // Remove ENGINE=InnoDB and other MySQL engine specs
  converted = converted.replace(/\s*ENGINE\s*=\s*\w+/gi, '');
  converted = converted.replace(/\s*DEFAULT\s+CHARSET\s*=\s*\w+/gi, '');
  converted = converted.replace(/\s*COLLATE\s*=?\s*\w+/gi, '');
  converted = converted.replace(/\s*CHARACTER\s+SET\s+\w+/gi, '');

  // backtick identifiers -> double quotes or just remove them
  converted = converted.replace(/`([^`]+)`/g, '"$1"');

  // TINYINT(1) -> BOOLEAN
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

  // DEFAULT CURRENT_TIMESTAMP
  converted = converted.replace(/\bDEFAULT\s+CURRENT_TIMESTAMP/gi, 'DEFAULT NOW()');

  // INSERT IGNORE -> INSERT INTO
  converted = converted.replace(/INSERT\s+IGNORE\s+INTO/gi, 'INSERT INTO');

  // MODIFY COLUMN -> ALTER COLUMN ... TYPE
  converted = converted.replace(/MODIFY\s+COLUMN\s+"?(\w+)"?\s+(.+)/gi, 'ALTER COLUMN "$1" TYPE $2');

  // Boolean defaults
  converted = converted.replace(/\bBOOLEAN\b(.*?)DEFAULT\s+0/gi, 'BOOLEAN$1DEFAULT false');
  converted = converted.replace(/\bBOOLEAN\b(.*?)DEFAULT\s+1/gi, 'BOOLEAN$1DEFAULT true');
  converted = converted.replace(/\bBOOLEAN\b(.*?)DEFAULT\s+'0'/gi, 'BOOLEAN$1DEFAULT false');
  converted = converted.replace(/\bBOOLEAN\b(.*?)DEFAULT\s+'1'/gi, 'BOOLEAN$1DEFAULT true');

  // UNSIGNED - remove
  converted = converted.replace(/\bUNSIGNED\b/gi, '');

  // FLOAT -> REAL
  converted = converted.replace(/\bFLOAT\b/gi, 'REAL');

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
        try {
          await client.query(stmt);
        } catch (err: any) {
          // Skip errors for things like "already exists"
          if (err.code === '42P07' || err.code === '42701') {
            console.log(`  ⚠️  Skipped (already exists): ${err.message.split('\n')[0]}`);
            continue;
          }
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
