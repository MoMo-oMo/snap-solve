<template>
  <ion-page>
    <ion-header class="ion-no-border">
      <ion-toolbar class="glass-toolbar">
        <ion-buttons slot="start">
          <ion-back-button default-href="/home" color="primary"></ion-back-button>
        </ion-buttons>
        <ion-title class="toolbar-title">Solve</ion-title>
        <ion-buttons slot="end">
          <theme-toggle />
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="solve-content ion-padding">

      <!-- ── Stage: idle ──────────────────────────────────────────── -->
      <template v-if="stage === 'idle'">
        <div class="glass-card camera-cta" @click="openCamera">
          <div class="cta-icon-wrap">
            <ion-icon :icon="cameraOutline" class="cta-icon"></ion-icon>
          </div>
          <div>
            <p class="cta-title">Snap a Problem</p>
            <p class="cta-desc">Take a photo or upload from gallery</p>
          </div>
        </div>

        <div class="divider-row">
          <span class="divider-line"></span>
          <span class="divider-label">or type it in</span>
          <span class="divider-line"></span>
        </div>

        <div class="glass-card input-card">
          <div class="input-label">
            <ion-icon :icon="createOutline" class="label-icon"></ion-icon>
            <span>Enter a problem</span>
          </div>
          <div class="input-wrap">
            <ion-input
              v-model="manualProblem"
              placeholder="e.g.  2x + 5 = 15"
              :clear-input="true"
              @keyup.enter="solveManually"
              class="math-input"
            ></ion-input>
          </div>
          <topic-selector v-model="topicHint" />
          <ion-button
            expand="block"
            class="primary-btn"
            :disabled="!manualProblem.trim()"
            @click="solveManually"
          >
            Solve
            <ion-icon slot="end" :icon="arrowForwardOutline"></ion-icon>
          </ion-button>
        </div>

        <div class="hint-card glass-card">
          <p class="hint-text">
            Try: <span class="hint-example">x^2 - 5x + 6 = 0</span> •
            <span class="hint-example">area of circle r=5</span> •
            <span class="hint-example">d/dx x^3</span>
          </p>
        </div>
      </template>

      <!-- ── Stage: camera ─────────────────────────────────────────── -->
      <template v-else-if="stage === 'camera'">
        <button class="text-btn back-btn" @click="stage = 'idle'">
          <ion-icon :icon="arrowBackOutline"></ion-icon>
          Back
        </button>
        <camera-capture @photo="handlePhoto" />
      </template>

      <!-- ── Stage: scanning ─────────────────────────────────────── -->
      <template v-else-if="stage === 'scanning'">
        <div class="center-stage">
          <div class="load-icon-wrap">
            <ion-icon :icon="scanOutline" class="load-icon"></ion-icon>
          </div>
          <ion-spinner name="dots" color="primary"></ion-spinner>
          <p class="stage-label">Reading your problem...</p>
        </div>
      </template>

      <!-- ── Stage: confirming ───────────────────────────────────── -->
      <template v-else-if="stage === 'confirming'">
        <div class="glass-card section-card">
          <div class="section-chip">Step 1 of 2</div>
          <h3 class="section-title">Does this look right?</h3>
          <p class="section-hint">Edit anything that looks off, then tap Solve.</p>
          <div class="input-wrap">
            <ion-textarea
              v-model="editableProblem"
              :auto-grow="true"
              placeholder="e.g.  2x + 5 = 15"
              class="math-input"
            ></ion-textarea>
          </div>
          <topic-selector v-model="topicHint" />
        </div>

        <ion-button
          expand="block"
          class="primary-btn"
          :disabled="!editableProblem.trim()"
          @click="confirmAndSolve"
        >
          Solve it
          <ion-icon slot="end" :icon="arrowForwardOutline"></ion-icon>
        </ion-button>
        <button class="text-btn" @click="reset">
          <ion-icon :icon="refreshOutline"></ion-icon>
          Take another photo
        </button>
      </template>

      <!-- ── Stage: solving ──────────────────────────────────────── -->
      <template v-else-if="stage === 'solving'">
        <div class="center-stage">
          <div class="load-icon-wrap">
            <ion-icon :icon="flashOutline" class="load-icon"></ion-icon>
          </div>
          <ion-spinner name="dots" color="primary"></ion-spinner>
          <p class="stage-label">Solving...</p>
        </div>
      </template>

      <!-- ── Stage: done ─────────────────────────────────────────── -->
      <template v-else-if="stage === 'done' && solution">
        <div class="glass-card section-card">
          <div class="section-chip">Problem</div>
          <math-renderer :content="solution.problem" auto-latex />
        </div>

        <div class="glass-card section-card">
          <div class="section-chip topic-chip">{{ solution.topic }}</div>
          <h3 class="section-title">Approach</h3>
          <p class="body-text">{{ solution.explanation }}</p>
        </div>

        <step-list v-if="solution.steps.length" :steps="solution.steps" />

        <div class="glass-card answer-card">
          <div class="answer-label">
            <ion-icon :icon="sparklesOutline" class="answer-icon"></ion-icon>
            Final Answer
          </div>
          <math-renderer :content="solution.finalAnswer" auto-latex />
        </div>

        <ion-button expand="block" class="outline-btn" @click="reset">
          Solve another problem
        </ion-button>
      </template>

      <!-- ── Error ───────────────────────────────────────────────── -->
      <div v-if="errorMessage && stage === 'idle'" class="glass-card error-card">
        <div class="error-header">
          <ion-icon :icon="alertCircleOutline" class="error-icon"></ion-icon>
          <span>Could not solve</span>
        </div>
        <p class="error-text" style="white-space: pre-line;">{{ errorMessage }}</p>
        <button class="text-btn" @click="errorMessage = ''">
          <ion-icon :icon="refreshOutline"></ion-icon>
          Dismiss
        </button>
      </div>

    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import {
  IonBackButton, IonButton, IonButtons, IonContent, IonHeader, IonIcon,
  IonPage, IonTitle, IonToolbar, IonInput, IonSpinner, IonTextarea,
} from '@ionic/vue';
import {
  cameraOutline, createOutline, arrowForwardOutline, arrowBackOutline,
  scanOutline, flashOutline, sparklesOutline, alertCircleOutline, refreshOutline,
} from 'ionicons/icons';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';
import MathRenderer from '@/components/MathRenderer.vue';
import StepList from '@/components/StepList.vue';
import CameraCapture from '@/components/CameraCapture.vue';
import ThemeToggle from '@/components/ThemeToggle.vue';
import TopicSelector from '@/components/TopicSelector.vue';
import { detectMath } from '@/services/ocrService';
import { solveProblem, type SolveResult, type TopicHint } from '@/services/mathSolver';

