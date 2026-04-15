import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '..', '.env') });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL not found');
  process.exit(1);
}

const connection = await mysql.createConnection(connectionString);

console.log('Connected to database. Creating tables...');

// Create dailyMeetings table
await connection.execute(`
  CREATE TABLE IF NOT EXISTS \`dailyMeetings\` (
    \`id\` int NOT NULL AUTO_INCREMENT,
    \`meetingDate\` date NOT NULL,
    \`jqlUsed\` text,
    \`durationSeconds\` int NOT NULL DEFAULT 0,
    \`totalDevs\` int NOT NULL DEFAULT 0,
    \`registeredDevs\` int NOT NULL DEFAULT 0,
    \`silentDevs\` json DEFAULT NULL,
    \`aiReport\` text,
    \`metricsSnapshot\` json DEFAULT NULL,
    \`status\` enum('in_progress','concluded') NOT NULL DEFAULT 'in_progress',
    \`createdBy\` int DEFAULT NULL,
    \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    \`updatedAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
`);
console.log('✅ dailyMeetings table created (or already exists)');

// Create dailyDevTurns table
await connection.execute(`
  CREATE TABLE IF NOT EXISTS \`dailyDevTurns\` (
    \`id\` int NOT NULL AUTO_INCREMENT,
    \`meetingId\` int NOT NULL,
    \`devName\` varchar(255) NOT NULL,
    \`devId\` varchar(255) DEFAULT NULL,
    \`currentTask\` text,
    \`currentTaskComment\` text,
    \`nextTask\` text,
    \`nextTaskComment\` text,
    \`hasImpediment\` int NOT NULL DEFAULT 0,
    \`impedimentIssue\` varchar(255) DEFAULT NULL,
    \`impedimentComment\` text,
    \`summary\` text,
    \`issuesData\` json DEFAULT NULL,
    \`registered\` int NOT NULL DEFAULT 0,
    \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    \`updatedAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`),
    KEY \`meetingId_idx\` (\`meetingId\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
`);
console.log('✅ dailyDevTurns table created (or already exists)');

await connection.end();
console.log('Done!');
