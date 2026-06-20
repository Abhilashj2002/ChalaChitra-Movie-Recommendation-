const express = require('express');
const cors = require('cors');
const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'cinema.db');
const app = express();
const PORT = 3002;
const DEFAULT_TMDB_API_KEY = process.env.TMDB_API_KEY || process.env.VITE_TMDB_API_KEY || '';
const DEFAULT_OMDB_API_KEY = process.env.OMDB_API_KEY || process.env.VITE_OMDB_API_KEY || '';

let db = null;

async function initDb() {
  console.log('Initializing SQLite database...');
  const SQL = await initSqlJs();
  
  if (fs.existsSync(dbPath)) {
    try {
      const fileBuffer = fs.readFileSync(dbPath);
      db = new SQL.Database(fileBuffer);
      console.log('Loaded existing database');
    } catch (e) {
      console.log('Creating new database');
      db = new SQL.Database();
    }
  } else {
    db = new SQL.Database();
    console.log('Created new database');
  }

  db.run(`CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'USER',
    tmdb_api_key TEXT
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

  // Analytics tables
  db.run(`CREATE TABLE IF NOT EXISTS user_visits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT,
    user_type TEXT NOT NULL DEFAULT 'guest',
    visit_date DATE DEFAULT CURRENT_DATE,
    visit_month INTEGER DEFAULT (strftime('%m', CURRENT_DATE)),
    visit_year INTEGER DEFAULT (strftime('%Y', CURRENT_DATE)),
    session_id TEXT,
    page_viewed TEXT DEFAULT 'home',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS genre_analytics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT,
    genre_id INTEGER NOT NULL,
    genre_name TEXT NOT NULL,
    interaction_type TEXT DEFAULT 'view',
    interaction_weight INTEGER DEFAULT 1,
    visit_date DATE DEFAULT CURRENT_DATE,
    visit_month INTEGER DEFAULT (strftime('%m', CURRENT_DATE)),
    visit_year INTEGER DEFAULT (strftime('%Y', CURRENT_DATE)),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS project_languages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    category TEXT NOT NULL,
    description TEXT,
    color TEXT,
    icon TEXT,
    version TEXT,
    usage_area TEXT
  )`);

  // Seed project programming languages (INSERT OR IGNORE keeps existing custom records)
  const projectLangs = [
    ['TypeScript', 'Frontend', 'Typed superset of JavaScript used for all React components', '#3178c6', 'TS', '5.7', 'UI Components, Types, Services'],
    ['JavaScript', 'Backend',  'Runtime language for the Express API server',              '#f7df1e', 'JS', 'ES2022', 'API Server, Build Scripts'],
    ['React',      'Framework','UI library for building the single-page application',      '#61dafb', 'Re', '19',    'Pages, Components'],
    ['Vite',       'Tooling',  'Fast frontend build tool and dev server',                  '#646cff', 'Vi', '6',     'Build, HMR, Dev Server'],
    ['Express',    'Backend',  'Node.js web framework powering the REST API',              '#68a063', 'Ex', '4',     'REST API, Routing'],
    ['SQLite',     'Database', 'Embedded SQL database via sql.js for persistent storage',  '#003b57', 'DB', 'sql.js 1.12', 'Users, History, Ratings, Settings'],
    ['TailwindCSS','Styling',  'Utility-first CSS framework for UI styling',              '#38bdf8', 'TW', '3.4',   'Styling, Layout'],
    ['HTML',       'Markup',   'Page markup for the application shell',                    '#e34c26', 'HT', '5',     'App Shell, Templates'],
    ['CSS',        'Styling',  'Custom global styles and CSS variables',                   '#264de4', 'CS', '3',     'Animations, Variables'],
    ['Node.js',    'Runtime',  'JavaScript runtime for running the backend server',        '#68a063', 'No', '24',    'Backend Runtime'],
    ['SQL',        'Database', 'Query language used against the SQLite database',          '#f29111', 'SQ', 'SQLite 3', 'Queries, Migrations'],
    ['JSON',       'Data',     'Data exchange format used in API requests/responses',      '#cbcb41', '{}', '-',     'API Payloads, Config']
  ];
  for (const [name, category, description, color, icon, version, usage_area] of projectLangs) {
    db.run('INSERT OR IGNORE INTO project_languages (name, category, description, color, icon, version, usage_area) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [name, category, description, color, icon, version, usage_area]);
  }

  // Default settings
  db.run("INSERT OR IGNORE INTO settings (key, value) VALUES ('tmdb_api_key', ?)", [DEFAULT_TMDB_API_KEY]);
  db.run("INSERT OR IGNORE INTO settings (key, value) VALUES ('omdb_api_key', ?)", [DEFAULT_OMDB_API_KEY]);

  // Default users
  const adminById = db.exec("SELECT id FROM users WHERE id = '1'");
  if (!adminById.length || !adminById[0].values.length) {
    db.run("INSERT INTO users (id, username, email, password, role) VALUES ('1', 'chalachitra@gmail.com', 'chalachitra@gmail.com', 'Admin@1234', 'ADMIN')");
    db.run("INSERT INTO user_preferences (user_id, genres, languages, moods, priority_language) VALUES ('1', '[]', '[]', '[]', NULL)");
    console.log('Created admin user (chalachitra@gmail.com / Admin@1234)');
  } else {
    // Keep seeded admin account in sync for existing databases.
    db.run("UPDATE users SET username = 'chalachitra@gmail.com', email = 'chalachitra@gmail.com', password = 'Admin@1234', role = 'ADMIN' WHERE id = '1'");
  }
  
  const userExists = db.exec("SELECT id FROM users WHERE email = 'user@cinema.com'");
  if (!userExists.length || !userExists[0].values.length) {
    db.run("INSERT INTO users (id, username, email, password, role) VALUES ('2', 'user', 'user@cinema.com', 'user123', 'USER')");
    db.run("INSERT INTO user_preferences (user_id, genres, languages, moods, priority_language) VALUES ('2', '[]', '[\"en\",\"kn\"]', '[]', NULL)");
    console.log('Created user (user@cinema.com / user123)');
  }

  saveDb();
  
  // Generate sample data if not enough users exist
  const userCount = db.exec('SELECT COUNT(*) as count FROM users');
  const currentCount = userCount[0]?.values[0]?.[0] || 0;
  
  const movieCountRes = db.exec("SELECT COUNT(*) FROM settings WHERE key LIKE 'movie_pop_%'");
  const movieCount = movieCountRes[0]?.values[0]?.[0] || 0;
  
  if (currentCount < 150 || movieCount === 0) {
    generateSampleData();
  }
  
  console.log('Database initialized at:', dbPath);
}

// Generate sample data with 150 users, visits, and genre analytics
function generateSampleData() {
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
    'Rathnam', 'Nagalakshmi', 'Chandran', 'Banumathi', 'Gurusamy', 'Thayamma', 'Thangavelu', 'Pechiammal', 'Swaminathan', 'Kannamma',
    'Yuki', 'Sakura', 'Haruto', 'Aoi', 'Min-jun', 'Seo-yeon', 'Ji-hoon', 'Ha-eun', 'Kenji', 'Miko'];

  const lastNames = ['Sharma', 'Kumar', 'Singh', 'Patel', 'Gupta', 'Reddy', 'Naidu', 'Rao', 'Iyer', 'Naik',
    'Desai', 'Joshi', 'Bhat', 'Rao', 'Pai', 'Hegde', 'Kulkarni', 'Gowda', 'Sharma', 'Verma',
    'Pillai', 'Menon', 'Nair', 'Kutty', 'Swamy', 'Raju', 'Babu', 'Anna', 'Ayya', 'Amma',
    'Sato', 'Tanaka', 'Kim', 'Lee', 'Suzuki', 'Takahashi'];

  const movieTitles = [
    'The Dark Knight', 'Inception', 'Interstellar', 'The Matrix', 'Pulp Fiction', 'The Shawshank Redemption',
    'The Godfather', 'Gladiator', 'The Prestige', 'Memento', 'The Departed', 'Fight Club', 'Seven', 'The Silence of the Lambs',
    'The Green Mile', 'Leon: The Professional', 'Saving Private Ryan', 'Schindler\'s List', 'Forrest Gump', 'Braveheart',
    'Jurassic Park', 'The Lion King', 'Toy Story', 'Finding Nemo', 'Up', 'The Incredibles', 'Ratatouille', 'WALL-E',
    'Spirited Away', 'Princess Mononoke', 'Your Name', 'Weathering With You', 'Parasite', 'Oldboy', 'The Handmaiden',
    'Train to Busan', 'A Bittersweet Life', 'The Man from Nowhere', 'I Saw the Devil', 'Memories of Murder', 'The Host',
    'RRR', 'Bahubali: The Beginning', 'Bahubali: The Conclusion', 'K.G.F: Chapter 1', 'K.G.F: Chapter 2', 'Pushpa: The Rise',
    'Vikram', 'Leo', 'Jailer', 'Master', 'Thalapathy 68', 'Sarkar', 'Bigil', 'Mersal', 'Theri', 'Kaththi', 'Thuppakki',
    'Lagaan', 'Dangal', '3 Idiots', 'Taare Zameen Par', 'PK', 'Bajrangi Bhaijaan', 'Dilwale Dulhania Le Jayenge',
    'Kuch Kuch Hota Hai', 'My Name Is Khan', 'Sholay', 'Deewaar', 'Don', 'Agneepath', 'Zindagi Na Milegi Dobara',
    'Drishyam', 'Lucifer', 'Pulimurugan', 'Bheeshma Parvam', 'Kayamkulam Kochunni', 'Premam', 'Bangalore Days',
    'Ustad Hotel', 'Kumbalangi Nights', 'Minnal Murali', 'Kantara', '777 Charlie', 'Kirik Party', 'Ulidavaru Kandanthe',
    'Mungaru Male', 'Lucia', 'Thithi', 'Rangitaranga', 'Avane Srimannarayana', 'James', 'Yuvarathnaa',
    'Avatar', 'Avengers: Endgame', 'Avengers: Infinity War', 'Spider-Man: No Way Home', 'The Wolf of Wall Street',
    'Django Unchained', 'Inglourious Basterds', 'The Hateful Eight', 'Once Upon a Time in Hollywood', 'Joker',
    'Batman Begins', 'The Dark Knight Rises', 'Tenet', 'Dunkirk', 'Oppenheimer', 'Kill Bill: Vol. 1', 'Kill Bill: Vol. 2',
    ' Reservoir Dogs', 'Django Unchained', 'Goodfellas', 'Casino', 'The Irishman', 'Taxi Driver', 'Raging Bull',
    'Alien', 'Aliens', 'Blade Runner', 'Blade Runner 2049', 'The Martian', 'Arrival', 'Ex Machina', 'Gravity',
    'Black Panther', 'Doctor Strange', 'Guardians of the Galaxy', 'Thor: Ragnarok', 'Iron Man', 'Captain America',
    'Wonder Woman', 'The Batman', 'Man of Steel', 'Zack Snyder\'s Justice League', 'Aquaman', 'Shazam!',
    'Everything Everywhere All At Once', 'Top Gun: Maverick', 'Mission: Impossible', 'John Wick', 'Mad Max: Fury Road',
    'The Revenant', 'The Grand Budapest Hotel', 'Moonlight', 'La La Land', 'Whiplash', 'Birdman', 'Green Book'
  ];

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
      db.run('INSERT OR IGNORE INTO users (id, username, email, password, role) VALUES (?, ?, ?, ?, ?)',
        [i.toString(), username, email, password, role]);
      
      // Add user preferences
      const preferredGenres = JSON.stringify(getRandomGenres(genres, 3));
      const preferredLanguages = JSON.stringify(getRandomLanguages(2));
      db.run('INSERT OR IGNORE INTO user_preferences (user_id, genres, languages, moods, priority_language) VALUES (?, ?, ?, ?, ?)',
        [i.toString(), preferredGenres, preferredLanguages, '[]', 'en']);
    } catch (e) {
      console.log(`Skipping user ${i}, may already exist`);
    }
  }

  // Create mock movies table in analytics if it doesn't exist (conceptually for popularity)
  // We'll just insert visits and searches for these movies
  const movieLanguages = ['en', 'hi', 'kn', 'te', 'ta', 'ml', 'ja', 'ko'];
  
  // Generate visit data for the last 12 months
  const visitCount = 3000;
  for (let i = 0; i < visitCount; i++) {
    const userId = Math.random() > 0.4 ? Math.floor(Math.random() * 150 + 3).toString() : null;
    const userType = userId ? 'registered' : 'guest';
    
    // For guest users, assign a random name for activity logs
    let guestName = null;
    if (!userId) {
      guestName = `${firstNames[Math.floor(Math.random() * firstNames.length)]} (Guest)`;
    }

    const year = years[Math.floor(Math.random() * years.length)];
    const month = months[Math.floor(Math.random() * months.length)];
    const day = Math.floor(Math.random() * 28) + 1;
    const date = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    const page = pages[Math.floor(Math.random() * pages.length)];
    const sessionId = `sess_${Math.random().toString(36).substring(2, 15)}`;

    // Select a random movie for this visit to simulate popularity
    const movieTitle = movieTitles[Math.floor(Math.random() * movieTitles.length)];

    try {
      db.run(`INSERT INTO user_visits (user_id, user_type, visit_date, visit_month, visit_year, session_id, page_viewed) 
              VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [userId, userType, date, month, year, sessionId, page]);
      
      // If it's a movie page, record which movie was viewed
      if (page === 'movie') {
        const weight = Math.floor(Math.random() * 3) + 1;
        const genre = genres[Math.floor(Math.random() * genres.length)];
        db.run(`INSERT INTO genre_analytics (user_id, genre_id, genre_name, interaction_type, interaction_weight, visit_date, visit_month, visit_year)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [userId, genre.id, genre.name, 'view', weight, date, month, year]);
      }
    } catch (e) {
      // Ignore duplicates
    }
  }

  // Pre-populate specific movie popularity data for the dashboard
  db.run("DELETE FROM settings WHERE key LIKE 'movie_pop_%'");
  movieTitles.forEach((title, idx) => {
    const views = Math.floor(Math.random() * 5000) + 500;
    const searches = Math.floor(Math.random() * 2000) + 100;
    const rating = (Math.random() * 2 + 7.5).toFixed(1);
    const lang = movieLanguages[Math.floor(Math.random() * movieLanguages.length)];
    const data = JSON.stringify({ title, views, searches, rating, language: lang, id: 1000 + idx });
    db.run("INSERT INTO settings (key, value) VALUES (?, ?)", [`movie_pop_${idx}`, data]);
  });

  saveDb();
  console.log('✓ Sample data generated: 150 users, 150 popular movies, ~3000 visits');
}

function getRandomGenres(genres, count) {
  const shuffled = [...genres].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count).map(g => g.id);
}

function getRandomLanguages(count) {
  const languages = ['en', 'hi', 'ta', 'te', 'kn', 'ml', 'mr', 'bn', 'ja', 'ko'];
  const shuffled = [...languages].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, Math.max(count, 3)); // Ensure at least 3 languages per user for better analytics
}

function saveDb() {
  if (db) {
    try {
      const data = db.export();
      fs.writeFileSync(dbPath, Buffer.from(data));
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
  
  const result = db.exec(`SELECT u.id, u.username, u.email, u.role, u.tmdb_api_key,
    up.genres, up.languages, up.moods, up.priority_language
    FROM users u
    LEFT JOIN user_preferences up ON u.id = up.user_id
    WHERE (u.email = '${email.replace(/'/g, "''")}' OR u.username = '${email.replace(/'/g, "''")}') AND u.password = '${password.replace(/'/g, "''")}'`);
  
  console.log('Query result:', result);
  
  if (result.length > 0 && result[0].values.length > 0) {
    const row = result[0].values[0];
    res.json({
      id: row[0],
      username: row[1],
      email: row[2],
      role: row[3],
      tmdbApiKey: row[4],
      preferences: {
        genres: JSON.parse(row[5] || '[]'),
        languages: JSON.parse(row[6] || '[]'),
        moods: JSON.parse(row[7] || '[]'),
        priorityLanguage: row[8]
      }
    });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

app.get('/api/settings/:key', (req, res) => {
  if (!db) return res.json({ value: null });
  const result = db.exec(`SELECT value FROM settings WHERE key = '${req.params.key}'`);
  res.json({ value: result.length > 0 && result[0].values.length > 0 ? result[0].values[0][0] : null });
});

app.post('/api/settings', (req, res) => {
  const { key, value } = req.body;
  if (db) {
    db.run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [key, value]);
    saveDb();
  }
  res.json({ success: true });
});

