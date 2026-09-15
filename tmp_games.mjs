import { createRequire } from 'module';
const req = createRequire(import.meta.url);
const dotenv = req('dotenv');
dotenv.config({ path: 'E:/sandbox/.env.local' });

const { neon } = await import('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);

const rows = await sql`SELECT id, title, sandbox_id, created_at FROM games ORDER BY created_at DESC LIMIT 5`;
console.log('Recent games:');
for (const r of rows) {
  console.log(`  id=${r.id} sandbox=${r.sandbox_id} title=${r.title}`);
}
