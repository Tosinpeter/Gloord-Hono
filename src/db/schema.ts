import { randomUUID } from 'node:crypto'
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'

export const users = sqliteTable('users', {
  id: text('id').primaryKey().$defaultFn(() => randomUUID()),
  phone_number: text('phone_number').notNull().unique(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date())
})

export const genderEnum = ['male', 'female', 'non_binary', 'other'] as const
export type Gender = (typeof genderEnum)[number]

export const profile = sqliteTable('profiles', {
  id: text('id').primaryKey().notNull().references(() => users.id),
  fullname: text('fullname'),
  age: text('age'),
  gender: text('gender', { enum: genderEnum }),
  skin_type: text('skin_type'),
  skin_sensitivity: text('skin_sensitivity'),
  skin_concerns: text('skin_concerns', { mode: 'json' }).$type<string[]>(),
  health_conditions: text('health_conditions')
})

export const discountTypeEnum = ['percent', 'fixed'] as const
export type DiscountType = (typeof discountTypeEnum)[number]

export const coupons = sqliteTable('coupons', {
  id: text('id').primaryKey().$defaultFn(() => randomUUID()),
  code: text('code').notNull().unique(),
  discount_type: text('discount_type', { enum: discountTypeEnum }).notNull(),
  discount_value: integer('discount_value').notNull(), // percent 1-100 or fixed amount in cents
  min_order_cents: integer('min_order_cents'),
  valid_from: integer('valid_from', { mode: 'timestamp' }),
  valid_until: integer('valid_until', { mode: 'timestamp' }),
  usage_limit: integer('usage_limit'),
  used_count: integer('used_count').notNull().$defaultFn(() => 0),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date())
})

export const savedCards = sqliteTable('saved_cards', {
  id: text('id').primaryKey().$defaultFn(() => randomUUID()),
  last4: text('last4').notNull(),
  brand: text('brand').notNull().$defaultFn(() => 'mastercard'),
  exp_month: integer('exp_month').notNull(),
  exp_year: integer('exp_year').notNull(),
  is_default: integer('is_default', { mode: 'boolean' }).notNull().$defaultFn(() => false),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date())
})

export const orders = sqliteTable('orders', {
  id: text('id').primaryKey().$defaultFn(() => randomUUID()),
  delivery_first_name: text('delivery_first_name').notNull(),
  delivery_email: text('delivery_email').notNull(),
  delivery_address: text('delivery_address').notNull(),
  delivery_apartment: text('delivery_apartment'),
  delivery_city: text('delivery_city').notNull(),
  delivery_postal_code: text('delivery_postal_code').notNull(),
  delivery_phone: text('delivery_phone'),
  delivery_country: text('delivery_country').notNull(),
  subtotal_cents: integer('subtotal_cents').notNull(),
  shipment_cents: integer('shipment_cents').notNull(),
  insurance_cents: integer('insurance_cents').notNull(),
  discount_cents: integer('discount_cents').notNull().$defaultFn(() => 0),
  total_cents: integer('total_cents').notNull(),
  card_last4: text('card_last4').notNull(),
  coupon_code: text('coupon_code'),
  status: text('status').notNull().$defaultFn(() => 'placed'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date())
})

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type Profile = typeof profile.$inferSelect
export type NewProfile = typeof profile.$inferInsert
export type Coupon = typeof coupons.$inferSelect
export type NewCoupon = typeof coupons.$inferInsert
export type SavedCard = typeof savedCards.$inferSelect
export type NewSavedCard = typeof savedCards.$inferInsert
export const notificationTypeEnum = ['prescription_ready', 'review_completed', 'night_routine', 'order_shipped'] as const
export type NotificationType = (typeof notificationTypeEnum)[number]

export const notifications = sqliteTable('notifications', {
  id: text('id').primaryKey().$defaultFn(() => randomUUID()),
  user_id: text('user_id').notNull().references(() => users.id),
  title: text('title').notNull(),
  subtitle: text('subtitle').notNull(),
  notification_type: text('notification_type', { enum: notificationTypeEnum }).notNull(),
  is_read: integer('is_read', { mode: 'boolean' }).notNull().$defaultFn(() => false),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date())
})

export const uploadedFiles = sqliteTable('uploaded_files', {
  id: text('id').primaryKey().$defaultFn(() => randomUUID()),
  user_id: text('user_id').notNull().references(() => users.id),
  filename: text('filename').notNull(),
  file_path: text('file_path').notNull(),
  mime_type: text('mime_type'),
  size_bytes: integer('size_bytes').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date())
})

export const staffRoleEnum = ['admin', 'doctor'] as const
export type StaffRole = (typeof staffRoleEnum)[number]

export const staff = sqliteTable('staff', {
  id: text('id').primaryKey().$defaultFn(() => randomUUID()),
  email: text('email').notNull().unique(),
  password_hash: text('password_hash').notNull(),
  role: text('role', { enum: staffRoleEnum }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date())
})

export type Staff = typeof staff.$inferSelect
export type NewStaff = typeof staff.$inferInsert

export type Order = typeof orders.$inferSelect
export type NewOrder = typeof orders.$inferInsert
export type NotificationRow = typeof notifications.$inferSelect
export type NewNotification = typeof notifications.$inferInsert
export type UploadedFileRow = typeof uploadedFiles.$inferSelect
export type NewUploadedFile = typeof uploadedFiles.$inferInsert