app.get('/api/settings', (req, res) => {
  if (!db) return res.json({});
  const result = db.exec('SELECT * FROM settings');
  const settings = {};
  if (result.length > 0) {
    result[0].values.forEach(row => { settings[row[0]] = row[1]; });
  }
  res.json(settings);
});

app.get('/api/users', (req, res) => {
  if (!db) return res.json([]);
  const result = db.exec(`
    SELECT u.id, u.username, u.email, u.role, up.genres, up.languages, up.moods, up.priority_language
    FROM users u
    LEFT JOIN user_preferences up ON u.id = up.user_id
  `);
  
  if (result.length > 0) {
    const cols = result[0].columns;
    res.json(result[0].values.map(row => {
      const obj = {};
      cols.forEach((col, i) => obj[col] = row[i]);
      return {
        id: obj.id,
        username: obj.username,
        email: obj.email,
        role: obj.role,
        preferences: {
          genres: JSON.parse(obj.genres || '[]'),
          languages: JSON.parse(obj.languages || '[]'),
          moods: JSON.parse(obj.moods || '[]'),
          priorityLanguage: obj.priority_language
        }
      };
    }));
  } else {
    res.json([]);
  }
});

app.post('/api/users/register', (req, res) => {
  const { username, email, password, role = 'USER' } = req.body;
  
  if (!db) return res.status(500).json({ error: 'Database not ready' });
  
  const exists = db.exec(`SELECT id FROM users WHERE email = '${email.replace(/'/g, "''")}'`);
  if (exists.length > 0 && exists[0].values.length > 0) {
    return res.status(400).json({ error: 'Email already registered' });
  }
  
  const id = Math.random().toString(36).substring(2, 11);
  db.run(`INSERT INTO users (id, username, email, password, role) VALUES (?, ?, ?, ?, ?)`,
    [id, username, email, password, role]);
  db.run(`INSERT INTO user_preferences (user_id, genres, languages, moods, priority_language) VALUES (?, '[]', '["en"]', '[]', NULL)`, [id]);
  saveDb();
  
  res.json({ id, username, email, role, preferences: { genres: [], languages: ['en'], moods: [], priorityLanguage: null } });
});

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
  res.json(result.length > 0 ? result[0].values.map(row => ({
    id: row[0], rating: row[1], emoji: row[2], message_id: row[3], user_id: row[4]
  })) : []);
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
  res.json(result.length > 0 ? result[0].values.map(row => ({
    id: row[0], name: row[1], message: row[2], rating: row[3], user_id: row[4]
  })) : []);
});

