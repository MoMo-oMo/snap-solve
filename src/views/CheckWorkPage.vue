<template>
  <ion-page>
    <ion-header class="ion-no-border">
      <ion-toolbar class="glass-toolbar">
        <ion-buttons slot="start">
          <ion-back-button default-href="/home" color="primary" />
        </ion-buttons>
        <ion-title class="toolbar-title">Check Work</ion-title>
        <ion-buttons slot="end">
          <theme-toggle />
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="check-content ion-padding">

      <!-- ── Stage: idle ─────────────────────────────────────────── -->
      <template v-if="stage === 'idle'">
        <div v-if="!manualMode">

          <!-- Native mobile: use Capacitor Camera plugin -->
          <template v-if="isNative">
            <div class="glass-card native-camera-card">
              <div class="native-camera-icon-wrap">
                <ion-icon :icon="scanOutline" class="native-camera-icon"></ion-icon>
              </div>
              <p class="native-camera-title">Scan Your Work</p>
              <p class="native-camera-desc">Take a photo of the problem you want to check</p>
              <ion-button expand="block" class="primary-btn" @click="captureNative">
                <ion-icon slot="start" :icon="cameraOutline"></ion-icon>
                Take a Photo
              </ion-button>
              <button class="gallery-btn" @click="pickGalleryNative">
                <ion-icon :icon="imageOutline" class="gallery-icon"></ion-icon>
                Choose from Gallery
              </button>
            </div>
          </template>

          <!-- Web: embedded camera with live viewfinder -->
          <template v-else>
            <camera-capture @photo="handlePhoto" />
          </template>

          <button class="text-btn" @click="manualMode = true">
            <ion-icon :icon="createOutline"></ion-icon>
            Type problem instead
          </button>
        </div>

        <div v-else>
          <div class="glass-card section-card">
            <div class="section-chip">Manual Entry</div>
            <h3 class="section-title">What's the problem?</h3>
            <div class="input-wrap">
              <ion-textarea
                v-model="manualProblem"
                :auto-grow="true"
                placeholder="e.g.  2x + 5 = 15"
                class="math-input"
              ></ion-textarea>
            </div>
            <ion-button
              expand="block"
              class="primary-btn"
              :disabled="!manualProblem.trim()"
              @click="confirmManual"
            >
              Continue
              <ion-icon slot="end" :icon="arrowForwardOutline"></ion-icon>
            </ion-button>
          </div>
          <button class="text-btn" @click="manualMode = false">
            <ion-icon :icon="cameraOutline"></ion-icon>
            Use camera instead
          </button>
        </div>
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
          <p class="section-hint">Edit anything that looks off, then fill in your answer below.</p>
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

        <div class="glass-card section-card">
          <div class="section-chip">Step 2 of 2</div>
          <h3 class="section-title">Your answer</h3>
          <div class="input-wrap" style="margin-bottom: 0.75rem;">
            <ion-input
              v-model="studentAnswer"
              placeholder="e.g.  x = 5"
              class="math-input"
            ></ion-input>
          </div>
          <div class="input-wrap">
            <ion-textarea
              v-model="studentWork"
              :auto-grow="true"
              placeholder="Show your working (optional)"
              class="math-input"
            ></ion-textarea>
          </div>
        </div>

        <ion-button
          expand="block"
          class="primary-btn"
          :disabled="!editableProblem.trim() || !studentAnswer.trim()"
          @click="checkAnswer"
        >
          Check My Work
          <ion-icon slot="end" :icon="arrowForwardOutline"></ion-icon>
        </ion-button>
        <button class="text-btn" @click="reset">
          <ion-icon :icon="refreshOutline"></ion-icon>
          Start over
        </button>
      </template>

      <!-- ── Stage: checking ─────────────────────────────────────── -->
      <template v-else-if="stage === 'checking'">
        <div class="center-stage">
          <div class="load-icon-wrap">
            <ion-icon :icon="flashOutline" class="load-icon"></ion-icon>
          </div>
          <ion-spinner name="dots" color="primary"></ion-spinner>
          <p class="stage-label">Checking your work...</p>
        </div>
      </template>

      <!-- ── Stage: done ─────────────────────────────────────────── -->
      <template v-else-if="stage === 'done' && checkResult">
        <div class="glass-card section-card">
          <div class="section-chip">Problem</div>
          <math-renderer :content="checkResult.problem" />
        </div>

        <!-- Verdict -->
        <div
          class="glass-card verdict-card"
          :class="checkResult.isCorrect ? 'verdict-correct' : 'verdict-wrong'"
        >
          <div class="verdict-header">
            <div class="verdict-icon-wrap" :class="checkResult.isCorrect ? 'correct' : 'wrong'">
              <ion-icon
                :icon="checkResult.isCorrect ? trophyOutline : alertCircleOutline"
                class="verdict-icon"
              ></ion-icon>
            </div>
            <span class="verdict-label">{{ checkResult.isCorrect ? 'Correct!' : 'Not quite' }}</span>
          </div>
          <p class="feedback-text">{{ checkResult.feedback }}</p>

          <div v-if="!checkResult.isCorrect" class="answer-row">
            <span class="answer-meta">Your answer:</span>
            <span class="your-answer">{{ studentAnswer }}</span>
          </div>
          <div class="answer-row">
            <span class="answer-meta">Correct answer:</span>
            <math-renderer :content="checkResult.finalAnswer" class="correct-answer" />
          </div>
        </div>

        <!-- Always show steps so student can see exactly where they went wrong -->
        <step-list v-if="checkResult.steps.length" :steps="checkResult.steps" />

        <ion-button expand="block" class="outline-btn" @click="reset">
          Check another problem
        </ion-button>
      </template>

      <!-- ── Error ───────────────────────────────────────────────── -->
      <div v-if="errorMessage" class="glass-card error-card">
        <div class="error-header">
          <ion-icon :icon="alertCircleOutline" class="error-icon"></ion-icon>
          <span>Something went wrong</span>
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
  scanOutline, flashOutline, cameraOutline, createOutline, arrowForwardOutline,
  refreshOutline, trophyOutline, alertCircleOutline, imageOutline,
} from 'ionicons/icons';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';
import CameraCapture from '@/components/CameraCapture.vue';
import MathRenderer from '@/components/MathRenderer.vue';
import StepList from '@/components/StepList.vue';
import ThemeToggle from '@/components/ThemeToggle.vue';
import TopicSelector from '@/components/TopicSelector.vue';
import { detectMath } from '@/services/ocrService';
import { solveProblem, answersMatch, type SolveResult, type TopicHint } from '@/services/mathSolver';

