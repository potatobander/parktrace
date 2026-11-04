import {sqliteTable, text, integer, index} from 'drizzle-orm/sqlite-core';
export const apiQuota = sqliteTable('api_quota', {
  bucket: text('bucket').primaryKey(),
  count: integer('count').notNull().default(0),
  expiresAt: integer('expires_at').notNull(),
}, table => [index('api_quota_expiry_idx').on(table.expiresAt)]);