app.delete('/api/feedback/site/:id', (req, res) => {
  if (db) {
    db.run(`DELETE FROM site_feedback WHERE id = '${req.params.id}'`);
    saveDb();
  }
  res.json({ success: true });
});
// ── Project programming languages ────────────────────────────────────────────

// GET all project languages (optionally filter by ?category=Frontend)
app.get('/api/project/languages', (req, res) => {
  if (!db) return res.json([]);
  const { category } = req.query;
  const sql = category
    ? `SELECT * FROM project_languages WHERE category = '${category.replace(/'/g, "''")}' ORDER BY category, name`
    : 'SELECT * FROM project_languages ORDER BY category, name';
  const result = db.exec(sql);
  if (!result.length) return res.json([]);
  const cols = result[0].columns;
  res.json(result[0].values.map(row =>
    Object.fromEntries(cols.map((c, i) => [c, row[i]]))
  ));
});

// GET distinct categories — must come BEFORE /:id to avoid param capture
app.get('/api/project/languages/categories', (req, res) => {
  if (!db) return res.json([]);
  const result = db.exec('SELECT DISTINCT category FROM project_languages ORDER BY category');
  res.json(result.length ? result[0].values.map(r => r[0]) : []);
});

// GET single language by id
app.get('/api/project/languages/:id', (req, res) => {
  if (!db) return res.status(404).json({ error: 'not found' });
  const result = db.exec(`SELECT * FROM project_languages WHERE id = ${parseInt(req.params.id, 10)}`);
  if (!result.length || !result[0].values.length) return res.status(404).json({ error: 'not found' });
  const cols = result[0].columns;
  res.json(Object.fromEntries(cols.map((c, i) => [c, result[0].values[0][i]])));
});

