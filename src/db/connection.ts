import Database from 'better-sqlite3';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema.js';

let sqlite: InstanceType<typeof Database>;
let db: BetterSQLite3Database<typeof schema>;

export function initDatabase(dbPath: string) {
    sqlite = new Database(dbPath);
    sqlite.pragma('journal_mode = WAL');
    sqlite.pragma('foreign_keys = ON');
    db = drizzle(sqlite, { schema });
    return db;
}

export function getDb() {
    if (!db) {
        throw new Error('Database not initialized. Call initDatabase() first.');
    }
    return db;
}

export function getSqlite(): InstanceType<typeof Database> {
    if (!sqlite) {
        throw new Error('Database not initialized. Call initDatabase() first.');
    }
    return sqlite;
}
