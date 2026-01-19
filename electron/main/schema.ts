import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

/**
 * Drizzle ORM Schema Definition
 *
 * This file is the single source of truth for your database schema.
 * - TypeScript-first: Schema is defined in TypeScript
 * - Type-safe: Drizzle generates types automatically
 * - Migrations: Use `npm run db:generate` to create migration SQL
 *
 * Benefits over raw SQL:
 * - Auto-completion in IDE
 * - Type checking at compile time
 * - No SQL typos
 * - Schema is self-documenting
 */

/**
 * Users Table
 *
 * Stores user account information
 */
export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  email: text('email').notNull().unique(),
  name: text('name'),
  createdAt: text('created_at')
    .notNull()
    .default(sql`(datetime('now'))`)
    .$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at')
    .notNull()
    .default(sql`(datetime('now'))`)
    .$defaultFn(() => new Date().toISOString()),
})

/**
 * Example: Posts Table (commented out - uncomment when needed)
 *
 * Demonstrates:
 * - Foreign key relationships
 * - Indexes for performance
 * - Optional fields
 */
/*
export const posts = sqliteTable(
  'posts',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    content: text('content'),
    createdAt: text('created_at')
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (table) => ({
    // Indexes for better query performance
    userIdIdx: index('idx_posts_user_id').on(table.userId),
    createdAtIdx: index('idx_posts_created_at').on(table.createdAt),
  })
)
*/

// Export types for use in the rest of the app
export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert

/*
// When you uncomment posts table, export these types too:
export type Post = typeof posts.$inferSelect
export type NewPost = typeof posts.$inferInsert
*/