// POST add a new project language
app.post('/api/project/languages', (req, res) => {
  const { name, category, description, color, icon, version, usage_area } = req.body;
  if (!name || !category) return res.status(400).json({ error: 'name and category are required' });
  if (!db) return res.status(500).json({ error: 'db not ready' });
  try {
    db.run('INSERT INTO project_languages (name, category, description, color, icon, version, usage_area) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [name, category, description || null, color || null, icon || null, version || null, usage_area || null]);
    saveDb();
    const r = db.exec(`SELECT * FROM project_languages WHERE name = '${name.replace(/'/g, "''")}' ORDER BY id DESC LIMIT 1`);
    const cols = r[0].columns;
    res.status(201).json(Object.fromEntries(cols.map((c, i) => [c, r[0].values[0][i]])));
  } catch (e) {
    res.status(409).json({ error: e.message });
  }
});

// PUT update a project language
app.put('/api/project/languages/:id', (req, res) => {
  const { name, category, description, color, icon, version, usage_area } = req.body;
  if (!db) return res.status(500).json({ error: 'db not ready' });
  const id = parseInt(req.params.id, 10);
  db.run(`UPDATE project_languages SET
    name = COALESCE(?, name),
    category = COALESCE(?, category),
    description = COALESCE(?, description),
    color = COALESCE(?, color),
    icon = COALESCE(?, icon),
    version = COALESCE(?, version),
    usage_area = COALESCE(?, usage_area)
    WHERE id = ?`,
    [name || null, category || null, description || null, color || null, icon || null, version || null, usage_area || null, id]);
  saveDb();
  res.json({ success: true });
});

// DELETE a project language
app.delete('/api/project/languages/:id', (req, res) => {
  if (!db) return res.status(500).json({ error: 'db not ready' });
  db.run(`DELETE FROM project_languages WHERE id = ${parseInt(req.params.id, 10)}`);
  saveDb();
  res.json({ success: true });
});

// ── Language master list ────────────────────────────────────────────────────
const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English',    flag: '🇺🇸' },
  { code: 'hi', name: 'Hindi',      flag: '🇮🇳' },
  { code: 'kn', name: 'Kannada',    flag: '🇮🇳' },
  { code: 'te', name: 'Telugu',     flag: '🇮🇳' },
  { code: 'ta', name: 'Tamil',      flag: '🇮🇳' },
  { code: 'ml', name: 'Malayalam',  flag: '🇮🇳' },
  { code: 'bn', name: 'Bengali',    flag: '🇮🇳' },
  { code: 'mr', name: 'Marathi',    flag: '🇮🇳' },
  { code: 'ja', name: 'Japanese',   flag: '🇯🇵' },
  { code: 'ko', name: 'Korean',     flag: '🇰🇷' },
  { code: 'zh', name: 'Chinese',    flag: '🇨🇳' },
  { code: 'fr', name: 'French',     flag: '🇫🇷' },
  { code: 'es', name: 'Spanish',    flag: '🇪🇸' },
  { code: 'de', name: 'German',     flag: '🇩🇪' },
  { code: 'it', name: 'Italian',    flag: '🇮🇹' },
  { code: 'pt', name: 'Portuguese', flag: '🇵🇹' },
  { code: 'ru', name: 'Russian',    flag: '🇷🇺' },
];

