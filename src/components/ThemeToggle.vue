<template>
  <button class="theme-toggle" :aria-label="theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'" @click="toggleTheme">
    <ion-icon :icon="theme === 'dark' ? sunnyOutline : moonOutline" class="theme-toggle-icon"></ion-icon>
  </button>
</template>

<script setup lang="ts">
import { IonIcon } from '@ionic/vue';
import { sunnyOutline, moonOutline } from 'ionicons/icons';
import { useTheme } from '@/composables/useTheme';

const { theme, toggleTheme } = useTheme();
</script>

<style scoped>
.theme-toggle {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  color: var(--ion-text-color);
  cursor: pointer;
  padding: 0;
  -webkit-tap-highlight-color: transparent;
  transition: transform 0.15s ease, opacity 0.15s ease;
}
.theme-toggle:active { transform: scale(0.9); opacity: 0.8; }
.theme-toggle-icon { font-size: 1.1rem; }
</style>
