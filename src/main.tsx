import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // Add a small delay to ensure SW registration doesn't compete with initial asset loading
    setTimeout(() => {
      navigator.serviceWorker.register('/sw.js')
        .then(registration => {
          // Check for updates
          registration.onupdatefound = () => {
            const installingWorker = registration.installing;
            if (installingWorker) {
              installingWorker.onstatechange = () => {
                if (installingWorker.state === 'installed') {
                  if (navigator.serviceWorker.controller) {
                    // New content is available; please refresh.
                    console.log('New content is available; please refresh.');
                  } else {
                    // Content is cached for offline use.
                    console.log('Content is cached for offline use.');
                  }
                }
              };
            }
          };
        })
        .catch(err => {
          console.log('Service worker registration failed: ', err);
        });
    }, 2000);
  });
}

// Global error handler for debugging production issues
window.onerror = function(message, source, lineno, colno, error) {
  console.error('Global error:', { message, source, lineno, colno, error });
  return false;
};

window.onunhandledrejection = function(event) {
  console.error('Unhandled promise rejection:', event.reason);
};

const rootElement = document.getElementById('root');
if (rootElement) {
  try {
    createRoot(rootElement).render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
  } catch (error) {
    console.error('Failed to render root:', error);
    rootElement.innerHTML = `
      <div style="padding: 20px; text-align: center; font-family: sans-serif;">
        <h1 style="color: #db2777;">Dalia Bakery</h1>
        <p>Maaf, terjadi kesalahan saat memuat aplikasi.</p>
        <button onclick="window.location.reload()" style="padding: 10px 20px; background: #db2777; color: white; border: none; rounded: 8px; cursor: pointer;">
          Muat Ulang Halaman
        </button>
      </div>
    `;
  }
}
