import React, { useState, useEffect } from 'react';

export const useDarkMode = () => {
  const [isDark, setIsDark] = React.useState<boolean>(() => {
    return localStorage.getItem('cw_theme') === 'dark';
  });

  React.useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
      localStorage.setItem('cw_theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('cw_theme', 'light');
    }
  }, [isDark]);

  return { isDark, toggle: () => setIsDark((p: boolean) => !p) };
};