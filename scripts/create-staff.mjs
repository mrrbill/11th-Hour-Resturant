// Creates (or updates) the staff login from STAFF_EMAIL / STAFF_PASSWORD
// and adds it to public.staff. Run: npm run create-staff
// Uses the SERVICE ROLE key — run on your own computer only.
import { createClient } from '@supabase/supabase-js'

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, STAFF_EMAIL, STAFF_PASSWORD } = process.env
for (const [k, v] of Object.entries({ SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, STAFF_EMAIL, STAFF_PASSWORD })) {
  if (!v) {
    console.error(`Missing ${k} in .env`)
    process.exit(1)
  }
}
if (STAFF_PASSWORD.length < 10) {
  console.error('STAFF_PASSWORD should be at least 10 characters.')
  process.exit(1)
}

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function findUserByEmail(email) {
  for (let page = 1; page < 50; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 })
    if (error) throw error
    const hit = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase())
    if (hit) return hit
    if (data.users.length < 200) return null
  }
  return null
}

let user = await findUserByEmail(STAFF_EMAIL)
if (user) {
  const { error } = await admin.auth.admin.updateUserById(user.id, { password: STAFF_PASSWORD, email_confirm: true })
  if (error) throw error
  console.log(`Updated password for existing user ${STAFF_EMAIL}`)
} else {
  const { data, error } = await admin.auth.admin.createUser({
    email: STAFF_EMAIL,
    password: STAFF_PASSWORD,
    email_confirm: true,
  })
  if (error) throw error
  user = data.user
  console.log(`Created user ${STAFF_EMAIL}`)
}

const { error: staffErr } = await admin.from('staff').upsert({ user_id: user.id })
if (staffErr) throw staffErr
console.log('Staff access granted. Sign in at /staff')