type Stage = 'idle' | 'scanning' | 'confirming' | 'checking' | 'done';

interface CheckResult extends SolveResult {
  isCorrect: boolean;
  feedback: string;
}

const isNative = Capacitor.isNativePlatform();

const stage = ref<Stage>('idle');
const errorMessage = ref('');
const manualMode = ref(false);
const manualProblem = ref('');
const editableProblem = ref('');
const studentAnswer = ref('');
const studentWork = ref('');
const checkResult = ref<CheckResult | null>(null);
const topicHint = ref<TopicHint>('auto');

function reset(): void {
  stage.value = 'idle';
  errorMessage.value = '';
  manualMode.value = false;
  manualProblem.value = '';
  editableProblem.value = '';
  studentAnswer.value = '';
  studentWork.value = '';
  checkResult.value = null;
  topicHint.value = 'auto';
}

function confirmManual(): void {
  if (!manualProblem.value.trim()) return;
  editableProblem.value = manualProblem.value.trim();
  stage.value = 'confirming';
}

async function captureNative(): Promise<void> {
  errorMessage.value = '';
  try {
    const photo = await Camera.getPhoto({
      quality: 90,
      source: CameraSource.Camera,
      resultType: CameraResultType.Base64,
      correctOrientation: true,
    });
    if (photo.base64String) await handlePhoto(photo.base64String);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : '';
    if (!msg.toLowerCase().includes('cancel')) {
      errorMessage.value = 'Could not access camera. Try typing the problem instead.';
    }
  }
}

async function pickGalleryNative(): Promise<void> {
  errorMessage.value = '';
  try {
    const photo = await Camera.getPhoto({
      quality: 90,
      source: CameraSource.Photos,
      resultType: CameraResultType.Base64,
    });
    if (photo.base64String) await handlePhoto(photo.base64String);
  } catch { /* user cancelled */ }
}

async function handlePhoto(rawBase64: string): Promise<void> {
  stage.value = 'scanning';
  errorMessage.value = '';
  try {
    const detected = await detectMath(rawBase64);
    const trimmed = detected.trim();
    if (!trimmed) {
      errorMessage.value = 'No text detected. Try a clearer photo or type it instead.';
      stage.value = 'idle';
      return;
    }
    editableProblem.value = trimmed;
    stage.value = 'confirming';
  } catch {
    errorMessage.value = 'Could not scan the image. Try typing it instead.';
    stage.value = 'idle';
  }
}

