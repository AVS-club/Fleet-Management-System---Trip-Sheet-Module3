import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./styles/mobile-dashboard.css";
import "./styles/navigation-mobile.css";
import "./styles/mobile.css";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./utils/themeContext";
import { OrganizationProvider } from "./contexts/OrganizationContext";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import config from "./utils/env";

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      // Add shorter staleTime to improve performance on mobile
      staleTime: 60 * 1000, // 1 minute
      // Add mobile-friendly cacheTime
      gcTime: 5 * 60 * 1000, // 5 minutes
    },
    mutations: {
      // Add shorter retry delays for mobile connections
      retry: (failureCount, _error) => {
        if (failureCount > 3) return false;
        return true;
      },
      retryDelay: 1000, // 1 second between retries
    },
  },
});

// Add global error handlers for debugging
window.onerror = (message, source, lineno, colno, error) => {
  console.error('Global error:', { message, source, lineno, colno, error });
};

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
});

const rootElement = document.getElementById("root")!;
const root = createRoot(rootElement);

// Render app directly without complex loading pattern
root.render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <OrganizationProvider>
          <ErrorBoundary>
            <App />
          </ErrorBoundary>
        </OrganizationProvider>
      </ThemeProvider>
      {config.isDev && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  </StrictMode>
);
