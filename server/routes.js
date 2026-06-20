import express from 'express';
import db from './db.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// ===== SETTINGS =====
router.get('/settings/:key', (req, res) => {
  const { key } = req.params;
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  if (row) {
    res.json({ value: row.value });
  } else {
    res.json({ value: null });
  }
});

router.post('/settings', (req, res) => {
  const { key, value } = req.body;
  db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, value);
  res.json({ success: true });
});

router.get('/settings', (req, res) => {
  const rows = db.prepare('SELECT * FROM settings').all();
  const settings = {};
  rows.forEach(row => { settings[row.key] = row.value; });
  res.json(settings);
});

// ===== USERS =====
router.get('/users', (req, res) => {
  const users = db.prepare(`
    SELECT u.id, u.username, u.email, u.role, u.tmdb_api_key, u.created_at,
           up.genres, up.languages, up.moods, up.priority_language
    FROM users u
    LEFT JOIN user_preferences up ON u.id = up.user_id
  `).all();
  
  res.json(users.map(u => ({
    id: u.id,
    username: u.username,
    email: u.email,
    role: u.role,
    tmdbApiKey: u.tmdb_api_key,
    created_at: u.created_at,
    preferences: {
      genres: JSON.parse(u.genres || '[]'),
      languages: JSON.parse(u.languages || '[]'),
      moods: JSON.parse(u.moods || '[]'),
      priorityLanguage: u.priority_language
    }
  })));
});

router.post('/users/register', (req, res) => {
  const { username, email, password, role = 'USER' } = req.body;
  
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) {
    return res.status(400).json({ error: 'Email already registered' });
  }
  
  const id = uuidv4().substring(0, 9);
  db.prepare('INSERT INTO users (id, username, email, password, role) VALUES (?, ?, ?, ?, ?)')
    .run(id, username, email, password, role);
  
  db.prepare('INSERT INTO user_preferences (user_id, genres, languages, moods, priority_language) VALUES (?, ?, ?, ?, ?)')
    .run(id, '[]', '["en","kn"]', '[]', null);
  
  res.json({
    id,
    username,
    email,
    role,
    preferences: { genres: [], languages: ['en', 'kn'], moods: [], priorityLanguage: null }
  });
});

