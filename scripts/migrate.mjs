/**
 * Supabase 스키마 마이그레이션 스크립트
 * node scripts/migrate.mjs
 */
import pg from 'pg';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const { Client } = pg;
const __dir = dirname(fileURLToPath(import.meta.url));

// .env.local 수동 파싱
const env = Object.fromEntries(
  readFileSync(resolve(__dir, '../.env.local'), 'utf8')
    .split('\n')
    .filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);

const SUPABASE_URL  = env['NEXT_PUBLIC_SUPABASE_URL'];  // https://xxx.supabase.co
const SERVICE_KEY   = env['SUPABASE_SERVICE_ROLE_KEY'];
const DB_PASSWORD   = env['DATABASE_PASSWORD'];
const PROJECT_REF   = SUPABASE_URL.replace('https://', '').replace('.supabase.co', '');

// Supabase 직접 연결 문자열 (SSL 필수)
const CONNECTION_STRING =
  `postgresql://postgres:${DB_PASSWORD}@db.${PROJECT_REF}.supabase.co:5432/postgres`;

const MIGRATIONS = [
  '20260430000001_initial_schema.sql',
  '20260430000002_seed_dev.sql',
];

async function run() {
  console.log(`🔌 연결 중: ${PROJECT_REF}.supabase.co`);

  const client = new Client({
    connectionString: CONNECTION_STRING,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log('✅ Supabase 연결 성공\n');

    for (const file of MIGRATIONS) {
      const sql = readFileSync(resolve(__dir, `../supabase/migrations/${file}`), 'utf8');
      console.log(`▶ 실행 중: ${file}`);
      await client.query(sql);
      console.log(`  ✓ 완료\n`);
    }

    // 결과 확인
    const { rows } = await client.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' ORDER BY table_name;
    `);
    console.log('📋 생성된 테이블:', rows.map(r => r.table_name).join(', '));

    const counts = await client.query(`
      SELECT 'admins' t, count(*)::int c FROM admins
      UNION ALL SELECT 'staff', count(*) FROM staff
      UNION ALL SELECT 'tasks', count(*) FROM tasks;
    `);
    console.log('\n📊 시드 데이터:');
    counts.rows.forEach(r => console.log(`  ${r.t}: ${r.c}건`));

  } catch (err) {
    console.error('❌ 오류:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
