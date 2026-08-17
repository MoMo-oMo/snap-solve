<template>
  <button
    class="tour-trigger"
    @click="open"
    aria-label="Show quick tour"
    title="Quick tour"
  >
    <ion-icon :icon="helpOutline"></ion-icon>
  </button>

  <div v-if="isOpen" class="tour-overlay" @click.self="close">
    <div class="tour-card glass-card">
      <button class="tour-close" @click="close" aria-label="Close tour">
        <ion-icon :icon="closeOutline"></ion-icon>
      </button>

      <p class="tour-eyebrow">Quick Tour · {{ stepIndex + 1 }}/{{ steps.length }}</p>

      <div class="tour-header">
        <div class="tour-icon-wrap">
          <ion-icon :icon="currentStep.icon" class="tour-icon"></ion-icon>
        </div>
        <h3 class="tour-title">{{ currentStep.title }}</h3>
      </div>

      <p class="tour-text">{{ currentStep.text }}</p>

      <div class="tour-dots">
        <span
          v-for="(step, i) in steps"
          :key="step.title"
          class="tour-dot"
          :class="{ 'tour-dot-active': i === stepIndex }"
        />
      </div>

      <div class="tour-actions">
        <button class="tour-skip" @click="close">Skip</button>
        <div class="tour-actions-right">
          <button v-if="stepIndex > 0" class="tour-back" @click="stepIndex--">Back</button>
          <button class="tour-next" @click="next">{{ isLastStep ? 'Got it' : 'Next' }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { IonIcon } from '@ionic/vue';
import {
  helpOutline,
  closeOutline,
  cameraOutline,
  sparklesOutline,
  checkmarkCircleOutline,
  contrastOutline,
} from 'ionicons/icons';

const STORAGE_KEY = 'snapsolve-tour-seen';

const steps = [
  {
    icon: cameraOutline,
    title: 'Scan a Problem',
    text: "Point your camera at any math problem, or tap \"type it in\" to enter it by hand. Either way you'll get a step-by-step solution.",
  },
  {
    icon: sparklesOutline,
    title: 'Two ways to read it',
    text: 'On-device OCR works instantly and fully offline. For messy handwriting or diagrams, an optional AI-powered read kicks in automatically when configured — it never blocks you if it\'s not.',
  },
  {
    icon: checkmarkCircleOutline,
    title: 'Check My Work',
    text: "Already solved it yourself? Snap a photo of your answer from the home screen and SnapSolve tells you if you're right — no need to redo the problem.",
  },
  {
    icon: contrastOutline,
    title: 'Light & Dark',
    text: 'Tap the sun/moon icon in the top corner anytime to switch themes — your choice is remembered next time you visit.',
  },
];

const isOpen = ref(false);
const stepIndex = ref(0);

const currentStep = computed(() => steps[stepIndex.value]);
const isLastStep = computed(() => stepIndex.value === steps.length - 1);

function open() {
  stepIndex.value = 0;
  isOpen.value = true;
}

function close() {
  isOpen.value = false;
  localStorage.setItem(STORAGE_KEY, 'true');
}

function next() {
  if (isLastStep.value) {
    close();
  } else {
    stepIndex.value++;
  }
}

onMounted(() => {
  if (!localStorage.getItem(STORAGE_KEY)) {
    setTimeout(open, 900);
  }
});
</script>

<style scoped>
.tour-trigger {
  position: fixed;
  bottom: calc(16px + env(safe-area-inset-bottom, 0px));
  right: 16px;
  z-index: 500;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  color: var(--ion-color-primary);
  cursor: pointer;
  padding: 0;
  -webkit-tap-highlight-color: transparent;
  box-shadow: var(--glass-shadow);
}
.tour-trigger ion-icon {
  font-size: 1.15rem;
}

.tour-overlay {
  position: fixed;
  inset: 0;
  z-index: 900;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(2px);
}

.tour-card {
  position: relative;
  width: 100%;
  max-width: 360px;
  padding: 1.5rem;
}

.tour-close {
  position: absolute;
  top: 0.9rem;
  right: 0.9rem;
  background: none;
  border: none;
  color: var(--ion-color-medium);
  font-size: 1.2rem;
  cursor: pointer;
  padding: 0;
  line-height: 1;
}

.tour-eyebrow {
  margin: 0 0 0.6rem;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--ion-color-primary);
  opacity: 0.75;
}

.tour-header {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  margin-bottom: 0.85rem;
}

.tour-icon-wrap {
  flex-shrink: 0;
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--ion-color-primary-tint);
  color: var(--ion-color-primary);
}
.tour-icon {
  font-size: 1.3rem;
}

.tour-title {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--ion-text-color);
}

.tour-text {
  margin: 0 0 1.1rem;
  font-size: 0.88rem;
  line-height: 1.5;
  color: var(--ion-color-secondary);
}

.tour-dots {
  display: flex;
  gap: 0.4rem;
  margin-bottom: 1.1rem;
}
.tour-dot {
  height: 6px;
  width: 6px;
  border-radius: 999px;
  background: var(--ion-color-step-100);
  transition: all 0.25s ease;
}
.tour-dot-active {
  width: 22px;
  background: var(--ion-color-primary);
}

.tour-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.tour-skip {
  background: none;
  border: none;
  color: var(--ion-color-medium);
  font-size: 0.82rem;
  cursor: pointer;
  padding: 0;
}

.tour-actions-right {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.tour-back {
  background: none;
  border: 1px solid var(--ion-color-primary-border);
  color: var(--ion-color-primary);
  font-size: 0.82rem;
  font-weight: 600;
  padding: 0.5rem 0.9rem;
  border-radius: 10px;
  cursor: pointer;
}

.tour-next {
  background: var(--ion-color-primary);
  color: var(--ion-color-primary-contrast);
  border: none;
  font-size: 0.82rem;
  font-weight: 700;
  padding: 0.55rem 1.1rem;
  border-radius: 10px;
  cursor: pointer;
}
</style>
