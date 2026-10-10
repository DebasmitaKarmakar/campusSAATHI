import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { dbService } from './services/dbService';

// Initialize the database schema and seed data
dbService.init();

const mountApp = () => {
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    // If not found immediately, wait for DOM content to be fully ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', mountApp);
      return;
    }
    throw new Error("Could not find root element to mount to. Ensure <div id='root'></div> exists in index.html");
  }

  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
};

mountApp();