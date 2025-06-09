import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import ErrorBoundary from './components/ErrorBoundary';
import LoadingScreen from './components/LoadingScreen';

const rootElement = document.getElementById('root')!;
const root = createRoot(rootElement);

// Show loading screen first
root.render(
  <StrictMode>
    <LoadingScreen isLoading={true} />
  </StrictMode>
);

// Then render the app with error boundary after a delay
setTimeout(() => {
  root.render(
    <StrictMode>
      <ErrorBoundary>
        <LoadingScreen isLoading={false} />
        <App />
      </ErrorBoundary>
    </StrictMode>
  );
}, 1500); // Show loader for 1.5 seconds