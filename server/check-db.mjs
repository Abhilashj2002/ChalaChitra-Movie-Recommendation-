import initSqlJs from 'sql.js';
import { readFileSync } from 'fs';

const buf = readFileSync('cinema.db');
const db = new (await initSqlJs()).Database(buf);

const years = db.exec("SELECT DISTINCT visit_year as year FROM user_visits ORDER BY visit_year");
console.log("Years in user_visits:", years[0]?.values?.map(r => r[0]) || 'no data');

const userCount = db.exec("SELECT COUNT(*) as cnt FROM users");
console.log("Total users:", userCount[0]?.values?.[0]?.[0]);

const visitCount = db.exec("SELECT COUNT(*) as cnt FROM user_visits");
console.log("Total visits:", visitCount[0]?.values?.[0]?.[0]);

const genreCount = db.exec("SELECT COUNT(*) as cnt FROM genre_analytics");
console.log("Total genre interactions:", genreCount[0]?.values?.[0]?.[0]);

const visit2026 = db.exec("SELECT COUNT(*) as cnt FROM user_visits WHERE visit_year = 2026");
console.log("Visits in 2026:", visit2026[0]?.values?.[0]?.[0]);

const genre2026 = db.exec("SELECT COUNT(*) as cnt FROM genre_analytics WHERE visit_year = 2026");
console.log("Genre interactions in 2026:", genre2026[0]?.values?.[0]?.[0]);

const langPrefs = db.exec("SELECT json_extract(languages, '$') as langs FROM user_preferences LIMIT 5");
console.log("Sample language preferences:", langPrefs[0]?.values?.slice(0, 3) || 'none');