router.post('/users/authenticate', (req, res) => {
  const { email, password } = req.body;
  
  const user = db.prepare(`
    SELECT u.id, u.username, u.email, u.role, u.tmdb_api_key, u.created_at,
           up.genres, up.languages, up.moods, up.priority_language
    FROM users u
    LEFT JOIN user_preferences up ON u.id = up.user_id
    WHERE (u.email = ? OR u.username = ?) AND u.password = ?
  `).get(email, email, password);
  
  if (user) {
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
});

router.put('/users/:id/preferences', (req, res) => {
  const { id } = req.params;
  const { genres, languages, moods, priorityLanguage } = req.body;
  
  db.prepare(`
    UPDATE user_preferences 
    SET genres = ?, languages = ?, moods = ?, priority_language = ?
    WHERE user_id = ?
  `).run(
    JSON.stringify(genres),
    JSON.stringify(languages),
    JSON.stringify(moods),
    priorityLanguage,
    id
  );
  
  res.json({ success: true });
});

router.put('/users/:id/tmdb-key', (req, res) => {
  const { id } = req.params;
  const { key } = req.body;
  
  db.prepare('UPDATE users SET tmdb_api_key = ? WHERE id = ?').run(key, id);
  res.json({ success: true });
});

// ===== WATCH HISTORY =====
router.get('/history/:userId', (req, res) => {
  const { userId } = req.params;
  const rows = db.prepare('SELECT movie_id FROM watch_history WHERE user_id = ? ORDER BY created_at DESC')
    .all(userId);
  res.json(rows.map(r => r.movie_id));
});

router.post('/history', (req, res) => {
  const { userId, movieId } = req.body;
  
  try {
    db.prepare('INSERT OR IGNORE INTO watch_history (user_id, movie_id) VALUES (?, ?)')
      .run(userId, movieId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/history/:userId/:movieId', (req, res) => {
  const { userId, movieId } = req.params;
  db.prepare('DELETE FROM watch_history WHERE user_id = ? AND movie_id = ?')
    .run(userId, parseInt(movieId));
  res.json({ success: true });
});

router.get('/history/:userId/exists/:movieId', (req, res) => {
  const { userId, movieId } = req.params;
  const row = db.prepare('SELECT 1 FROM watch_history WHERE user_id = ? AND movie_id = ?')
    .get(userId, parseInt(movieId));
  res.json({ exists: !!row });
});

// ===== RATINGS =====
router.get('/ratings/:userId/:movieId', (req, res) => {
  const { userId, movieId } = req.params;
  const row = db.prepare('SELECT rating FROM ratings WHERE user_id = ? AND movie_id = ?')
    .get(userId, parseInt(movieId));
  res.json({ rating: row ? row.rating : null });
});

router.post('/ratings', (req, res) => {
  const { userId, movieId, rating } = req.body;
  
  db.prepare(`
    INSERT INTO ratings (user_id, movie_id, rating) VALUES (?, ?, ?)
    ON CONFLICT(user_id, movie_id) DO UPDATE SET rating = ?, created_at = CURRENT_TIMESTAMP
  `).run(userId, parseInt(movieId), rating, rating);
  
  res.json({ success: true });
});

router.get('/ratings/:userId', (req, res) => {
  const { userId } = req.params;
  const rows = db.prepare('SELECT movie_id, rating FROM ratings WHERE user_id = ?')
    .all(userId);
  const ratings = {};
  rows.forEach(r => { ratings[r.movie_id] = r.rating; });
  res.json(ratings);
});

// ===== CHATBOT FEEDBACK =====
router.post('/feedback/chatbot', (req, res) => {
  const { id, rating, emoji, messageId, userId } = req.body;
  
  db.prepare(`
    INSERT INTO chatbot_feedback (id, rating, emoji, message_id, user_id) 
    VALUES (?, ?, ?, ?, ?)
  `).run(id || uuidv4(), rating, emoji, messageId, userId || null);
  
  res.json({ success: true });
});

router.get('/feedback/chatbot', (req, res) => {
  const feedback = db.prepare('SELECT * FROM chatbot_feedback ORDER BY created_at DESC').all();
  res.json(feedback);
});

router.get('/feedback/chatbot/stats', (req, res) => {
  const stats = db.prepare(`
    SELECT COUNT(*) as total, COALESCE(AVG(rating), 0) as average
    FROM chatbot_feedback
  `).get();
  res.json({ total: stats.total, average: stats.average });
});

// ===== SITE FEEDBACK =====
router.post('/feedback/site', (req, res) => {
  const { id, name, message, rating, userId } = req.body;
  
  db.prepare(`
    INSERT INTO site_feedback (id, name, message, rating, user_id) 
    VALUES (?, ?, ?, ?, ?)
  `).run(id || uuidv4(), name, message, rating || null, userId || null);
  
  res.json({ success: true });
});

router.get('/feedback/site', (req, res) => {
  const feedback = db.prepare('SELECT * FROM site_feedback ORDER BY created_at DESC').all();
  res.json(feedback);
});

router.delete('/feedback/site/:id', (req, res) => {
  const { id } = req.params;
  db.prepare('DELETE FROM site_feedback WHERE id = ?').run(id);
  res.json({ success: true });
});

// ===== MOVIES =====
router.get('/movies', (req, res) => {
  const movies = db.prepare('SELECT * FROM movies ORDER BY created_at DESC').all();
  res.json(movies.map(m => ({
    ...m,
    genre_ids: JSON.parse(m.genre_ids || '[]')
  })));
});

router.post('/movies', (req, res) => {
  const { id, title, original_title, overview, poster_path, backdrop_path, 
          release_date, vote_average, genre_ids, popularity, original_language } = req.body;
  
  db.prepare(`
    INSERT OR REPLACE INTO movies 
    (id, title, original_title, overview, poster_path, backdrop_path, 
     release_date, vote_average, genre_ids, popularity, original_language)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, title, original_title, overview, poster_path, backdrop_path,
    release_date, vote_average, JSON.stringify(genre_ids || []), popularity, original_language
  );
  
  res.json({ success: true });
});

// ===== SHORT FILMS =====
router.get('/short-films', (req, res) => {
  const films = db.prepare('SELECT * FROM short_films ORDER BY created_at DESC').all();
  res.json(films);
});

router.post('/short-films', (req, res) => {
  const { id, title, description, video_url, thumbnail_path, duration } = req.body;
  
  db.prepare(`
    INSERT OR REPLACE INTO short_films 
    (id, title, description, video_url, thumbnail_path, duration)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, title, description, video_url, thumbnail_path, duration);
  
  res.json({ success: true });
});

// ===== ANALYTICS =====
router.get('/analytics/visits', (req, res) => {
  const { year = new Date().getFullYear() } = req.query;
  
  // Get guest vs registered user visits by month
  const monthlyVisits = db.prepare(`
    SELECT 
      visit_month as month,
      user_type,
      COUNT(*) as count
    FROM user_visits
    WHERE visit_year = ?
    GROUP BY visit_month, user_type
    ORDER BY visit_month
  `).all(year);

  // Get total user type breakdown
  const userTypeStats = db.prepare(`
    SELECT 
      user_type,
      COUNT(*) as count,
      COUNT(DISTINCT user_id) as unique_users
    FROM user_visits
    WHERE visit_year = ?
    GROUP BY user_type
  `).all(year);

  // Get yearly comparison
  const yearlyStats = db.prepare(`
    SELECT 
      visit_year as year,
      user_type,
      COUNT(*) as count
    FROM user_visits
    GROUP BY visit_year, user_type
    ORDER BY visit_year
  `).all();

  res.json({
    monthly: monthlyVisits,
    userTypeStats,
    yearly: yearlyStats
  });
});

router.get('/analytics/genres', (req, res) => {
  const { year = new Date().getFullYear() } = req.query;
  
  // Get genre popularity by month
  const monthlyGenreStats = db.prepare(`
    SELECT 
      visit_month as month,
      genre_name,
      SUM(interaction_weight) as score,
      COUNT(*) as interactions
    FROM genre_analytics
    WHERE visit_year = ?
    GROUP BY visit_month, genre_name
    ORDER BY visit_month, score DESC
  `).all(year);

  // Get overall genre popularity
  const overallGenreStats = db.prepare(`
    SELECT 
      genre_name,
      SUM(interaction_weight) as total_score,
      COUNT(*) as total_interactions,
      COUNT(DISTINCT user_id) as unique_users
    FROM genre_analytics
    WHERE visit_year = ?
    GROUP BY genre_name
    ORDER BY total_score DESC
  `).all(year);

  // Get genre by user type
  const genreByUserType = db.prepare(`
    SELECT 
      CASE WHEN user_id IS NULL THEN 'guest' ELSE 'registered' END as user_type,
      genre_name,
      SUM(interaction_weight) as score
    FROM genre_analytics
    WHERE visit_year = ?
    GROUP BY user_type, genre_name
    ORDER BY user_type, score DESC
  `).all(year);

  res.json({
    monthly: monthlyGenreStats,
    overall: overallGenreStats,
    byUserType: genreByUserType
  });
});

// Track a new visit (optional endpoint for real-time tracking)
router.post('/analytics/visit', (req, res) => {
  const { userId, userType, sessionId, pageViewed } = req.body;
  const now = new Date();
  
  db.prepare(`
    INSERT INTO user_visits (user_id, user_type, visit_date, visit_month, visit_year, session_id, page_viewed)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    userId || null,
    userType || 'guest',
    now.toISOString().split('T')[0],
    now.getMonth() + 1,
    now.getFullYear(),
    sessionId || `sess_${Date.now()}`,
    pageViewed || 'home'
  );
  
  res.json({ success: true });
});

export default router;
