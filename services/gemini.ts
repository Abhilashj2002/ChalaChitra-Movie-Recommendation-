
import { GoogleGenAI, Type } from "@google/genai";
import { Language } from "../types";

export type QueryIntent = {
  type: 'actor' | 'movie' | 'genre' | 'mood' | 'language' | 'general';
  entity: string;
  confidence: number;
};

// Fast local heuristic classifier (no API needed, instant)
const localClassify = (query: string): QueryIntent => {
  const q = query.toLowerCase().trim();
  const moodWords = ['sad', 'happy', 'bored', 'excited', 'romantic', 'scared', 'angry', 'laugh', 'cry', 'feel like', 'feeling'];
  if (moodWords.some(w => q.includes(w))) return { type: 'mood', entity: query, confidence: 0.8 };
  const genreMap: Record<string, string> = {
    'action': 'action', 'comedy': 'comedy', 'horror': 'horror', 'romance': 'romance',
    'drama': 'drama', 'sci-fi': 'sci-fi', 'science fiction': 'sci-fi', 'thriller': 'thriller',
    'animation': 'animation', 'documentary': 'documentary', 'fantasy': 'fantasy', 'crime': 'crime'
  };
  const matchedGenre = Object.keys(genreMap).find(g => q.includes(g));
  if (matchedGenre) return { type: 'genre', entity: genreMap[matchedGenre], confidence: 0.9 };
  const langMap: Record<string, string> = {
    'hindi': 'hi', 'kannada': 'kn', 'telugu': 'te', 'tamil': 'ta',
    'malayalam': 'ml', 'english': 'en', 'japanese': 'ja', 'korean': 'ko'
  };
  const matchedLang = Object.keys(langMap).find(l => q.includes(l));
  if (matchedLang) return { type: 'language', entity: langMap[matchedLang], confidence: 0.9 };
  const actorKeywords = ['actor', 'actress', 'director', 'who is', 'movies of', 'films by', 'films of', 'biography', 'bio'];
  if (actorKeywords.some(k => q.includes(k))) return { type: 'actor', entity: query, confidence: 0.85 };
  const movieKeywords = ['movie', 'film', 'show', 'series', 'watch', 'plot', 'review', 'cast of', 'story of'];
  if (movieKeywords.some(k => q.includes(k))) {
    const entity = query.replace(/\s+(movie|film|show|series)\s*$/i, '').trim();
    return { type: 'movie', entity: entity || query, confidence: 0.85 };
  }
  return { type: 'general', entity: query, confidence: 0.5 };
};

export const classifyQuery = async (query: string): Promise<QueryIntent> => {
  const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY || (import.meta as any).env?.GEMINI_API_KEY;
  if (!apiKey) return localClassify(query);
  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: `You are classifying cinema chatbot queries. Classify the following query into ONE of:
- "actor": wants info about an actor/director/celebrity
- "movie": wants info about a specific movie/show
- "genre": wants movies by genre (action, horror, comedy etc)
- "mood": expresses a mood to get recommendation (sad, happy, romantic etc)
- "language": wants movies in a specific language (Tamil, Hindi etc)
- "general": greeting, unclear, or other

Also extract the key entity (name, genre, language, mood).
Respond ONLY with JSON: {"type":"actor","entity":"Shah Rukh Khan","confidence":0.95}

Query: "${query.replace(/"/g, "'")}"`,
      config: { temperature: 0.1 }
    });
    const text = (response.text || '').trim();
    const jsonMatch = text.match(/\{[^}]+\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed.type) return { type: parsed.type, entity: parsed.entity || query, confidence: parsed.confidence || 0.8 };
    }
  } catch (_e) {
    // fall through to local
  }
  return localClassify(query);
};

export const getGeminiResponse = async (prompt: string, userLang: Language) => {
  const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY || (import.meta as any).env?.GEMINI_API_KEY;
  if (!apiKey) {
    return "Gemini API key is not configured. Please set VITE_GEMINI_API_KEY in .env.local.";
  }

  const ai = new GoogleGenAI({ apiKey });
  
  const languageNames: Record<string, string> = {
    en: 'English', kn: 'Kannada', hi: 'Hindi', te: 'Telugu',
    ta: 'Tamil', ml: 'Malayalam', bn: 'Bengali', mr: 'Marathi'
  };

  const systemInstruction = `
    You are "ChalaChitra", a helpful and knowledgeable movie companion. 
    You are fluent in English and many Indian languages including ${Object.values(languageNames).join(', ')}. 
    Your tone is friendly, like a friend who knows everything about movies.
    Current Language Preference: ${languageNames[userLang] || 'English'}.
    Respond ALWAYS in the user's preferred language (${languageNames[userLang]}).
    If the user asks a question in one language but their preference is set to another, acknowledge and respond in their preference unless it's clearly more natural to use the language they asked in.
    Provide movie recommendations, trivia, or answer questions about actors.
    Focus on quality movies, particularly South Indian and broader Indian cinema.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: prompt,
      config: {
        systemInstruction,
        temperature: 0.7,
      },
    });
    return response.text;
  } catch (error) {
    console.error("Gemini Error:", error);
    return "";
  }
};

export const getMoodAdvice = async (mood: string, userLang: Language) => {
    const prompt = `Give me a short, witty movie recommendation context for someone feeling ${mood}. Explain why this mood fits certain types of movies. Respond in ${userLang}.`;
    return getGeminiResponse(prompt, userLang);
};
