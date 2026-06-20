import express from 'express';
import cors from 'cors';
import initSqlJs from 'sql.js';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const dbPath = join(__dirname, 'cinema.db');

const app = express();
const PORT = 3002;

let db = null;

async function initDb() {
  console.log('Initializing SQLite database...');
  const SQL = await initSqlJs();
  
  if (existsSync(dbPath)) {
    try {
      const fileBuffer = readFileSync(dbPath);
      db = new SQL.Database(fileBuffer);
      console.log('Loaded existing database');
    } catch (e) {
      console.log('Creating new database (file corrupted or empty)');
      db = new SQL.Database();
    }
  } else {
    db = new SQL.Database();
    console.log('Created new database');
  }

  // Create tables
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'USER',
    tmdb_api_key TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS user_preferences (
    user_id TEXT PRIMARY KEY,
    genres TEXT DEFAULT '[]',
    languages TEXT DEFAULT '[]',
    moods TEXT DEFAULT '[]',
    priority_language TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS watch_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    movie_id INTEGER NOT NULL,
    UNIQUE(user_id, movie_id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS ratings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    movie_id INTEGER NOT NULL,
    rating INTEGER NOT NULL,
    UNIQUE(user_id, movie_id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS chatbot_feedback (
    id TEXT PRIMARY KEY,
    rating INTEGER NOT NULL,
    emoji TEXT NOT NULL,
    message_id TEXT NOT NULL,
    user_id TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS site_feedback (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    message TEXT NOT NULL,
    rating INTEGER,
    user_id TEXT
  )`);

  // Insert default settings
  const settings = [
    ['tmdb_api_key', process.env.TMDB_API_KEY || process.env.VITE_TMDB_API_KEY || ''],
    ['omdb_api_key', ''],
    ['chatbot_feedback_enabled', 'true'],
    ['hp_feedback_enabled', 'true']
  ];
  
  for (const [key, value] of settings) {
    try {
      db.run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [key, value]);
    } catch (e) {}
  }

  // Insert default users
  try {
    const adminExists = db.exec('SELECT id FROM users WHERE email = "chalachitra@gmail.com"');
    if (!adminExists.length || !adminExists[0].values.length) {
      db.run(`INSERT INTO users (id, username, email, password, role) VALUES ('1', 'chalachitra@gmail.com', 'chalachitra@gmail.com', 'Admin@1234', 'ADMIN')`);
      db.run(`INSERT INTO user_preferences (user_id, genres, languages, moods, priority_language) VALUES ('1', '[]', '[]', '[]', NULL)`);
      console.log('Created admin user');
    } else {
      db.run(`UPDATE users SET username = 'chalachitra@gmail.com', email = 'chalachitra@gmail.com', password = 'Admin@1234', role = 'ADMIN' WHERE id = '1'`);
    }
    
    const userExists = db.exec('SELECT id FROM users WHERE email = "user@cinema.com"');
    if (!userExists.length || !userExists[0].values.length) {
      db.run(`INSERT INTO users (id, username, email, password, role) VALUES ('2', 'user', 'user@cinema.com', 'user123', 'USER')`);
      db.run(`INSERT INTO user_preferences (user_id, genres, languages, moods, priority_language) VALUES ('2', '[]', '["en","kn"]', '[]', NULL)`);
      console.log('Created regular user');
    }
  } catch (e) {
    console.log('Error creating users:', e.message);
  }

  saveDb();
  console.log('Database initialized at:', dbPath);
}

function saveDb() {
  if (db) {
    try {
      const data = db.export();
      const buffer = Buffer.from(data);
      writeFileSync(dbPath, buffer);
    } catch (e) {
      console.log('Error saving database:', e.message);
    }
  }
}

app.use(cors());
app.use(express.json());

// Login endpoint
app.post('/api/users/authenticate', (req, res) => {
  console.log('Login attempt:', req.body);
  const { email, password } = req.body;
  
  if (!db) {
    return res.status(500).json({ error: 'Database not initialized' });
  }
  
  try {
    const result = db.exec(`SELECT u.id, u.username, u.email, u.role, u.tmdb_api_key,
      up.genres, up.languages, up.moods, up.priority_language
      FROM users u
      LEFT JOIN user_preferences up ON u.id = up.user_id
      WHERE (u.email = '${email}' OR u.username = '${email}') AND u.password = '${password}'`);
    
    console.log('Query result:', result);
    
    if (result.length > 0 && result[0].values.length > 0) {
      const row = result[0].values[0];
      const columns = result[0].columns;
      const user = {};
      columns.forEach((col, i) => { user[col] = row[i]; });
      
      res.json({
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        tmdbApiKey: user.tmdb_api_key,
        preferences: {
          genres: JSON.parse(user.genres || '[]'),
          languages: JSON.parse(user.languages || '[]'),
          moods: JSON.parse(user.moods || '[]'),
          priorityLanguage: user.priority_language
        }
      });
    } else {
      res.status(401).json({ error: 'Invalid credentials' });
    }
  } catch (e) {
    console.error('Login error:', e);
    res.status(500).json({ error: e.message });
  }
});

// Get setting
app.get('/api/settings/:key', (req, res) => {
  if (!db) return res.json({ value: null });
  const result = db.exec(`SELECT value FROM settings WHERE key = '${req.params.key}'`);
  res.json({ value: result.length > 0 && result[0].values.length > 0 ? result[0].values[0][0] : null });
});

// Get all settings
app.get('/api/settings', (req, res) => {
  if (!db) return res.json({});
  const result = db.exec('SELECT * FROM settings');
  const settings = {};
  if (result.length > 0) {
    result[0].values.forEach(row => { settings[row[0]] = row[1]; });
  }
  res.json(settings);
});

// Update setting
app.post('/api/settings', (req, res) => {
  const { key, value } = req.body;
  if (db) {
    db.run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [key, value]);
    saveDb();
  }
  res.json({ success: true });
});

// Get all users (admin only)
app.get('/api/users', (req, res) => {
  if (!db) return res.json([]);
  const result = db.exec('SELECT id, username, email, role FROM users');
  res.json(result.length > 0 ? result[0].values.map(row => ({
    id: row[0], username: row[1], email: row[2], role: row[3]
  })) : []);
});

// Register user
app.post('/api/users/register', (req, res) => {
  const { username, email, password, role = 'USER' } = req.body;
  
  if (!db) return res.status(500).json({ error: 'Database not ready' });
  
  const exists = db.exec(`SELECT id FROM users WHERE email = '${email}'`);
  if (exists.length > 0 && exists[0].values.length > 0) {
    return res.status(400).json({ error: 'Email already registered' });
  }
  
  const id = Math.random().toString(36).substring(2, 11);
  db.run(`INSERT INTO users (id, username, email, password, role) VALUES (?, ?, ?, ?, ?)`,
    [id, username, email, password, role]);
  db.run(`INSERT INTO user_preferences (user_id, genres, languages, moods, priority_language) VALUES (?, '[]', '["en","kn"]', '[]', NULL)`, [id]);
  saveDb();
  
  res.json({ id, username, email, role, preferences: { genres: [], languages: ['en', 'kn'], moods: [], priorityLanguage: null } });
});

// History endpoints
app.get('/api/history/:userId', (req, res) => {
  if (!db) return res.json([]);
  const result = db.exec(`SELECT movie_id FROM watch_history WHERE user_id = '${req.params.userId}' ORDER BY id DESC`);
  res.json(result.length > 0 ? result[0].values.map(r => r[0]) : []);
});

app.post('/api/history', (req, res) => {
  const { userId, movieId } = req.body;
  if (db) {
    try {
      db.run(`INSERT OR IGNORE INTO watch_history (user_id, movie_id) VALUES (?, ?)`, [userId, movieId]);
      saveDb();
    } catch (e) {}
  }
  res.json({ success: true });
});

app.delete('/api/history/:userId/:movieId', (req, res) => {
  if (db) {
    db.run(`DELETE FROM watch_history WHERE user_id = '${req.params.userId}' AND movie_id = ${req.params.movieId}`);
    saveDb();
  }
  res.json({ success: true });
});

app.get('/api/history/:userId/exists/:movieId', (req, res) => {
  if (!db) return res.json({ exists: false });
  const result = db.exec(`SELECT 1 FROM watch_history WHERE user_id = '${req.params.userId}' AND movie_id = ${req.params.movieId}`);
  res.json({ exists: result.length > 0 && result[0].values.length > 0 });
});

// Ratings endpoints
app.get('/api/ratings/:userId/:movieId', (req, res) => {
  if (!db) return res.json({ rating: null });
  const result = db.exec(`SELECT rating FROM ratings WHERE user_id = '${req.params.userId}' AND movie_id = ${req.params.movieId}`);
  res.json({ rating: result.length > 0 && result[0].values.length > 0 ? result[0].values[0][0] : null });
});

app.post('/api/ratings', (req, res) => {
  const { userId, movieId, rating } = req.body;
  if (db) {
    db.run(`INSERT OR REPLACE INTO ratings (user_id, movie_id, rating) VALUES (?, ?, ?)`, [userId, movieId, rating]);
    saveDb();
  }
  res.json({ success: true });
});

app.get('/api/ratings/:userId', (req, res) => {
  if (!db) return res.json({});
  const result = db.exec(`SELECT movie_id, rating FROM ratings WHERE user_id = '${req.params.userId}'`);
  const ratings = {};
  if (result.length > 0) {
    result[0].values.forEach(r => { ratings[r[0]] = r[1]; });
  }
  res.json(ratings);
});

// Feedback endpoints
app.post('/api/feedback/chatbot', (req, res) => {
  const { id, rating, emoji, messageId, userId } = req.body;
  if (db) {
    db.run(`INSERT INTO chatbot_feedback (id, rating, emoji, message_id, user_id) VALUES (?, ?, ?, ?, ?)`,
      [id || Date.now().toString(), rating, emoji, messageId, userId || null]);
    saveDb();
  }
  res.json({ success: true });
});

app.get('/api/feedback/chatbot', (req, res) => {
  if (!db) return res.json([]);
  const result = db.exec('SELECT * FROM chatbot_feedback ORDER BY id DESC');
  res.json(result.length > 0 ? result[0].values.map(row => {
    const cols = result[0].columns;
    const obj = {};
    cols.forEach((c, i) => { obj[c] = row[i]; });
    return obj;
  }) : []);
});

app.get('/api/feedback/chatbot/stats', (req, res) => {
  if (!db) return res.json({ total: 0, average: 0 });
  const result = db.exec('SELECT COUNT(*) as total, COALESCE(AVG(rating), 0) as average FROM chatbot_feedback');
  res.json(result.length > 0 && result[0].values.length > 0 ? {
    total: result[0].values[0][0],
    average: result[0].values[0][1]
  } : { total: 0, average: 0 });
});

app.post('/api/feedback/site', (req, res) => {
  const { id, name, message, rating, userId } = req.body;
  if (db) {
    db.run(`INSERT INTO site_feedback (id, name, message, rating, user_id) VALUES (?, ?, ?, ?, ?)`,
      [id || Date.now().toString(), name, message, rating || null, userId || null]);
    saveDb();
  }
  res.json({ success: true });
});

app.get('/api/feedback/site', (req, res) => {
  if (!db) return res.json([]);
  const result = db.exec('SELECT * FROM site_feedback ORDER BY id DESC');
  res.json(result.length > 0 ? result[0].values.map(row => {
    const cols = result[0].columns;
    const obj = {};
    cols.forEach((c, i) => { obj[c] = row[i]; });
    return obj;
  }) : []);
});

app.delete('/api/feedback/site/:id', (req, res) => {
  if (db) {
    db.run(`DELETE FROM site_feedback WHERE id = '${req.params.id}'`);
    saveDb();
  }
  res.json({ success: true });
});

// Movies endpoints
app.get('/api/movies', (req, res) => res.json([]));
app.post('/api/movies', (req, res) => res.json({ success: true }));
app.get('/api/short-films', (req, res) => res.json([]));
app.post('/api/short-films', (req, res) => res.json({ success: true }));

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Root route
app.get('/', (req, res) => res.send('ChalaChitra API is running.'));

// Start server
initDb().then(() => {
  app.listen(PORT, () => {
    console.log(`✅ Backend running on http://localhost:${PORT}`);
    console.log(`📊 API: http://localhost:${PORT}/api`);
    console.log(`🔑 Test login: chalachitra@gmail.com / Admin@1234`);
  });
}).catch(err => {
  console.error('Failed to initialize:', err);
});