type Stage = 'idle' | 'camera' | 'scanning' | 'confirming' | 'solving' | 'done';

const stage = ref<Stage>('idle');
const errorMessage = ref('');
const manualProblem = ref('');
const editableProblem = ref('');
const solution = ref<SolveResult | null>(null);
const topicHint = ref<TopicHint>('auto');

function reset(): void {
  stage.value = 'idle';
  errorMessage.value = '';
  manualProblem.value = '';
  editableProblem.value = '';
  solution.value = null;
  topicHint.value = 'auto';
}

function openCamera(): void {
  errorMessage.value = '';
  if (Capacitor.isNativePlatform()) {
    captureNative();
  } else {
    stage.value = 'camera';
  }
}

async function captureNative(): Promise<void> {
  try {
    const photo = await Camera.getPhoto({
      quality: 90,
      source: CameraSource.Camera,
      resultType: CameraResultType.Base64,
      correctOrientation: true,
    });
    if (photo.base64String) await handlePhoto(photo.base64String);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : '';
    if (!msg.toLowerCase().includes('cancel')) {
      errorMessage.value = 'Could not access camera. Try typing the problem instead.';
    }
  }
}

async function handlePhoto(rawBase64: string): Promise<void> {
  stage.value = 'scanning';
  errorMessage.value = '';
  try {
    const detected = await detectMath(rawBase64);
    const trimmed = detected.trim();
    if (!trimmed) {
      errorMessage.value = 'No text detected in the photo. Try a clearer image or type the problem below.';
      stage.value = 'idle';
      return;
    }
    editableProblem.value = trimmed;
    stage.value = 'confirming';
  } catch {
    errorMessage.value = 'Could not scan the image. Try typing the problem instead.';
    stage.value = 'idle';
  }
}

