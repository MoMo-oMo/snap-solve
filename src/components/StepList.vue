<template>
  <div v-if="steps.length" class="glass-card step-list-card">
    <div class="step-list-header">
      <span class="step-list-chip">Step-by-Step Solution</span>
    </div>
    <div class="steps">
      <div v-for="(step, index) in steps" :key="`${index}-${step}`" class="step-item">
        <div class="step-number">{{ index + 1 }}</div>
        <p class="step-text">{{ step }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{ steps?: string[] }>(),
  { steps: () => [] },
);
</script>

<style scoped>
.step-list-card {
  padding: 1.25rem 1.4rem;
  margin-bottom: 1rem;
}
.step-list-header {
  margin-bottom: 1rem;
}
.step-list-chip {
  display: inline-block;
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  color: var(--ion-color-secondary, #46454A);
  background: var(--ion-color-step-50);
  border: 1px solid var(--ion-color-step-100);
  border-radius: 999px;
  padding: 0.2rem 0.75rem;
}

.steps {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}
.step-item {
  display: flex;
  align-items: flex-start;
  gap: 0.9rem;
}
.step-number {
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: linear-gradient(135deg, #FF3B4C, #B91C2C);
  color: #ffffff;
  font-size: 0.78rem;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 3px 10px rgba(255, 59, 76, 0.3);
  margin-top: 0.05rem;
}
.step-text {
  flex: 1;
  font-size: 0.92rem;
  line-height: 1.6;
  color: var(--ion-text-color);
  margin: 0;
  opacity: 0.9;
}
</style>
