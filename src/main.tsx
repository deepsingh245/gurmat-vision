import React from 'react';
import ReactDOM from 'react-dom/client';
import { Capacitor } from '@capacitor/core';
import App from './App';
import './index.css';
import './i18n';

if (Capacitor.isNativePlatform()) {
  document.documentElement.classList.add('is-native');
  document.addEventListener('touchstart', () => {}, { passive: true });
}

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error("Could not find root element to mount to");

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