function confirmAndSolve(): void {
  runSolver(editableProblem.value.trim());
}

function solveManually(): void {
  if (!manualProblem.value.trim()) return;
  runSolver(manualProblem.value.trim());
}

function runSolver(problem: string): void {
  stage.value = 'solving';
  errorMessage.value = '';
  setTimeout(() => {
    try {
      solution.value = solveProblem(problem, topicHint.value);
      stage.value = 'done';
    } catch (error: unknown) {
      errorMessage.value = error instanceof Error ? error.message : 'Could not solve this problem.';
      stage.value = 'idle';
    }
  }, 50);
}
</script>

<style scoped>
.solve-content {
  --background: var(--app-gradient);
}

.glass-toolbar {
  --background: var(--toolbar-glass-bg);
  --border-color: var(--ion-toolbar-border-color);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
}
.toolbar-title {
  font-weight: 700;
  font-size: 1rem;
  letter-spacing: 0.1px;
}

/* Camera CTA */
.camera-cta {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.15rem 1.25rem;
  margin-bottom: 1rem;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: transform 0.18s ease, opacity 0.18s ease;
}
.camera-cta:active { transform: scale(0.972); opacity: 0.85; }
.cta-icon-wrap {
  flex-shrink: 0;
  width: 46px;
  height: 46px;
  border-radius: 14px;
  background: var(--ion-color-primary-tint);
  display: flex;
  align-items: center;
  justify-content: center;
}
.cta-icon { font-size: 1.5rem; color: var(--ion-color-primary); }
.cta-title {
  font-size: 0.98rem;
  font-weight: 700;
  color: var(--ion-text-color);
  margin: 0 0 0.2rem;
}
.cta-desc {
  font-size: 0.8rem;
  color: var(--ion-color-medium);
  margin: 0;
}

/* Camera stage */
.back-btn {
  margin-bottom: 0.75rem;
}

/* Hint card */
.hint-card {
  padding: 0.85rem 1.25rem;
  margin-top: 0.25rem;
}
.hint-text {
  margin: 0;
  font-size: 0.78rem;
  color: var(--ion-color-medium);
  opacity: 0.7;
  line-height: 1.6;
  text-align: center;
}
.hint-example {
  color: var(--ion-color-primary);
  opacity: 1;
  font-weight: 600;
}

/* Divider */
.divider-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin: 0.25rem 0 1rem;
}
.divider-line { flex: 1; height: 1px; background: var(--ion-color-step-100); }
.divider-label {
  font-size: 0.78rem;
  color: var(--ion-color-medium);
  font-weight: 500;
  white-space: nowrap;
  opacity: 0.7;
}

/* Input card */
.input-card { padding: 1.2rem 1.25rem; margin-bottom: 0.75rem; }
.input-label {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--ion-color-medium);
  margin-bottom: 0.7rem;
  letter-spacing: 0.2px;
}
.label-icon { font-size: 0.9rem; }

