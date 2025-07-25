import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import ErrorBoundary from "./components/ErrorBoundary";
import LoadingScreen from "./components/LoadingScreen";
import { ThemeProvider } from "./utils/themeContext";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

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
      retry: (failureCount, error) => {
        if (failureCount > 3) return false;
        return true;
      },
      retryDelay: 1000, // 1 second between retries
    },
  },
});

const rootElement = document.getElementById("root")!;
const root = createRoot(rootElement);

// Show loading screen first
root.render(
  <StrictMode>
    <ThemeProvider>
      <LoadingScreen isLoading={true} />
    </ThemeProvider>
  </StrictMode>
);

// Then render the app with error boundary after a delay
setTimeout(() => {
  root.render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <ErrorBoundary>
            <LoadingScreen isLoading={false} />
            <App />
          </ErrorBoundary>
        </ThemeProvider>
        {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
      </QueryClientProvider>
    </StrictMode>
  );
}, 1500); // Show loader for 1.5 seconds
