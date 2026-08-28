import { useEffect, Suspense } from "react";
import { ThemeProvider, useTheme } from "./contexts/ThemeContext";
import { SettingsProvider } from "./contexts/SettingsContext";
import { HeaderProvider } from "./contexts/HeaderContext";
import { RouterProvider, useRouter } from "./router";
import { isFullscreen, getComponentName, APP_COMPONENTS } from "./registry";
import { Header } from "./components/Header";
import { Home } from "./components/Home";
import { ContainerBox, ListBox } from "./components/System";
import { Skeleton } from "./components/Skeleton";

function MrlyMain() {
  const { currentView, navigate } = useRouter();
  const { refreshColors } = useTheme();

  useEffect(() => {
    const timer = setTimeout(() => refreshColors(), 10);
    return () => clearTimeout(timer);
  }, [currentView, refreshColors]);

  const componentName = getComponentName(currentView);
  const AppComponent = APP_COMPONENTS[componentName];

  if (isFullscreen(currentView)) {
    return (
      <Suspense fallback={null}>
        <AppComponent onWake={() => navigate("home")} />
      </Suspense>
    );
  }

  return (
    <ContainerBox>
      <ListBox>
        <Header />
        <Suspense fallback={<Skeleton />}>
          <main>{AppComponent ? <AppComponent /> : <Home />}</main>
        </Suspense>
      </ListBox>
    </ContainerBox>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <SettingsProvider>
        <RouterProvider>
          <HeaderProvider>
            <MrlyMain />
          </HeaderProvider>
        </RouterProvider>
      </SettingsProvider>
    </ThemeProvider>
  );
}