// GET all supported languages
app.get('/api/languages', (req, res) => res.json(SUPPORTED_LANGUAGES));

// GET user's language preferences
app.get('/api/languages/:userId', (req, res) => {
  if (!db) return res.json({ languages: [], priorityLanguage: null });
  const result = db.exec(
    `SELECT languages, priority_language FROM user_preferences WHERE user_id = '${req.params.userId}'`
  );
  if (result.length > 0 && result[0].values.length > 0) {
    res.json({
      languages: JSON.parse(result[0].values[0][0] || '[]'),
      priorityLanguage: result[0].values[0][1] || null
    });
  } else {
    res.json({ languages: [], priorityLanguage: null });
  }
});

// PUT update user's preferred language list
app.put('/api/languages/:userId', (req, res) => {
  const { languages } = req.body;
  if (!db) return res.json({ success: false });
  db.run(
    `INSERT INTO user_preferences (user_id, languages) VALUES (?, ?)
     ON CONFLICT(user_id) DO UPDATE SET languages = excluded.languages`,
    [req.params.userId, JSON.stringify(languages || [])]
  );
  saveDb();
  res.json({ success: true });
});

// PUT update user's priority language
app.put('/api/languages/:userId/priority', (req, res) => {
  const { priorityLanguage } = req.body;
  if (!db) return res.json({ success: false });
  db.run(
    `INSERT INTO user_preferences (user_id, priority_language) VALUES (?, ?)
     ON CONFLICT(user_id) DO UPDATE SET priority_language = excluded.priority_language`,
    [req.params.userId, priorityLanguage || null]
  );
  saveDb();
  res.json({ success: true });
});

