import { db } from './index.js'
import { users, coupons, staff } from './schema.js'
import { hashPassword } from '../lib/password.js'

async function seed() {
  // Seed users (onConflictDoNothing so re-running is safe)
  await db
    .insert(users)
    .values([
      { phone_number: '+1234567890' }
    ])
    .onConflictDoNothing({ target: users.phone_number })

  // Demo staff for gloord (admin & doctor)
  const demoAdminPassword = 'DemoAdmin123!'
  const demoDoctorPassword = 'DemoDoctor123!'
  await db
    .insert(staff)
    .values([
      { email: 'admin@demo.com', password_hash: hashPassword(demoAdminPassword), role: 'admin' },
      { email: 'doctor@demo.com', password_hash: hashPassword(demoDoctorPassword), role: 'doctor' }
    ])
    .onConflictDoNothing({ target: staff.email })
  console.log('Demo staff: admin@demo.com / DemoAdmin123!  |  doctor@demo.com / DemoDoctor123!')

  // Seed coupons (replace by code so re-running updates nothing if codes exist)
  const couponRows = [
    { code: 'WELCOME10', discount_type: 'percent' as const, discount_value: 10, min_order_cents: 500, usage_limit: 1000 },
    { code: 'SAVE20', discount_type: 'percent' as const, discount_value: 20, min_order_cents: 2000, usage_limit: 500 },
    { code: 'FLAT50', discount_type: 'fixed' as const, discount_value: 5000, min_order_cents: 10000, usage_limit: 200 }, // $50 off
  ]
  for (const row of couponRows) {
    await db
      .insert(coupons)
      .values({
        code: row.code,
        discount_type: row.discount_type,
        discount_value: row.discount_value,
        min_order_cents: row.min_order_cents ?? null,
        usage_limit: row.usage_limit ?? null,
      })
      .onConflictDoNothing({ target: coupons.code })
  }

  console.log('Seed completed.')
}

seed().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
