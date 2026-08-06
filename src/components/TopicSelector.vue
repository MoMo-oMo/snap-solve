<template>
  <div class="topic-selector">
    <button
      v-for="option in TOPIC_HINTS"
      :key="option.value"
      type="button"
      class="topic-pill"
      :class="{ active: modelValue === option.value }"
      @click="$emit('update:modelValue', option.value)"
    >
      {{ option.label }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { TOPIC_HINTS, type TopicHint } from '@/services/mathSolver';

defineProps<{ modelValue: TopicHint }>();
defineEmits<{ (event: 'update:modelValue', value: TopicHint): void }>();
</script>

<style scoped>
.topic-selector {
  display: flex;
  gap: 0.5rem;
  overflow-x: auto;
  padding-bottom: 0.15rem;
  margin-bottom: 0.9rem;
  scrollbar-width: none;
}
.topic-selector::-webkit-scrollbar { display: none; }

.topic-pill {
  flex-shrink: 0;
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--ion-color-medium);
  background: var(--ion-color-step-50);
  border: 1px solid var(--glass-border);
  border-radius: 999px;
  padding: 0.4rem 0.85rem;
  cursor: pointer;
  appearance: none;
  -webkit-appearance: none;
  -webkit-tap-highlight-color: transparent;
  font-family: 'Montserrat', sans-serif;
  transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease;
}
.topic-pill.active {
  color: var(--ion-color-primary-contrast);
  background: var(--ion-color-primary);
  border-color: var(--ion-color-primary);
}
</style>
