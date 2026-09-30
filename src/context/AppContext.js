import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { seedFarms, seedUser } from '../data/mockData';
import { translate, normalizeLanguageCode, getLanguageInfo, SUPPORTED_LANGUAGES } from '../i18n';

const AppContext = createContext(null);

const STORAGE_KEYS = {
  session: '@AgriVision/session',
  farms: '@AgriVision/farms',
  language: '@AgriVision/language',
  theme: '@AgriVision/theme',
};

export function AppProvider({ children }) {
  const [hydrated, setHydrated] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(seedUser);
  const [farms, setFarms] = useState(seedFarms);
  const [selectedFarm, setSelectedFarm] = useState(null);
  const [language, setLanguageState] = useState('en');
  const [isDark, setIsDark] = useState(false);

  // ── Hydrate persisted state ────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const [session, storedFarms, storedLang, storedTheme] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.session),
          AsyncStorage.getItem(STORAGE_KEYS.farms),
          AsyncStorage.getItem(STORAGE_KEYS.language),
          AsyncStorage.getItem(STORAGE_KEYS.theme),
        ]);
        if (session) setIsLoggedIn(JSON.parse(session).isLoggedIn);
        if (storedFarms) setFarms(JSON.parse(storedFarms));
        if (storedLang) setLanguageState(normalizeLanguageCode(storedLang));
        if (storedTheme) setIsDark(JSON.parse(storedTheme));
      } catch (e) {
        // Fresh install / corrupt storage — fall back to seed data.
      } finally {
        setHydrated(true);
      }
    })();
  }, []);

  const persistFarms = useCallback((next) => {
    setFarms(next);
    AsyncStorage.setItem(STORAGE_KEYS.farms, JSON.stringify(next)).catch(() => {});
  }, []);

  const login = useCallback(async (email, profile) => {
    setIsLoggedIn(true);
    if (email) setUser((u) => ({ ...u, email }));
    if (profile) setUser((u) => ({ ...u, ...profile }));
    await AsyncStorage.setItem(
      STORAGE_KEYS.session,
      JSON.stringify({ isLoggedIn: true, email })
    );
  }, []);

  const logout = useCallback(async () => {
    setIsLoggedIn(false);
    setSelectedFarm(null);
    await AsyncStorage.removeItem(STORAGE_KEYS.session);
  }, []);

  const setLanguage = useCallback(async (lang) => {
    const code = normalizeLanguageCode(lang);
    setLanguageState(code);
    await AsyncStorage.setItem(STORAGE_KEYS.language, code);
  }, []);

  const languageCode = useMemo(() => normalizeLanguageCode(language), [language]);
  const languageInfo = useMemo(() => getLanguageInfo(languageCode), [languageCode]);

  const t = useCallback(
    (key, params) => translate(key, languageCode, params),
    [languageCode]
  );

  const toggleTheme = useCallback(async () => {
    setIsDark((d) => {
      AsyncStorage.setItem(STORAGE_KEYS.theme, JSON.stringify(!d)).catch(() => {});
      return !d;
    });
  }, []);

  // ── Farm CRUD ──────────────────────────────────────────────────
  const addFarm = useCallback(
    (farm) => {
      const withId = {
        ...farm,
        id: farm.id || `farm_${Date.now()}`,
        ownerId: farm.ownerId || user.uid,
        userEmail: farm.userEmail || user.email,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      persistFarms([...farms, withId]);
      return withId;
    },
    [farms, persistFarms, user]
  );

  const updateFarm = useCallback(
    (farmId, patch) => {
      persistFarms(
        farms.map((f) => (f.id === farmId ? { ...f, ...patch, updatedAt: Date.now() } : f))
      );
    },
    [farms, persistFarms]
  );

  const deleteFarm = useCallback(
    (farmId) => {
      persistFarms(farms.filter((f) => f.id !== farmId));
      setSelectedFarm((s) => (s && s.id === farmId ? null : s));
    },
    [farms, persistFarms]
  );

  const selectFarm = useCallback((farm) => setSelectedFarm(farm), []);

  const value = useMemo(
    () => ({
      hydrated,
      isLoggedIn,
      user,
      setUser,
      farms,
      selectedFarm,
      selectFarm,
      addFarm,
      updateFarm,
      deleteFarm,
      language,
      languageCode,
      languageInfo,
      setLanguage,
      t,
      supportedLanguages: SUPPORTED_LANGUAGES,
      isDark,
      toggleTheme,
      login,
      logout,
    }),
    [
      hydrated, isLoggedIn, user, farms, selectedFarm, selectFarm, addFarm,
      updateFarm, deleteFarm, language, languageCode, languageInfo, setLanguage,
      t, isDark, toggleTheme, login, logout,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside <AppProvider>');
  return ctx;
}
