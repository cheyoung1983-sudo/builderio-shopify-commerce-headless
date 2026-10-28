import { pgTable, text, timestamp, integer, boolean, jsonb } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  uid: text('uid').primaryKey(),
  email: text('email').notNull().unique(),
  role: text('role').default('technician').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const auth0Users = pgTable('auth0_users', {
  userId: text('user_id').primaryKey(),
  email: text('email').notNull(),
  emailVerified: boolean('email_verified').default(false),
  phoneNumber: text('phone_number'),
  name: text('name'),
  metadata: jsonb('metadata'),
  personaInquiryId: text('persona_inquiry_id'),
  verificationStatus: text('verification_status'),
  lastSyncedAt: timestamp('last_synced_at').defaultNow(),
});

export const auditLogs = pgTable('audit_logs', {
  id: text('id').primaryKey(),
  eventType: text('event_type').notNull(),
  userId: text('user_id').notNull(),
  email: text('email'),
  personaInquiryId: text('persona_inquiry_id'),
  timestamp: timestamp('timestamp').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const adminSettings = pgTable('admin_settings', {
  key: text('key').primaryKey(),
  value: jsonb('value').notNull(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
