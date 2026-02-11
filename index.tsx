import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ASSETS } from './content/assets';

// --- CENTRALIZED ASSET LOADING ---
// Inject Fonts dynamically so all links are managed in content/assets.ts
const loadFonts = () => {
    // 1. Preconnect to Google Fonts
    const preconnect1 = document.createElement('link');
    preconnect1.rel = 'preconnect';
    preconnect1.href = ASSETS.FONTS.GOOGLE_PRECONNECT;
    document.head.appendChild(preconnect1);

    // 2. Preconnect to GStatic
    const preconnect2 = document.createElement('link');
    preconnect2.rel = 'preconnect';
    preconnect2.href = ASSETS.FONTS.GSTATIC_PRECONNECT;
    preconnect2.crossOrigin = 'anonymous';
    document.head.appendChild(preconnect2);

    // 3. Load Main Font
    const fontLink = document.createElement('link');
    fontLink.rel = 'stylesheet';
    fontLink.href = ASSETS.FONTS.MAIN_FONT;
    document.head.appendChild(fontLink);
};

loadFonts();
// --------------------------------

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);