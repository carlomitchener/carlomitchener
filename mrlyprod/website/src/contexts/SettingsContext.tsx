import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { getItem, setItem, removeItem } from "../lib/browser/storage";
import { SNAKE_DEFAULTS, type SnakeSettings } from "../apps/MrlySnake/logic";

// TYPES

interface SettingsContextType {
  snake: SnakeSettings;
  setSnake: (patch: Partial<SnakeSettings>) => void;
  resetSnake: () => void;
}

// STORAGE

const SNAKE_KEY = "mrly_settings_snake";

function loadSnake(): SnakeSettings {
  const raw = getItem(SNAKE_KEY);
  if (!raw) return SNAKE_DEFAULTS;
  try {
    return { ...SNAKE_DEFAULTS, ...(JSON.parse(raw) as Partial<SnakeSettings>) };
  } catch {
    return SNAKE_DEFAULTS;
  }
}

// CONTEXT

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const useSettings = () => {
  const ctx = useContext(SettingsContext);
  if (!ctx) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return ctx;
};

interface SettingsProviderProps {
  children: ReactNode;
}

export const SettingsProvider = ({ children }: SettingsProviderProps) => {
  const [snake, setSnakeState] = useState<SnakeSettings>(() => loadSnake());

  useEffect(() => {
    setItem(SNAKE_KEY, JSON.stringify(snake));
  }, [snake]);

  const setSnake = (patch: Partial<SnakeSettings>) => {
    setSnakeState((prev) => ({ ...prev, ...patch }));
  };

  const resetSnake = () => {
    removeItem(SNAKE_KEY);
    setSnakeState(SNAKE_DEFAULTS);
  };

  return (
    <SettingsContext.Provider value={{ snake, setSnake, resetSnake }}>
      {children}
    </SettingsContext.Provider>
  );
};
