import { createContext, useContext, useState, useEffect, type ReactNode, useCallback } from "react";

interface HeaderConfig {
  text?: string;
}

interface HeaderContextType {
  config: HeaderConfig;
  setConfig: (config: HeaderConfig) => void;
}

const HeaderContext = createContext<HeaderContextType | undefined>(undefined);

export function useHeader(config: HeaderConfig) {
  const ctx = useContext(HeaderContext);
  if (!ctx) throw new Error("useHeader must be used within a HeaderProvider");
  const { setConfig } = ctx;
  const { text } = config;
  useEffect(() => {
    setConfig({ text });
    return () => setConfig({});
  }, [text, setConfig]);
}

export function useHeaderConfig() {
  const ctx = useContext(HeaderContext);
  if (!ctx) throw new Error("useHeaderConfig must be used within a HeaderProvider");
  return ctx.config;
}

export function HeaderProvider({ children }: { children: ReactNode }) {
  const [config, setConfigState] = useState<HeaderConfig>({});
  const setConfig = useCallback((c: HeaderConfig) => setConfigState(c), []);
  return <HeaderContext.Provider value={{ config, setConfig }}>{children}</HeaderContext.Provider>;
}
