/**
 * ChalaChitra — Smoke Test
 * Covers: backend health, admin login, old-email rejection,
 *         TMDB key from SQLite, live TMDB fetch, logout-page routes.
 */

const API = 'http://localhost:3002/api';
const FRONT = 'http://localhost:3001';

let passed = 0;
let failed = 0;

async function check(name, fn) {
  try {
    await fn();
    console.log(`  ✅  ${name}`);
    passed++;
  } catch (e) {
    console.error(`  ❌  ${name}\n       → ${e.message}`);
    failed++;
  }
}

function assert(condition, msg) {
  if (!condition) throw new Error(msg || 'Assertion failed');
}

// ── 1. Backend health ──────────────────────────────────────────────────────────
await check('Backend /api/settings responds 200', async () => {
  const r = await fetch(`${API}/settings`);
  assert(r.ok, `HTTP ${r.status}`);
});

// ── 2. Frontend health ─────────────────────────────────────────────────────────
await check('Frontend port 3001 responds 200', async () => {
  const r = await fetch(FRONT);
  assert(r.ok, `HTTP ${r.status}`);
});

// ── 3. Admin login with new email ─────────────────────────────────────────────
await check('Admin login: chalachitra@gmail.com / Admin@1234 succeeds', async () => {
  const r = await fetch(`${API}/users/authenticate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'chalachitra@gmail.com', password: 'Admin@1234' }),
  });
  assert(r.ok, `HTTP ${r.status}`);
  const data = await r.json();
  assert(data.role === 'ADMIN', `Expected ADMIN, got ${data.role}`);
  assert(data.email === 'chalachitra@gmail.com', `Email mismatch: ${data.email}`);
});

// ── 4. Old email is rejected ──────────────────────────────────────────────────
await check('Old email admin@cinema.com is rejected (401)', async () => {
  const r = await fetch(`${API}/users/authenticate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@cinema.com', password: 'Admin@1234' }),
  });
  assert(r.status === 401, `Expected 401, got ${r.status}`);
});

// ── 5. TMDB key is present in SQLite settings ─────────────────────────────────
let tmdbKey = null;
await check('SQLite settings has non-empty tmdb_api_key', async () => {
  const r = await fetch(`${API}/settings/tmdb_api_key`);
  assert(r.ok, `HTTP ${r.status}`);
  const data = await r.json();
  assert(data.value && data.value.length > 10, `Key too short or missing: ${data.value}`);
  tmdbKey = data.value;
});

// ── 6. Live TMDB fetch ────────────────────────────────────────────────────────
await check('Live TMDB /trending/movie/week returns ≥ 1 result', async () => {
  assert(tmdbKey, 'No TMDB key available (previous test failed)');
  const r = await fetch(
    `https://api.tmdb.org/3/trending/movie/week?api_key=${tmdbKey}&page=1`,
  );
  assert(r.ok, `HTTP ${r.status}`);
  const data = await r.json();
  assert(Array.isArray(data.results) && data.results.length > 0,
    `Expected results array, got ${JSON.stringify(data).slice(0, 80)}`);
});

// ── 7. Regular user login ─────────────────────────────────────────────────────
await check('Regular user login: user@cinema.com / user123 succeeds', async () => {
  const r = await fetch(`${API}/users/authenticate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'user@cinema.com', password: 'user123' }),
  });
  assert(r.ok, `HTTP ${r.status}`);
  const data = await r.json();
  assert(data.role === 'USER', `Expected USER, got ${data.role}`);
});

// ── 8. Logout page routes rendered correctly ──────────────────────────────────
const expectedPaths = ['/', '/search', '/series', '/anime-world'];
for (const path of expectedPaths) {
  await check(`Logout option route ${path} is reachable (200)`, async () => {
    const r = await fetch(`${FRONT}${path === '/' ? '' : path}`);
    assert(r.ok, `HTTP ${r.status}`);
  });
}

// ── Summary ───────────────────────────────────────────────────────────────────
console.log('');
console.log(`─── Smoke Test Results ───────────────────────────────`);
console.log(`  Passed : ${passed}`);
console.log(`  Failed : ${failed}`);
console.log(`  Total  : ${passed + failed}`);
console.log(`─────────────────────────────────────────────────────`);
if (failed > 0) process.exit(1);