// PUT update full user preferences
app.put('/api/users/:id/preferences', (req, res) => {
  const { genres, languages, moods, priorityLanguage } = req.body;
  if (!db) return res.json({ success: false });
  db.run(
    `INSERT INTO user_preferences (user_id, genres, languages, moods, priority_language)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET
       genres = excluded.genres,
       languages = excluded.languages,
       moods = excluded.moods,
       priority_language = excluded.priority_language`,
    [
      req.params.id,
      JSON.stringify(genres || []),
      JSON.stringify(languages || []),
      JSON.stringify(moods || []),
      priorityLanguage || null
    ]
  );
  saveDb();
  res.json({ success: true });
});

// PUT update user's TMDB API key
app.put('/api/users/:id/tmdb-key', (req, res) => {
  const { key } = req.body;
  if (!db) return res.json({ success: false });
  db.run(`UPDATE users SET tmdb_api_key = ? WHERE id = ?`, [key || null, req.params.id]);
  saveDb();
  res.json({ success: true });
});

app.get('/api/movies', (req, res) => res.json([]));
app.post('/api/movies', (req, res) => res.json({ success: true }));
app.get('/api/short-films', (req, res) => res.json([]));
app.post('/api/short-films', (req, res) => res.json({ success: true }));

// ===== ANALYTICS API =====
app.get('/api/analytics/visits', (req, res) => {
  if (!db) return res.json({ monthly: [], userTypeStats: [], yearly: [] });
  
  const year = req.query.year || new Date().getFullYear();
  
  // Get guest vs registered user visits by month
  const monthlyResult = db.exec(`
    SELECT visit_month as month, user_type, COUNT(*) as count
    FROM user_visits
    WHERE visit_year = ${parseInt(year)}
    GROUP BY visit_month, user_type
    ORDER BY visit_month
  `);
  
  const monthly = monthlyResult.length ? monthlyResult[0].values.map(row => ({
    month: row[0], user_type: row[1], count: row[2]
  })) : [];

  // Get total user type breakdown
  const userTypeResult = db.exec(`
    SELECT user_type, COUNT(*) as count, COUNT(DISTINCT user_id) as unique_users
    FROM user_visits
    WHERE visit_year = ${parseInt(year)}
    GROUP BY user_type
  `);
  
  const userTypeStats = userTypeResult.length ? userTypeResult[0].values.map(row => ({
    user_type: row[0], count: row[1], unique_users: row[2]
  })) : [];

  // Get yearly comparison
  const yearlyResult = db.exec(`
    SELECT visit_year as year, user_type, COUNT(*) as count
    FROM user_visits
    GROUP BY visit_year, user_type
    ORDER BY visit_year
  `);
  
  const yearly = yearlyResult.length ? yearlyResult[0].values.map(row => ({
    year: row[0], user_type: row[1], count: row[2]
  })) : [];

  res.json({ monthly, userTypeStats, yearly });
});

