# ChalaChitra - SQLite Backend Setup

## Overview
The application now uses **SQLite** for persistent data storage instead of LocalStorage. The backend runs on port 3002 and the frontend on port 3001.

## Installation

### 1. Install all dependencies (frontend + backend)
```bash
npm run install:all
```

Or install separately:
```bash
# Frontend
npm install

# Backend
cd server
npm install
```

## Running the Application

### Development Mode (Both Frontend + Backend)
```bash
npm run dev
```

This starts:
- **Backend API** on http://localhost:3002
- **Frontend** on http://localhost:3001

### Run Separately

**Backend only:**
```bash
npm run server
```

**Frontend only:**
```bash
npm run client
```

## Database Location
The SQLite database is stored at:
```
server/cinema.db
```

## Default Users

| Username | Email | Password | Role |
|----------|-------|----------|------|
| chalachitra@gmail.com | chalachitra@gmail.com | Admin@1234 | ADMIN |
| user | user@cinema.com | user123 | USER |

## API Endpoints

### Settings
- `GET /api/settings/:key` - Get a setting value
- `POST /api/settings` - Set a setting
- `GET /api/settings` - Get all settings

### Users
- `GET /api/users` - Get all users
- `POST /api/users/register` - Register new user
- `POST /api/users/authenticate` - Login
- `PUT /api/users/:id/preferences` - Update user preferences
- `PUT /api/users/:id/tmdb-key` - Update TMDB API key

### Watch History
- `GET /api/history/:userId` - Get user's watch history
- `POST /api/history` - Add movie to history
- `DELETE /api/history/:userId/:movieId` - Remove from history
- `GET /api/history/:userId/exists/:movieId` - Check if movie exists in history

### Ratings
- `GET /api/ratings/:userId/:movieId` - Get user's rating for a movie
- `POST /api/ratings` - Set/update rating
- `GET /api/ratings/:userId` - Get all user's ratings

### Feedback
- `POST /api/feedback/chatbot` - Submit chatbot feedback
- `GET /api/feedback/chatbot` - Get all chatbot feedback
- `GET /api/feedback/chatbot/stats` - Get feedback statistics
- `POST /api/feedback/site` - Submit site feedback
- `GET /api/feedback/site` - Get all site feedback
- `DELETE /api/feedback/site/:id` - Delete site feedback

### Movies
- `GET /api/movies` - Get all cached movies
- `POST /api/movies` - Add/update movie

### Short Films
- `GET /api/short-films` - Get all short films
- `POST /api/short-films` - Add/update short film

## Architecture

```
┌─────────────────┐     HTTP/JSON     ┌─────────────────┐
│   Frontend      │ ◄──────────────► │   Backend       │
│   (React/Vite)  │                   │  (Express)      │
│   Port: 3001    │                   │  Port: 3002     │
└─────────────────┘                   └────────┬────────┘
                                               │
                                               ▼
                                      ┌─────────────────┐
                                      │   SQLite DB     │
                                      │  (cinema.db)    │
                                      └─────────────────┘
```

## Tech Stack

**Frontend:**
- React 19 + TypeScript
- Vite
- TailwindCSS
- React Router

**Backend:**
- Node.js + Express
- better-sqlite3
- CORS enabled

## Migration from LocalStorage

The database automatically initializes with default users and settings on first run. Your existing LocalStorage data will **not** be migrated automatically. If you need to migrate existing data, you'll need to manually export it from LocalStorage and import it via the API.

## Troubleshooting

**Backend won't start:**
- Make sure you're in the `server` directory
- Run `npm install` in the server folder
- Check if port 3002 is available

**Frontend can't connect to backend:**
- Ensure the backend is running on port 3002
- Check the `API_BASE` constant in `services/simpleDb.ts`

**Database errors:**
- Delete `server/cinema.db` to reset the database
- The database will be recreated with default data on next startup
