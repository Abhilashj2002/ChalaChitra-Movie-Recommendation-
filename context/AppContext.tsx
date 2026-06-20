import React, { createContext, useContext } from 'react';
import { AuthState, Language, User, Movie, Theme } from '../types';

export interface AppContextType {
  auth: AuthState;
  lang: Language;
  theme: Theme;
  toggleTheme: () => void;
  setLang: (l: Language) => void;
  setUser: (user: User) => void;
  logout: () => void;
  updateUser: (user: User) => void;
  t: (key: string) => string;
  selectedMovie: Movie | null;
  setSelectedMovie: (m: Movie | null, autoPlay?: boolean) => void;
  autoPlayTrailer: boolean;
  systemKey: string | null;
  setSystemKey: (key: string) => void;
  omdbKey: string | null;
  setOmdbKey: (key: string) => void;
}

export const AppContext = createContext<AppContextType | undefined>(undefined);

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used within AppProvider");
  return context;
};