app.get('/api/analytics/genres', (req, res) => {
  if (!db) return res.json({ monthly: [], overall: [], byUserType: [] });
  
  const year = req.query.year || new Date().getFullYear();
  
  // Get overall genre popularity
  const overallResult = db.exec(`
    SELECT genre_name, SUM(interaction_weight) as total_score, COUNT(*) as total_interactions, COUNT(DISTINCT user_id) as unique_users
    FROM genre_analytics
    WHERE visit_year = ${parseInt(year)}
    GROUP BY genre_name
    ORDER BY total_score DESC
  `);
  
  const overall = overallResult.length ? overallResult[0].values.map(row => ({
    genre_name: row[0], total_score: row[1], total_interactions: row[2], unique_users: row[3]
  })) : [];

  res.json({ monthly: [], overall, byUserType: [] });
});

app.get('/api/analytics/activity', (req, res) => {
  if (!db) return res.json([]);
  
  // Get recent visits with user names/emails where possible
  const result = db.exec(`
    SELECT v.id, v.user_id, v.user_type, v.visit_date, v.page_viewed, u.username, u.email
    FROM user_visits v
    LEFT JOIN users u ON v.user_id = u.id
    ORDER BY v.id DESC
    LIMIT 100
  `);
  
  if (!result.length) return res.json([]);
  
  const cols = result[0].columns;
  res.json(result[0].values.map(row => {
    const obj = Object.fromEntries(cols.map((c, i) => [c, row[i]]));
    // If guest, generate a name if not already present (conceptually)
    if (obj.user_type === 'guest' && !obj.username) {
      const guestNames = ['Aarav', 'Vivaan', 'Aditya', 'Vihaan', 'Arjun', 'Sai', 'Arnav', 'Ayaan', 'Krishna', 'Ishaan'];
      obj.username = guestNames[obj.id % guestNames.length] + ' (Guest)';
      obj.email = 'Guest Session';
    }
    return obj;
  }));
});

app.get('/api/analytics/popular-movies', (req, res) => {
  if (!db) return res.json([]);
  const result = db.exec("SELECT value FROM settings WHERE key LIKE 'movie_pop_%'");
  if (!result.length) return res.json([]);
  res.json(result[0].values.map(row => JSON.parse(row[0])).sort((a, b) => b.views - a.views));
});

app.get('/health', (req, res) => res.json({ status: 'ok' }));
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// Root route - API info
app.get('/', (req, res) => {
  res.json({
    name: 'ChalaChitra API',
    version: '1.0',
    status: 'running',
    endpoints: {
      health: '/health',
      analytics: {
        visits: '/api/analytics/visits?year=2024',
        genres: '/api/analytics/genres?year=2024'
      },
      users: '/api/users'
    }
  });
});

initDb().then(() => {
  app.listen(PORT, () => {
    console.log(`✅ Backend running on http://localhost:${PORT}`);
    console.log(`📊 API: http://localhost:${PORT}/api`);
    console.log(`🔑 Test: chalachitra@gmail.com / Admin@1234`);
  });
}).catch(err => {
  console.error('Failed to initialize:', err);
  process.exit(1);
});
