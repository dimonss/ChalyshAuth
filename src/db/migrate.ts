import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import 'dotenv/config';

function runMigrations() {
    const dbPath = process.env.DATABASE_PATH || './data/chalysh_auth.db';
    const sqlite = new Database(dbPath);
    sqlite.pragma('journal_mode = WAL');
    sqlite.pragma('foreign_keys = ON');

    const db = drizzle(sqlite);

    console.log('Running migrations...');
    migrate(db, { migrationsFolder: './drizzle' });
    console.log('Migrations completed successfully.');

    sqlite.close();
}

runMigrations();
