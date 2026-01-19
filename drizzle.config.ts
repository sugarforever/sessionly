import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: './electron/main/schema.ts',
  out: './drizzle',
  dialect: 'sqlite',
  dbCredentials: {
    url: './data/dev.db',
  },
})
