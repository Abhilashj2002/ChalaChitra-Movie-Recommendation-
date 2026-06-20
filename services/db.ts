import initSqlJs from 'sql.js';
import { User, UserRole, UserPreferences } from '../types';

const SQLITE_STORAGE_KEY = 'cinema_mithra_sqlite';
const SQL_WASM_URL = 'https://cdn.jsdelivr.net/npm/sql.js@1.12.0/dist/sql-wasm.wasm';

let db: any = null;

function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function initDB() {
  if (db) return db;

  try {
    console.log('Initializing database...');
    
    // Fetch with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    let wasmBinary: ArrayBuffer;
    try {
      const wasmResponse = await fetch(SQL_WASM_URL, { signal: controller.signal });
      clearTimeout(timeoutId);
      
      if (!wasmResponse.ok) {
        throw new Error(`Failed to fetch SQL WASM: ${wasmResponse.status} ${wasmResponse.statusText}`);
      }
      wasmBinary = await wasmResponse.arrayBuffer();
      console.log('✓ SQL WASM loaded, size:', wasmBinary.byteLength);
    } catch (err: any) {
      clearTimeout(timeoutId);
      console.error('Failed to fetch WASM:', err.message);
      throw new Error('Failed to load database library: ' + err.message);
    }

    let SQL: any;
    try {
      SQL = await initSqlJs({
        wasmBinary: wasmBinary
      });
      console.log('✓ SQL.js initialized');
    } catch (err: any) {
      console.error('Failed to initialize SQL.js:', err);
      throw new Error('Failed to initialize database: ' + err.message);
    }

    const savedDbStr = localStorage.getItem(SQLITE_STORAGE_KEY);
    if (savedDbStr) {
      try {
        const u8array = decode(savedDbStr);
        db = new SQL.Database(u8array);
        // Validate database by checking if tables exist
        const res = db.exec("SELECT name FROM sqlite_master WHERE type='table'");
        if (!res.length) {
          console.warn('Corrupted database detected, creating new one');
          db = new SQL.Database();
          createSchema();
        } else {
          console.log('✓ Database loaded with tables:', res[0].values.map((v: any) => v[0]).join(', '));
        }
      } catch (e) {
        console.error('Failed to load saved database, creating new one:', e);
        localStorage.removeItem(SQLITE_STORAGE_KEY);
        db = new SQL.Database();
        createSchema();
      }
    } else {
      console.log('No saved database found, creating new one');
      db = new SQL.Database();
      createSchema();
    }
    
    console.log('✓ Database initialization complete');
    return db;
  } catch (error) {
    console.error("Critical: Failed to initialize SQLite database.", error);
    // Create in-memory fallback database
    console.warn('Creating fallback in-memory database...');
    try {
      const SQL = await initSqlJs();
      db = new SQL.Database();
      createSchema();
      console.log('✓ Fallback database created');
      return db;
    } catch (fallbackError) {
      console.error("Fallback also failed:", fallbackError);
      throw error;
    }
  }
}

function createSchema() {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT,
      email TEXT UNIQUE,
      password TEXT,
      role TEXT,
      tmdb_api_key TEXT,
      preferences TEXT
    );

    CREATE TABLE IF NOT EXISTS watch_history (
      user_id TEXT,
      movie_id INTEGER,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id, movie_id)
    );

    CREATE TABLE IF NOT EXISTS ratings (
      user_id TEXT,
      movie_id INTEGER,
      rating INTEGER,
      PRIMARY KEY (user_id, movie_id)
    );

    CREATE TABLE IF NOT EXISTS config (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);

  const adminId = 'admin-1';
  const adminPrefs = JSON.stringify({ genres: [], languages: ['en', 'kn'], moods: [], priorityLanguage: 'kn' });
  db.run(`
    INSERT OR IGNORE INTO users (id, username, email, password, role, tmdb_api_key, preferences)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `, [adminId, 'chalachitra@gmail.com', 'chalachitra@gmail.com', 'Admin@1234', UserRole.ADMIN, '', adminPrefs]);
  db.run(`
    UPDATE users SET username = ?, email = ?, password = ?, role = ?
    WHERE id = ?
  `, ['chalachitra@gmail.com', 'chalachitra@gmail.com', 'Admin@1234', UserRole.ADMIN, adminId]);

  db.run(`INSERT OR IGNORE INTO config (key, value) VALUES ('tmdb_api_key', '')`);

  persistSync();
}

// Synchronous persist for immediate schema setup
function persistSync() {
  if (db) {
    try {
      const data = db.export();
      const base64 = encode(data);
      localStorage.setItem(SQLITE_STORAGE_KEY, base64);
      console.log('✓ Database persisted to localStorage');
    } catch (e) {
      console.error("Failed to persist database to localStorage", e);
    }
  }
}

function persist() {
  persistSync();
}

const dbPromise = initDB().catch(error => {
  console.error('Database initialization failed:', error);
  throw error;
});

