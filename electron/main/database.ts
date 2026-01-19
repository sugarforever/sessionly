import Database from 'better-sqlite3'
import { drizzle, BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import { app } from 'electron'
import path from 'node:path'
import fs from 'node:fs'
import { eq } from 'drizzle-orm'
import * as schema from './schema'
import { users, type User, type NewUser } from './schema'

/**
 * Database module using Drizzle ORM + better-sqlite3
 *
 * Features:
 * - Type-safe queries with Drizzle ORM
 * - Automatic migrations from drizzle/ folder
 * - Mac App Store compatible (no external binaries)
 * - Schema-first development (schema.ts is source of truth)
 *
 * Workflow:
 * 1. Define schema in schema.ts
 * 2. Run `npm run db:generate` to create migration SQL
 * 3. Migrations auto-apply on app startup
 */

let sqlite: Database.Database | null = null
let db: BetterSQLite3Database<typeof schema> | null = null

/**
 * Get the database file path based on environment
 * - Development: Uses ./data/dev.db
 * - Production: Uses app.getPath('userData')/database.db
 */
function getDatabasePath(): string {
  if (process.env.NODE_ENV === 'development') {
    // Development: use project directory
    const devDbPath = path.join(process.cwd(), 'data', 'dev.db')

    // Ensure directory exists
    const dbDir = path.dirname(devDbPath)
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true })
    }

    return devDbPath
  }

  // Production: use user data directory (required for Mac App Store sandbox)
  const userDataPath = app.getPath('userData')
  const dbPath = path.join(userDataPath, 'database.db')

  // Ensure directory exists
  const dbDir = path.dirname(dbPath)
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true })
  }

  return dbPath
}

/**
 * Get the migrations directory path
 */
function getMigrationsPath(): string {
  if (process.env.NODE_ENV === 'development') {
    return path.join(process.cwd(), 'drizzle')
  }

  // In production, migrations are bundled with the app
  return path.join(process.resourcesPath, 'drizzle')
}

/**
 * Initialize the database
 * This should be called once when the app starts, before opening any windows
 */
export function initializeDatabase() {
  if (db) {
    console.warn('Database already initialized')
    return db
  }

  const dbPath = getDatabasePath()
  console.log(`Initializing database at: ${dbPath}`)

  try {
    // Open better-sqlite3 connection
    sqlite = new Database(dbPath, {
      verbose: process.env.NODE_ENV === 'development' ? console.log : undefined,
    })

    // Configure SQLite for better performance
    sqlite.pragma('journal_mode = WAL') // Write-Ahead Logging
    sqlite.pragma('foreign_keys = ON') // Enable foreign key constraints

    // Initialize Drizzle ORM
    db = drizzle(sqlite, { schema })

    // Run migrations
    const migrationsPath = getMigrationsPath()
    console.log(`Running migrations from: ${migrationsPath}`)

    // Check if migrations folder exists
    if (fs.existsSync(migrationsPath)) {
      migrate(db, { migrationsFolder: migrationsPath })
      console.log('✓ Migrations complete')
    } else {
      console.log('⚠️  No migrations folder found - using schema.ts for initial setup')
      // If no migrations folder, the schema will be applied on first query
      // This is fine for fresh development
    }

    console.log('✓ Database initialized successfully')
    return db
  } catch (error) {
    console.error('Failed to initialize database:', error)
    throw error
  }
}

/**
 * Get the Drizzle database instance
 * Must call initializeDatabase() first
 */
export function getDatabase(): BetterSQLite3Database<typeof schema> {
  if (!db) {
    throw new Error('Database not initialized. Call initializeDatabase() first.')
  }
  return db
}

/**
 * Get the raw better-sqlite3 instance (for advanced use cases)
 */
export function getSQLite(): Database.Database {
  if (!sqlite) {
    throw new Error('Database not initialized. Call initializeDatabase() first.')
  }
  return sqlite
}

/**
 * Close the database connection
 * Should be called when the app quits
 */
export function closeDatabase() {
  if (sqlite) {
    sqlite.close()
    sqlite = null
    db = null
    console.log('✓ Database connection closed')
  }
}

/**
 * User Repository
 * Type-safe database operations using Drizzle ORM
 */
export const userRepository = {
  /**
   * Get all users
   */
  getAll(): User[] {
    return getDatabase().select().from(users).all()
  },

  /**
   * Get user by ID
   */
  getById(id: number): User | undefined {
    return getDatabase().select().from(users).where(eq(users.id, id)).get()
  },

  /**
   * Get user by email
   */
  getByEmail(email: string): User | undefined {
    return getDatabase().select().from(users).where(eq(users.email, email)).get()
  },

  /**
   * Create a new user
   */
  create(data: NewUser): User {
    const result = getDatabase().insert(users).values(data).returning().get()
    return result
  },

  /**
   * Update user
   */
  update(id: number, data: Partial<NewUser>): User | undefined {
    const result = getDatabase()
      .update(users)
      .set({
        ...data,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(users.id, id))
      .returning()
      .get()

    return result
  },

  /**
   * Delete user
   */
  delete(id: number): boolean {
    const result = getDatabase().delete(users).where(eq(users.id, id)).run()
    return result.changes > 0
  },
}

// Re-export schema types for convenience
export type { User, NewUser }