/* Section cards */
.section-card { padding: 1.2rem 1.25rem; margin-bottom: 0.85rem; }
.section-chip {
  display: inline-block;
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  color: var(--ion-color-primary);
  background: var(--ion-color-primary-tint);
  border: 1px solid var(--ion-color-primary-border);
  border-radius: 999px;
  padding: 0.18rem 0.7rem;
  margin-bottom: 0.7rem;
}
.topic-chip {
  color: var(--ion-color-secondary);
  background: var(--ion-color-step-50);
  border-color: var(--ion-color-step-100);
}
.section-title { font-size: 1rem; font-weight: 700; color: var(--ion-text-color); margin: 0 0 0.35rem; }
.section-hint { font-size: 0.82rem; color: var(--ion-color-medium); margin: 0 0 0.85rem; opacity: 0.8; }
.body-text { font-size: 0.9rem; line-height: 1.65; color: var(--ion-text-color); margin: 0; opacity: 0.8; }

/* Input wrapper */
.input-wrap {
  background: var(--input-bg);
  border: 1px solid var(--input-border);
  border-radius: 12px;
  overflow: hidden;
  margin-bottom: 0.9rem;
}
.math-input {
  --background: transparent;
  --color: var(--ion-text-color);
  --padding-start: 14px;
  --padding-end: 14px;
  --padding-top: 11px;
  --padding-bottom: 11px;
  --placeholder-color: var(--ion-color-medium);
  --placeholder-opacity: 0.5;
  font-size: 0.95rem;
  font-family: 'Montserrat', monospace;
}

/* Buttons */
.primary-btn {
  --background: linear-gradient(135deg, #FF3B4C, #B91C2C);
  --background-activated: linear-gradient(135deg, #e02f40, #9c1725);
  --color: #ffffff;
  --border-radius: 14px;
  --box-shadow: 0 4px 20px rgba(255, 59, 76, 0.35);
  font-weight: 700;
  font-size: 0.92rem;
  letter-spacing: 0.2px;
  margin-bottom: 0.5rem;
}
.outline-btn {
  --background: transparent;
  --color: var(--ion-color-primary);
  --border-radius: 14px;
  --border-color: var(--ion-color-primary-border);
  --border-width: 1px;
  --border-style: solid;
  --box-shadow: none;
  font-weight: 600;
  font-size: 0.92rem;
  margin-bottom: 0.5rem;
}
.text-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  width: 100%;
  background: none;
  border: none;
  color: var(--ion-color-medium);
  font-size: 0.85rem;
  font-weight: 500;
  padding: 0.6rem 0;
  cursor: pointer;
  opacity: 0.7;
  font-family: 'Montserrat', sans-serif;
  -webkit-tap-highlight-color: transparent;
}

/* Loading */
.center-stage {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 5rem 0;
  gap: 0.85rem;
}
.load-icon-wrap {
  width: 64px;
  height: 64px;
  border-radius: 20px;
  background: var(--ion-color-primary-tint);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 0.25rem;
}
.load-icon {
  font-size: 2rem;
  color: var(--ion-color-primary);
  animation: iconPulse 1.6s ease-in-out infinite;
}
@keyframes iconPulse {
  0%, 100% { transform: scale(1); opacity: 0.7; }
  50%       { transform: scale(1.15); opacity: 1; }
}
.stage-label { color: var(--ion-color-medium); font-size: 0.88rem; font-weight: 500; opacity: 0.8; }

/* Answer card */
.answer-card {
  padding: 1.25rem;
  margin-bottom: 0.85rem;
  border-color: var(--ion-color-primary-border);
  background: var(--ion-color-primary-tint);
}
.answer-label {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--ion-color-primary);
  text-transform: uppercase;
  letter-spacing: 0.8px;
  margin-bottom: 0.6rem;
}
.answer-icon { font-size: 0.85rem; }

/* Error card */
.error-card {
  padding: 1.2rem 1.25rem;
  border-color: var(--ion-color-danger-border);
  background: var(--ion-color-danger-tint);
  margin-top: 0.5rem;
}
.error-header {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--ion-color-danger);
  margin-bottom: 0.4rem;
}
.error-icon { font-size: 1.1rem; }
.error-text {
  margin: 0 0 0.5rem;
  color: var(--ion-text-color);
  font-size: 0.87rem;
  line-height: 1.55;
  opacity: 0.75;
}
</style>
