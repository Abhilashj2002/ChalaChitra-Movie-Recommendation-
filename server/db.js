import initSqlJs from 'sql.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, writeFileSync, existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const dbPath = join(__dirname, 'cinema.db');

let db = null;

export async function initDatabase() {
  const SQL = await initSqlJs();
  
  // Load existing database or create new one
  if (existsSync(dbPath)) {
    const fileBuffer = readFileSync(dbPath);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  // Create tables
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'USER',
      tmdb_api_key TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS user_preferences (
      user_id TEXT PRIMARY KEY,
      genres TEXT DEFAULT '[]',
      languages TEXT DEFAULT '[]',
      moods TEXT DEFAULT '[]',
      priority_language TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS watch_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      movie_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, movie_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS ratings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      movie_id INTEGER NOT NULL,
      rating INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, movie_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS chatbot_feedback (
      id TEXT PRIMARY KEY,
      rating INTEGER NOT NULL,
      emoji TEXT NOT NULL,
      message_id TEXT NOT NULL,
      user_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS site_feedback (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      message TEXT NOT NULL,
      rating INTEGER,
      user_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS movies (
      id INTEGER PRIMARY KEY,
      title TEXT NOT NULL,
      original_title TEXT,
      overview TEXT,
      poster_path TEXT,
      backdrop_path TEXT,
      release_date TEXT,
      vote_average REAL,
      genre_ids TEXT,
      popularity REAL,
      original_language TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS short_films (
      id INTEGER PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      video_url TEXT,
      thumbnail_path TEXT,
      duration INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS user_visits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT,
      user_type TEXT NOT NULL DEFAULT 'guest',
      visit_date DATE DEFAULT CURRENT_DATE,
      visit_month INTEGER DEFAULT (strftime('%m', CURRENT_DATE)),
      visit_year INTEGER DEFAULT (strftime('%Y', CURRENT_DATE)),
      session_id TEXT,
      page_viewed TEXT DEFAULT 'home',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS genre_analytics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT,
      genre_id INTEGER NOT NULL,
      genre_name TEXT NOT NULL,
      interaction_type TEXT DEFAULT 'view',
      interaction_weight INTEGER DEFAULT 1,
      visit_date DATE DEFAULT CURRENT_DATE,
      visit_month INTEGER DEFAULT (strftime('%m', CURRENT_DATE)),
      visit_year INTEGER DEFAULT (strftime('%Y', CURRENT_DATE)),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS idx_watch_history_user ON watch_history(user_id);
    CREATE INDEX IF NOT EXISTS idx_ratings_user ON ratings(user_id);
    CREATE INDEX IF NOT EXISTS idx_ratings_movie ON ratings(movie_id);
    CREATE INDEX IF NOT EXISTS idx_user_visits_date ON user_visits(visit_date);
    CREATE INDEX IF NOT EXISTS idx_user_visits_month ON user_visits(visit_month, visit_year);
    CREATE INDEX IF NOT EXISTS idx_user_visits_type ON user_visits(user_type);
    CREATE INDEX IF NOT EXISTS idx_genre_analytics_month ON genre_analytics(visit_month, visit_year);
    CREATE INDEX IF NOT EXISTS idx_genre_analytics_genre ON genre_analytics(genre_id);
  `);

  // Insert default settings
  const defaultSettings = [
    ['tmdb_api_key', ''],
    ['omdb_api_key', ''],
    ['chatbot_feedback_enabled', 'true'],
    ['hp_feedback_enabled', 'true'],
    ['hp_hero_slider_enabled', 'true'],
    ['hp_filters_enabled', 'true'],
    ['chatbot_enabled', 'true']
  ];

  for (const [key, value] of defaultSettings) {
    db.run('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)', [key, value]);
  }

  // Insert default users
  const existingAdmin = db.exec('SELECT id FROM users WHERE email = ?', ['chalachitra@gmail.com']);
  if (!existingAdmin[0]?.values.length) {
    db.run('INSERT INTO users (id, username, email, password, role) VALUES (?, ?, ?, ?, ?)',
      ['1', 'chalachitra@gmail.com', 'chalachitra@gmail.com', 'Admin@1234', 'ADMIN']);
    db.run('INSERT OR IGNORE INTO user_preferences (user_id, genres, languages, moods, priority_language) VALUES (?, ?, ?, ?, ?)',
      ['1', '[]', '[]', '[]', null]);
  } else {
    db.run('UPDATE users SET username = ?, email = ?, password = ?, role = ? WHERE id = ?',
      ['chalachitra@gmail.com', 'chalachitra@gmail.com', 'Admin@1234', 'ADMIN', '1']);
  }

  const existingUser = db.exec('SELECT id FROM users WHERE email = ?', ['user@cinema.com']);
  if (!existingUser[0]?.values.length) {
    db.run('INSERT INTO users (id, username, email, password, role) VALUES (?, ?, ?, ?, ?)',
      ['2', 'user', 'user@cinema.com', 'user123', 'USER']);
    db.run('INSERT OR IGNORE INTO user_preferences (user_id, genres, languages, moods, priority_language) VALUES (?, ?, ?, ?, ?)',
      ['2', '[]', '["en","kn"]', '[]', null]);
  }

  // Generate sample data if not enough users exist
  const userCount = db.exec('SELECT COUNT(*) as count FROM users');
  const currentCount = userCount[0]?.values[0]?.[0] || 0;
  
  if (currentCount < 10) {
    generateSampleData(db);
  }

  // Save database
  saveDatabase();
  
  console.log('✓ SQLite database initialized at:', dbPath);
  return db;
}

// Generate sample data with 150 users, visits, and genre analytics
function generateSampleData(db) {
  const firstNames = ['Aarav', 'Vivaan', 'Aditya', 'Vihaan', 'Arjun', 'Sai', 'Arnav', 'Ayaan', 'Krishna', 'Ishaan',
    'Aadhya', 'Ananya', 'Diya', 'Saanvi', 'Aaradhya', 'Navya', 'Anvi', 'Pari', 'Kavya', 'Sara',
    'Rahul', 'Priya', 'Amit', 'Sneha', 'Vikram', 'Neha', 'Rajesh', 'Pooja', 'Suresh', 'Anita',
    'Rohit', 'Kiran', 'Manoj', 'Deepa', 'Sanjay', 'Lakshmi', 'Ganesh', 'Padma', 'Venkatesh', 'Usha',
    'Karthik', 'Meera', 'Naveen', 'Divya', 'Prakash', 'Sunita', 'Ramesh', 'Shilpa', 'Mahesh', 'Geeta',
    'Hari', 'Radha', 'Shiva', 'Lalita', 'Murugan', 'Kamala', 'Gopal', 'Indira', 'Narayan', 'Saraswati',
    'Ravi', 'Anjali', 'Mohan', 'Bhavna', 'Kishore', 'Chitra', 'Subramanian', 'Malini', 'Govind', 'Shanti',
    'Pradeep', 'Nalini', 'Ashok', 'Revathi', 'Jagadish', 'Vasantha', 'Nandan', 'Hemalatha', 'Bala', 'Kausalya',
    'Srinivas', 'Vanitha', 'Murali', 'Jayanthi', 'Thirumalai', 'Lakshmi', 'Velu', 'Ponnammal', 'Kandhasamy', 'Seetha',
    'Muthu', 'Karthiga', 'Palani', 'Gowri', 'Andiappan', 'Maragatham', 'Perumal', 'Rukmini', 'Sudhakar', 'Vijaya',
    'Rathnam', 'Nagalakshmi', 'Chandran', 'Banumathi', 'Gurusamy', 'Thayamma', 'Thangavelu', 'Pechiammal', 'Swaminathan', 'Kannamma'];

  const lastNames = ['Sharma', 'Kumar', 'Singh', 'Patel', 'Gupta', 'Reddy', 'Naidu', 'Rao', 'Iyer', 'Naik',
    'Desai', 'Joshi', 'Bhat', 'Rao', 'Pai', 'Hegde', 'Kulkarni', 'Gowda', 'Sharma', 'Verma',
    'Pillai', 'Menon', 'Nair', 'Kutty', 'Swamy', 'Raju', 'Babu', 'Anna', 'Ayya', 'Amma'];

  const genres = [
    { id: 28, name: 'Action' },
    { id: 12, name: 'Adventure' },
    { id: 16, name: 'Animation' },
    { id: 35, name: 'Comedy' },
    { id: 80, name: 'Crime' },
    { id: 99, name: 'Documentary' },
    { id: 18, name: 'Drama' },
    { id: 10751, name: 'Family' },
    { id: 14, name: 'Fantasy' },
    { id: 36, name: 'History' },
    { id: 27, name: 'Horror' },
    { id: 10402, name: 'Music' },
    { id: 9648, name: 'Mystery' },
    { id: 10749, name: 'Romance' },
    { id: 878, name: 'Science Fiction' }
  ];

  const months = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  const years = [2023, 2024, 2025, 2026];
  const pages = ['home', 'search', 'movie', 'discover', 'mood'];

  console.log('Generating 150 sample users with visit and genre data...');

  // Generate 150 users
  for (let i = 3; i <= 152; i++) {
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    const username = `${firstName.toLowerCase()}${lastName.toLowerCase()}${i}`;
    const email = `${username}@example.com`;
    const password = 'password123';
    const role = 'USER';

    try {
      db.run('INSERT OR IGNORE INTO users (id, username, email, password, role, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        [i.toString(), username, email, password, role, generateRandomDate(2023, 2024)]);
      
      // Add user preferences
      const preferredGenres = JSON.stringify(getRandomGenres(genres, 3));
      const preferredLanguages = JSON.stringify(getRandomLanguages(2));
      db.run('INSERT OR IGNORE INTO user_preferences (user_id, genres, languages, moods, priority_language) VALUES (?, ?, ?, ?, ?)',
        [i.toString(), preferredGenres, preferredLanguages, '[]', 'en']);
    } catch (e) {
      console.log(`Skipping user ${i}, may already exist`);
    }
  }

  // Generate visit data for the last 12 months
  const visitCount = 2500; // Total visits
  for (let i = 0; i < visitCount; i++) {
    const userId = Math.random() > 0.4 ? Math.floor(Math.random() * 150 + 3).toString() : null; // 60% registered users, 40% guests
    const userType = userId ? 'registered' : 'guest';
    const year = years[Math.floor(Math.random() * years.length)];
    const month = months[Math.floor(Math.random() * months.length)];
    const day = Math.floor(Math.random() * 28) + 1;
    const date = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    const page = pages[Math.floor(Math.random() * pages.length)];
    const sessionId = `sess_${Math.random().toString(36).substring(2, 15)}`;

    try {
      db.run(`INSERT INTO user_visits (user_id, user_type, visit_date, visit_month, visit_year, session_id, page_viewed) 
              VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [userId, userType, date, month, year, sessionId, page]);
    } catch (e) {
      // Ignore duplicates
    }
  }

  // Generate genre analytics data
  const genreInteractionCount = 3500;
  for (let i = 0; i < genreInteractionCount; i++) {
    const userId = Math.random() > 0.4 ? Math.floor(Math.random() * 150 + 3).toString() : null;
    const genre = genres[Math.floor(Math.random() * genres.length)];
    const interactionTypes = ['view', 'click', 'watch', 'favorite'];
    const interactionType = interactionTypes[Math.floor(Math.random() * interactionTypes.length)];
    const weight = { view: 1, click: 2, watch: 3, favorite: 4 }[interactionType];
    const year = years[Math.floor(Math.random() * years.length)];
    const month = months[Math.floor(Math.random() * months.length)];
    const day = Math.floor(Math.random() * 28) + 1;
    const date = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;

    try {
      db.run(`INSERT INTO genre_analytics (user_id, genre_id, genre_name, interaction_type, interaction_weight, visit_date, visit_month, visit_year)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [userId, genre.id, genre.name, interactionType, weight, date, month, year]);
    } catch (e) {
      // Ignore duplicates
    }
  }

  console.log('✓ Sample data generated: 150 users, ~2500 visits, ~3500 genre interactions');
}

function getRandomGenres(genres, count) {
  const shuffled = [...genres].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count).map(g => g.id);
}

function getRandomLanguages(count) {
  const languages = ['en', 'hi', 'ta', 'te', 'kn', 'ml', 'mr', 'bn'];
  const shuffled = [...languages].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

function generateRandomDate(startYear, endYear) {
  const year = Math.floor(Math.random() * (endYear - startYear + 1)) + startYear;
  const month = Math.floor(Math.random() * 12) + 1;
  const day = Math.floor(Math.random() * 28) + 1;
  return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')} ${Math.floor(Math.random() * 24).toString().padStart(2, '0')}:${Math.floor(Math.random() * 60).toString().padStart(2, '0')}:00`;
}

export function saveDatabase() {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    writeFileSync(dbPath, buffer);
  }
}

export function getDatabase() {
  return db;
}
