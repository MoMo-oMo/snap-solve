<template>
  <div class="camera-root">
    <div class="glass-card camera-card">
      <!-- Viewfinder -->
      <div class="viewfinder">
        <div v-if="!cameraActive && !permissionDenied" class="overlay-center">
          <ion-spinner color="primary"></ion-spinner>
          <p class="overlay-text">Starting camera...</p>
        </div>

        <div v-if="permissionDenied" class="overlay-center">
          <div class="error-icon-wrap">
            <ion-icon :icon="banOutline" class="unavail-icon"></ion-icon>
          </div>
          <p class="overlay-text">Camera unavailable.<br>Use the upload option below.</p>
        </div>

        <video
          ref="videoElement"
          autoplay
          muted
          playsinline
          class="live-video"
          v-show="cameraActive"
        ></video>

        <div class="scanner-overlay" v-show="cameraActive">
          <div class="scanner-box">
            <span class="corner tl"></span>
            <span class="corner tr"></span>
            <span class="corner bl"></span>
            <span class="corner br"></span>
          </div>
        </div>
      </div>

      <!-- Actions -->
      <div class="camera-actions">
        <ion-button
          expand="block"
          class="capture-btn"
          :disabled="!cameraActive || loading"
          @click="captureFrame"
        >
          <ion-icon slot="start" :icon="scanOutline"></ion-icon>
          {{ loading ? 'Analyzing...' : 'Capture Problem' }}
        </ion-button>

        <div class="divider-row">
          <span class="divider-line"></span>
          <span class="divider-label">or</span>
          <span class="divider-line"></span>
        </div>

        <button class="gallery-btn" :disabled="loading" @click="selectFromGallery">
          <ion-icon :icon="imageOutline" class="gallery-icon"></ion-icon>
          Upload from Gallery
        </button>
      </div>
    </div>

    <canvas ref="canvasElement" style="display: none;"></canvas>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { IonSpinner, IonButton, IonIcon } from '@ionic/vue';
import { banOutline, scanOutline, imageOutline } from 'ionicons/icons';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';

const emit = defineEmits<{
  (event: 'photo', base64: string): void;
}>();

defineProps({
  loading: { type: Boolean, default: false },
});

const videoElement = ref<HTMLVideoElement | null>(null);
const canvasElement = ref<HTMLCanvasElement | null>(null);
const cameraActive = ref(false);
const permissionDenied = ref(false);
let stream: MediaStream | null = null;

onMounted(() => { startCamera(); });
onBeforeUnmount(() => { stopCamera(); });

async function startCamera() {
  if (stream) stopCamera();
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
    });
    if (videoElement.value) {
      videoElement.value.srcObject = stream;
      cameraActive.value = true;
    }
  } catch {
    permissionDenied.value = true;
  }
}

function stopCamera() {
  if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; }
  cameraActive.value = false;
}

function captureFrame() {
  if (!videoElement.value || !canvasElement.value) return;
  const video = videoElement.value;
  const canvas = canvasElement.value;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const MAX_WIDTH = 800;
  let w = video.videoWidth;
  let h = video.videoHeight;
  if (w > MAX_WIDTH) { h = Math.floor(h * (MAX_WIDTH / w)); w = MAX_WIDTH; }

  canvas.width = w;
  canvas.height = h;
  ctx.drawImage(video, 0, 0, w, h);
  emit('photo', canvas.toDataURL('image/jpeg', 0.7).split(',')[1]);
}

function selectFromGallery(): void {
  if (!Capacitor.isNativePlatform()) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        // Pass the full data URL so ocrService preserves the correct MIME type
        emit('photo', reader.result as string);
      };
      reader.readAsDataURL(file);
    };
    input.click();
    return;
  }

  Camera.getPhoto({
    quality: 90,
    source: CameraSource.Photos,
    resultType: CameraResultType.Base64,
  })
    .then(photo => { if (photo.base64String) emit('photo', photo.base64String); })
    .catch((err: unknown) => {
      const msg = err instanceof Error ? err.message : String(err);
      if (!msg.toLowerCase().includes('cancel')) console.warn('Gallery selection failed.', err);
    });
}
</script>

<style scoped>
.camera-root { display: flex; flex-direction: column; }

.camera-card {
  padding: 0.85rem;
  margin-bottom: 0.75rem;
  overflow: hidden;
}

/* Viewfinder */
.viewfinder {
  position: relative;
  width: 100%;
  height: 290px;
  background: #161418;
  border-radius: 14px;
  overflow: hidden;
  margin-bottom: 0.85rem;
}
.live-video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.overlay-center {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.7rem;
  background: rgba(10, 10, 12, 0.85);
}
.error-icon-wrap {
  width: 52px;
  height: 52px;
  border-radius: 16px;
  background: rgba(220, 38, 38, 0.12);
  display: flex;
  align-items: center;
  justify-content: center;
}
.unavail-icon {
  font-size: 1.6rem;
  color: var(--ion-color-danger);
}
.overlay-text {
  color: rgba(255,255,255,0.6);
  font-size: 0.82rem;
  text-align: center;
  margin: 0;
  line-height: 1.5;
}

/* Scanner overlay */
.scanner-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  background: rgba(0, 0, 0, 0.3);
}
.scanner-box {
  position: relative;
  width: 78%;
  height: 44%;
  border-radius: 6px;
}
.corner {
  position: absolute;
  width: 20px;
  height: 20px;
  border-color: rgba(255, 59, 76, 0.85);
  border-style: solid;
}
.corner.tl { top: 0; left: 0; border-width: 2.5px 0 0 2.5px; border-radius: 4px 0 0 0; }
.corner.tr { top: 0; right: 0; border-width: 2.5px 2.5px 0 0; border-radius: 0 4px 0 0; }
.corner.bl { bottom: 0; left: 0; border-width: 0 0 2.5px 2.5px; border-radius: 0 0 0 4px; }
.corner.br { bottom: 0; right: 0; border-width: 0 2.5px 2.5px 0; border-radius: 0 0 4px 0; }

/* Actions */
.camera-actions { display: flex; flex-direction: column; }

.capture-btn {
  --background: linear-gradient(135deg, #FF3B4C, #B91C2C);
  --color: #ffffff;
  --border-radius: 12px;
  --box-shadow: 0 4px 16px rgba(255, 59, 76, 0.3);
  font-weight: 700;
  font-size: 0.9rem;
  margin-bottom: 0.2rem;
}

.divider-row {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  margin: 0.7rem 0;
}
.divider-line {
  flex: 1;
  height: 1px;
  background: var(--ion-color-step-100);
}
.divider-label {
  font-size: 0.75rem;
  color: var(--ion-color-medium);
  font-weight: 500;
  opacity: 0.6;
}

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
  transition: background 0.15s ease;
  -webkit-tap-highlight-color: transparent;
}
.gallery-btn:active { background: var(--ion-color-step-100); }
.gallery-btn:disabled { opacity: 0.4; pointer-events: none; }
.gallery-icon { font-size: 1rem; }
</style>
