"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

interface StarterTemplatesContextValue {
  isStarterTemplatesOpen: boolean;
  openStarterTemplates: () => void;
  setStarterTemplatesOpen: (open: boolean) => void;
}

interface StarterTemplatesProviderProps {
  children: ReactNode;
}

const StarterTemplatesContext =
  createContext<StarterTemplatesContextValue | null>(null);

export function StarterTemplatesProvider({
  children,
}: StarterTemplatesProviderProps) {
  const [isStarterTemplatesOpen, setStarterTemplatesOpen] = useState(false);
  const openStarterTemplates = useCallback(() => {
    setStarterTemplatesOpen(true);
  }, []);
  const value = useMemo(
    () => ({
      isStarterTemplatesOpen,
      openStarterTemplates,
      setStarterTemplatesOpen,
    }),
    [isStarterTemplatesOpen, openStarterTemplates],
  );

  return (
    <StarterTemplatesContext.Provider value={value}>
      {children}
    </StarterTemplatesContext.Provider>
  );
}

export function useStarterTemplates() {
  const context = useContext(StarterTemplatesContext);

  if (!context) {
    throw new Error(
      "useStarterTemplates must be used within StarterTemplatesProvider.",
    );
  }

  return context;
}
