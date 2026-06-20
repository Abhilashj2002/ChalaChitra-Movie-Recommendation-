import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { TMDB } from './services/tmdb';

// Global background prefetch of TMDB data to ensure instant homepage load
const envKey = (import.meta as any).env?.VITE_TMDB_API_KEY || '';
const tmdbKey = localStorage.getItem('cinema_mithra_sqlite') 
  ? (JSON.parse(localStorage.getItem('cinema_mithra_sqlite') || '{}')?.settings?.tmdb_api_key || envKey)
  : envKey;

if (tmdbKey) {
  // Fire off critical requests immediately
  TMDB.getTrendingCombined(tmdbKey, 20).catch(() => {});
  TMDB.getHiddenGems(tmdbKey).catch(() => {});
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
