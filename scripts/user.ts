// Create a user, or give an existing one a new key (lockout recovery).
//   npm run user:add -- "Name" [admin|rep] [key]
import { eq, sql } from 'drizzle-orm';
import { getDb } from '@/db';
import { sessions, users } from '@/db/schema';
import { generateKey, hashKey, isValidKey, KEY_RULE, normalizeKey } from '@/lib/auth-key';

const [name, role = 'rep', rawKey] = process.argv.slice(2);
if (!name || !['admin', 'rep'].includes(role)) {
  console.error('usage: npm run user:add -- "Name" [admin|rep] [key]');
  process.exit(1);
}
const key = rawKey ? normalizeKey(rawKey) : generateKey();
if (!isValidKey(key)) {
  console.error(`Key must be ${KEY_RULE}`);
  process.exit(1);
}

async function main() {
  const db = await getDb();
  const keyHash = await hashKey(key);
  const [existing] = await db.select().from(users).where(sql`lower(${users.name}) = lower(${name})`);
  if (existing) {
    await db.update(users).set({ keyHash, role: role as 'admin' | 'rep', active: true }).where(eq(users.id, existing.id));
    await db.delete(sessions).where(eq(sessions.userId, existing.id));
    console.log(`Updated ${existing.name} (${role}) with a new key`);
  } else {
    await db.insert(users).values({ name, role: role as 'admin' | 'rep', keyHash });
    console.log(`Created ${name} (${role})`);
  }
  const base = process.env.APP_URL ?? 'http://localhost:3000';
  console.log(`  name: ${existing?.name ?? name}\n  key:  ${key}\n  link: ${base}/auth?${new URLSearchParams({ name: existing?.name ?? name, key })}`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