export const DB = {
  settings: {
    get: async (key: string): Promise<string | null> => {
      const db = await dbPromise;
      const res = db.exec("SELECT value FROM config WHERE key = ?", [key]);
      if (res.length > 0 && res[0].values.length > 0) {
        return res[0].values[0][0] as string;
      }
      return null;
    },
    set: async (key: string, value: string) => {
      const db = await dbPromise;
      db.run("INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)", [key, value]);
      persist();
    }
  },

  users: {
    register: async (username: string, email: string, password: string, role: UserRole = UserRole.USER): Promise<User> => {
      try {
        const db = await dbPromise;
        
        const id = Math.random().toString(36).substr(2, 9);
        const prefs = JSON.stringify({ genres: [], languages: ['en', 'kn'], moods: [], priorityLanguage: null });
        
        try {
          db.run(`
            INSERT INTO users (id, username, email, password, role, preferences)
            VALUES (?, ?, ?, ?, ?, ?)
          `, [id, username, email, password, role, prefs]);
          
          persistSync();
          
          return { id, username, email, role, preferences: JSON.parse(prefs) };
        } catch (e: any) {
          console.error('Register error:', e);
          throw new Error("Email already registered");
        }
      } catch (error: any) {
        console.error('Registration error:', error);
        throw error;
      }
    },

    authenticate: async (email: string, password: string): Promise<User | undefined> => {
      try {
        console.log('Attempting authentication for:', email);
        const db = await Promise.race([
          dbPromise,
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('Database request timeout')), 15000)
          )
        ]).catch(error => {
          console.error('Failed to get database:', error.message);
          throw error;
        });
        
        try {
          console.log('Executing query...');
          const res = db.exec("SELECT * FROM users WHERE (email = ? OR username = ?) AND password = ?", [email, email, password]);
          console.log('Query result:', res.length > 0 ? `Found ${res[0].values.length} user(s)` : 'No results');
          
          if (res.length > 0 && res[0].values.length > 0) {
            const val = res[0].values[0];
            console.log('✓ User authenticated');
            return {
              id: val[0] as string,
              username: val[1] as string,
              email: val[2] as string,
              role: val[4] as UserRole,
              tmdbApiKey: val[5] as string,
              preferences: JSON.parse(val[6] as string)
            };
          }
          console.log('No user found with these credentials');
          return undefined;
        } catch (queryError: any) {
          console.error('Database query error:', queryError.message);
          throw new Error('Database error: ' + queryError.message);
        }
      } catch (error: any) {
        console.error('Authentication error:', error.message);
        throw error;
      }
    },

    updateTMDBKey: async (userId: string, key: string) => {
      const db = await dbPromise;
      db.run("UPDATE users SET tmdb_api_key = ? WHERE id = ?", [key, userId]);
      persist();
    },

    updatePreferences: async (userId: string, prefs: UserPreferences) => {
      const db = await dbPromise;
      db.run("UPDATE users SET preferences = ? WHERE id = ?", [JSON.stringify(prefs), userId]);
      persist();
    },

    getAll: async (): Promise<User[]> => {
      const db = await dbPromise;
      const res = db.exec("SELECT id, username, email, role, tmdb_api_key, preferences FROM users");
      if (res.length === 0) return [];
      return res[0].values.map((val: any) => ({
        id: val[0],
        username: val[1],
        email: val[2],
        role: val[3] as UserRole,
        tmdbApiKey: val[4],
        preferences: JSON.parse(val[5])
      }));
    }
  },

  history: {
    add: async (userId: string, movieId: number) => {
      const db = await dbPromise;
      db.run("INSERT OR REPLACE INTO watch_history (user_id, movie_id) VALUES (?, ?)", [userId, movieId]);
      persist();
    },

    remove: async (userId: string, movieId: number) => {
      const db = await dbPromise;
      db.run("DELETE FROM watch_history WHERE user_id = ? AND movie_id = ?", [userId, movieId]);
      persist();
    },

    exists: async (userId: string, movieId: number): Promise<boolean> => {
      const db = await dbPromise;
      const res = db.exec("SELECT 1 FROM watch_history WHERE user_id = ? AND movie_id = ?", [userId, movieId]);
      return res.length > 0 && res[0].values.length > 0;
    },

    get: async (userId: string): Promise<number[]> => {
      const db = await dbPromise;
      const res = db.exec("SELECT movie_id FROM watch_history WHERE user_id = ? ORDER BY timestamp DESC LIMIT 50", [userId]);
      if (res.length === 0) return [];
      return res[0].values.map((v: any) => v[0]);
    }
  },

  ratings: {
    set: async (userId: string, movieId: number, rating: number) => {
      const db = await dbPromise;
      db.run("INSERT OR REPLACE INTO ratings (user_id, movie_id, rating) VALUES (?, ?, ?)", [userId, movieId, rating]);
      persist();
    },

    get: async (userId: string, movieId: number): Promise<number | null> => {
      const db = await dbPromise;
      const res = db.exec("SELECT rating FROM ratings WHERE user_id = ? AND movie_id = ?", [userId, movieId]);
      return res.length > 0 ? (res[0].values[0][0] as number) : null;
    },

    getForUser: async (userId: string): Promise<Record<number, number>> => {
      const db = await dbPromise;
      const res = db.exec("SELECT movie_id, rating FROM ratings WHERE user_id = ?", [userId]);
      if (res.length === 0) return {};
      const ratings: Record<number, number> = {};
      res[0].values.forEach((v: any) => {
        ratings[v[0]] = v[1];
      });
      return ratings;
    }
  }
};
