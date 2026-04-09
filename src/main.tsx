import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(err => {
      console.log('Service worker registration failed: ', err);
    });
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
