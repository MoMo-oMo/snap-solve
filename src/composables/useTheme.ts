import { ref, watchEffect } from 'vue';

type Theme = 'light' | 'dark';

const STORAGE_KEY = 'snapsolve-theme';

function getInitialTheme(): Theme {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'light' || stored === 'dark') return stored;
  // Default to light regardless of system preference — user can still
  // toggle to dark manually, and that choice is remembered from then on.
  return 'light';
}

const theme = ref<Theme>(getInitialTheme());

watchEffect(() => {
  document.documentElement.setAttribute('data-theme', theme.value);
  localStorage.setItem(STORAGE_KEY, theme.value);
});

export function useTheme() {
  function toggleTheme(): void {
    theme.value = theme.value === 'light' ? 'dark' : 'light';
  }

  return { theme, toggleTheme };
}
