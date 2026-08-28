import { createContext, useContext, useState, useEffect, type ReactNode, useCallback } from "react";
import { randomColor } from "../lib/colors";
import { getItem, setItem, removeItem } from "../lib/browser/storage";

// TYPES

export interface ThemeTokens {
  borderWidth: number;
  borderRadius: number;
  fontSize: number;
  gap: number;
  padding: number;
  backgroundColor: string | null;
  borderColor: string | null;
  fontColor: string | null;
}

export const THEME_DEFAULTS: ThemeTokens = {
  borderWidth: 0,
  borderRadius: 5,
  fontSize: 15,
  gap: 5,
  padding: 5,
  backgroundColor: null,
  borderColor: null,
  fontColor: null,
};

interface ThemeContextType {
  mode: boolean;
  font: boolean;
  disco: boolean;
  mute: boolean;
  tokens: ThemeTokens;
  toggleMode: () => void;
  toggleFont: () => void;
  toggleMute: () => void;
  startDisco: () => void;
  stopDisco: () => void;
  refreshColors: () => void;
  setTokens: (patch: Partial<ThemeTokens>) => void;
  resetTokens: () => void;
}

// STORAGE

const TOKENS_KEY = "mrly_theme_tokens";

function loadTokens(): ThemeTokens {
  const raw = getItem(TOKENS_KEY);
  if (!raw) return THEME_DEFAULTS;
  try {
    return { ...THEME_DEFAULTS, ...(JSON.parse(raw) as Partial<ThemeTokens>) };
  } catch {
    return THEME_DEFAULTS;
  }
}

// CONTEXT

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider = ({ children }: ThemeProviderProps) => {
  const [mode, setMode] = useState(() => getItem("mrly_mode") === "true");
  const [font, setFont] = useState(() => getItem("mrly_font") === "true");
  const [mute, setMute] = useState(() => getItem("mrly_mute") === "true");
  const [tokens, setTokensState] = useState<ThemeTokens>(() => loadTokens());
  const [disco, setDisco] = useState(false);

  const updateGradient = useCallback(
    (targetColor?: string) => {
      const alpha = "rgba(0, 0, 0, 0)";
      const c1 = `rgb(${mode ? "0, 0, 0" : "255, 255, 255"})`;
      const c2 = targetColor || tokens.backgroundColor || randomColor();

      document.body.style.setProperty("--body-gradient-color", c2);
      document.body.style.backgroundColor = c1;
      document.body.style.backgroundImage = `linear-gradient(to bottom, ${alpha}, var(--body-gradient-color))`;
      document.body.style.backgroundBlendMode = "normal";
    },
    [mode, tokens.backgroundColor]
  );

  const applyColors = useCallback(() => {
    document.querySelectorAll<HTMLElement>(".border-box").forEach((el) => {
      el.style.backgroundColor = tokens.backgroundColor || randomColor();
    });
    updateGradient();
  }, [updateGradient, tokens.backgroundColor]);

  useEffect(() => {
    setItem("mrly_mode", String(mode));
    document.body.classList.toggle("mrlymode", mode);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", mode ? "#000000" : "#ffffff");
    updateGradient();
  }, [mode, updateGradient]);

  useEffect(() => {
    setItem("mrly_font", String(font));
    document.body.classList.toggle("mrlyfont", font);
  }, [font]);

  useEffect(() => {
    setItem("mrly_mute", String(mute));
  }, [mute]);

  useEffect(() => {
    setItem(TOKENS_KEY, JSON.stringify(tokens));
    const target = document.body;
    target.style.setProperty("--border-width", `${tokens.borderWidth}px`);
    target.style.setProperty("--border-radius", `${tokens.borderRadius}px`);
    target.style.setProperty("--font-size", `${tokens.fontSize}px`);
    target.style.setProperty("--gap", `${tokens.gap}px`);
    target.style.setProperty("--padding", `${tokens.padding}px`);
    if (tokens.borderColor) target.style.setProperty("--border-color", tokens.borderColor);
    else target.style.removeProperty("--border-color");
    if (tokens.fontColor) target.style.setProperty("--font-color", tokens.fontColor);
    else target.style.removeProperty("--font-color");
    if (tokens.backgroundColor) target.style.setProperty("--background-color", tokens.backgroundColor);
    else target.style.removeProperty("--background-color");
    applyColors();
  }, [tokens, applyColors]);

  useEffect(() => {
    applyColors();
  }, [applyColors]);

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval>;
    if (disco) {
      const shuffle = () => {
        document.querySelectorAll<HTMLElement>(".border-box").forEach((el) => {
          el.style.backgroundColor = randomColor();
        });
        updateGradient(randomColor());
      };
      shuffle();
      intervalId = setInterval(shuffle, 1000 / 4);
    } else {
      applyColors();
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [disco, applyColors, updateGradient]);

  const toggleMode = () => setMode((prev) => !prev);
  const toggleFont = () => setFont((prev) => !prev);
  const toggleMute = () => setMute((prev) => !prev);
  const startDisco = () => setDisco(true);
  const stopDisco = () => setDisco(false);
  const refreshColors = () => applyColors();
  const setTokens = (patch: Partial<ThemeTokens>) => setTokensState((prev) => ({ ...prev, ...patch }));
  const resetTokens = () => {
    removeItem(TOKENS_KEY);
    setTokensState(THEME_DEFAULTS);
  };

  return (
    <ThemeContext.Provider
      value={{
        mode,
        font,
        disco,
        mute,
        tokens,
        toggleMode,
        toggleFont,
        toggleMute,
        startDisco,
        stopDisco,
        refreshColors,
        setTokens,
        resetTokens,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};
