import fs from 'fs';
import path from 'path';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function migrate() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: true } : undefined,
    // multipleStatements not needed — statements are executed individually
  });

  try {
    // Create database if not exists
    await connection.query(
      `CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME || 'multivendor_ecommerce'}\``
    );
    await connection.query(`USE \`${process.env.DB_NAME || 'multivendor_ecommerce'}\``);

    // Create migrations tracking table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id INT PRIMARY KEY AUTO_INCREMENT,
        filename VARCHAR(255) UNIQUE NOT NULL,
        executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const migrationsDir = path.join(__dirname, 'migrations');
    const files = fs.readdirSync(migrationsDir).sort();

    for (const file of files) {
      if (!file.endsWith('.sql')) continue;

      const [rows] = await connection.query(
        'SELECT id FROM migrations WHERE filename = ?',
        [file]
      ) as any[];

      if (rows.length > 0) {
        console.log(`⏭  Skipping ${file} (already executed)`);
        continue;
      }

      console.log(`▶  Running migration: ${file}`);
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
      const statements = sql
        .split(/;\s*\n/)
        .map(s => s.replace(/--.*$/gm, '').trim())
        .filter(s => s.length > 0);
      for (const stmt of statements) {
        await connection.query(stmt);
      }
      await connection.query('INSERT INTO migrations (filename) VALUES (?)', [file]);
      console.log(`✅ Completed: ${file}`);
    }

    console.log('\n🎉 All migrations completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

migrate();
