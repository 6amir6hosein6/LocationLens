import { createContext, useContext, useState, useCallback } from 'react';

const AppReadyContext = createContext(null);

export function AppReadyProvider({ children }) {
  const [ready, setReady] = useState(false);

  const markReady = useCallback(() => setReady(true), []);

  return (
    <AppReadyContext.Provider value={{ ready, markReady }}>
      {children}
    </AppReadyContext.Provider>
  );
}

export function useAppReady() {
  const context = useContext(AppReadyContext);
  if (!context) {
    throw new Error('useAppReady must be used within AppReadyProvider');
  }
  return context;
}
