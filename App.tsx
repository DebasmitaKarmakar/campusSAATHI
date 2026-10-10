import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { Login } from './components/Login';
import { Dashboard } from './components/Dashboard';
import { User, AuthState } from './types';
import { dbService } from './services/dbService';
import { revokeDeviceTrust } from './services/authService';

const SESSION_KEY = 'cw_session';

const App: React.FC = () => {
  useEffect(() => {
    dbService.init();
  }, []);

  const [authState, setAuthState] = useState<AuthState>(() => {
    try {
      const saved = sessionStorage.getItem(SESSION_KEY);
      if (saved) {
        return { user: JSON.parse(saved), isAuthenticated: true };
      }
    } catch {
      // corrupted session
    }
    return { user: null, isAuthenticated: false };
  });

  // Cross-tab session sync
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === SESSION_KEY && !e.newValue) {
        setAuthState({ user: null, isAuthenticated: false });
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const handleLoginSuccess = (user: User) => {
    setAuthState({ user, isAuthenticated: true });
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(user));
  };

  const handleUpdateUser = (updatedUser: User) => {
    setAuthState(prev => ({ ...prev, user: updatedUser }));
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(updatedUser));
  };

  const handleLogout = () => {
    if (authState.user) {
      // Session-only logout: keep device trust intact
      sessionStorage.removeItem(SESSION_KEY);
    }
    setAuthState({ user: null, isAuthenticated: false });
  };

  return (
    <Layout>
      {authState.isAuthenticated && authState.user ? (
        <Dashboard
          user={authState.user}
          onLogout={handleLogout}
          onUpdateUser={handleUpdateUser}
        />
      ) : (
        <Login onLoginSuccess={handleLoginSuccess} />
      )}
    </Layout>
  );
};

export default App;