function checkAnswer(): void {
  const problem = editableProblem.value.trim();
  const answer = studentAnswer.value.trim();
  if (!problem || !answer) return;

  stage.value = 'checking';
  errorMessage.value = '';

  setTimeout(() => {
    try {
      const solution = solveProblem(problem, topicHint.value);
      const isCorrect = answersMatch(answer, solution.finalAnswer);

      let feedback: string;
      if (isCorrect) {
        feedback = 'Great work! Your answer matches the correct solution. Follow the steps below to see the full working.';
      } else {
        feedback = `Your answer "${answer}" is incorrect. The correct answer is shown below. Compare the steps carefully to find where things went wrong.`;
      }

      checkResult.value = { ...solution, isCorrect, feedback };
      stage.value = 'done';
    } catch (error: unknown) {
      errorMessage.value = error instanceof Error ? error.message : 'Could not check this problem.';
      stage.value = 'confirming';
    }
  }, 50);
}
</script>

<style scoped>
.check-content {
  --background: var(--app-gradient);
}

.glass-toolbar {
  --background: var(--toolbar-glass-bg);
  --border-color: var(--ion-toolbar-border-color);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
}
.toolbar-title { font-weight: 700; font-size: 1rem; letter-spacing: 0.1px; }

/* Native camera card */
.native-camera-card {
  padding: 2rem 1.5rem;
  margin-bottom: 0.75rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 0.5rem;
}
.native-camera-icon-wrap {
  width: 72px;
  height: 72px;
  border-radius: 22px;
  background: var(--ion-color-primary-tint);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 0.5rem;
}
.native-camera-icon { font-size: 2.2rem; color: var(--ion-color-primary); }
.native-camera-title { font-size: 1.05rem; font-weight: 700; color: var(--ion-text-color); margin: 0; }
.native-camera-desc { font-size: 0.84rem; color: var(--ion-color-medium); margin: 0 0 0.75rem; opacity: 0.75; }
.gallery-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  width: 100%;
  background: var(--ion-color-step-50);
  border: 1px solid var(--ion-color-step-100);
  border-radius: 12px;
  color: var(--ion-color-medium);
  font-size: 0.88rem;
  font-weight: 600;
  padding: 0.85rem;
  cursor: pointer;
  font-family: 'Montserrat', sans-serif;
  margin-top: 0.35rem;
  -webkit-tap-highlight-color: transparent;
}
.gallery-icon { font-size: 1rem; }

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
.section-title { font-size: 1rem; font-weight: 700; color: var(--ion-text-color); margin: 0 0 0.35rem; }
.section-hint { font-size: 0.82rem; color: var(--ion-color-medium); margin: 0 0 0.85rem; opacity: 0.8; }

/* Inputs */
.input-wrap {
  background: var(--input-bg);
  border: 1px solid var(--input-border);
  border-radius: 12px;
  overflow: hidden;
  margin-bottom: 0.85rem;
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

/* Verdict card */
.verdict-card { padding: 1.25rem; margin-bottom: 0.85rem; }
.verdict-correct { background: var(--ion-color-success-tint); border-color: var(--ion-color-success-border); }
.verdict-wrong   { background: var(--ion-color-danger-tint); border-color: var(--ion-color-danger-border); }

.verdict-header { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.65rem; }
.verdict-icon-wrap {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.verdict-icon-wrap.correct { background: var(--ion-color-success-tint); }
.verdict-icon-wrap.wrong   { background: var(--ion-color-danger-tint); }
.verdict-icon { font-size: 1.3rem; }
.verdict-icon-wrap.correct .verdict-icon { color: var(--ion-color-success); }
.verdict-icon-wrap.wrong .verdict-icon   { color: var(--ion-color-danger); }

.verdict-label { font-size: 1.1rem; font-weight: 800; }
.verdict-correct .verdict-label { color: var(--ion-color-success); }
.verdict-wrong .verdict-label   { color: var(--ion-color-danger); }

.feedback-text { font-size: 0.87rem; line-height: 1.6; color: var(--ion-text-color); opacity: 0.75; margin: 0 0 0.7rem; }

.answer-row { display: flex; align-items: baseline; flex-wrap: wrap; gap: 0.4rem; margin-top: 0.35rem; }
.answer-meta { font-size: 0.78rem; font-weight: 600; color: var(--ion-color-medium); white-space: nowrap; opacity: 0.8; }
.your-answer { font-size: 0.9rem; color: var(--ion-color-danger); font-weight: 600; }
.correct-answer { font-weight: 700; font-size: 0.9rem; }

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
.error-text { margin: 0 0 0.5rem; color: var(--ion-text-color); font-size: 0.87rem; line-height: 1.55; opacity: 0.75; }
</style>
