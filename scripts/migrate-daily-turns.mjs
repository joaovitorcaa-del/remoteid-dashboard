import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

const connection = await mysql.createConnection(DATABASE_URL);

console.log('Connected to database');

const migrations = [
  // Add new columns to dailyDevTurns if they don't exist
  `ALTER TABLE dailyDevTurns 
    ADD COLUMN IF NOT EXISTS jiraUsername VARCHAR(100),
    ADD COLUMN IF NOT EXISTS turnOrder INT DEFAULT 0 NOT NULL,
    ADD COLUMN IF NOT EXISTS startedAt TIMESTAMP NULL,
    ADD COLUMN IF NOT EXISTS finishedAt TIMESTAMP NULL,
    ADD COLUMN IF NOT EXISTS durationSeconds INT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS issues JSON,
    ADD COLUMN IF NOT EXISTS completedTasks INT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS hasWorkInProgress INT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS willStartNewTask INT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS hasBlockers INT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS blockersDescription TEXT`,
];

for (const sql of migrations) {
  try {
    await connection.execute(sql);
    console.log('✅ Migration executed successfully');
  } catch (err) {
    if (err.code === 'ER_DUP_FIELDNAME') {
      console.log('⏭️  Column already exists, skipping');
    } else {
      console.error('❌ Migration error:', err.message);
    }
  }
}

await connection.end();
console.log('Done!');
