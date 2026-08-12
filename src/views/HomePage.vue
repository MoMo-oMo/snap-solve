<template>
  <ion-page>
    <ion-content class="home-content">
      <div class="content-wrapper">
        <!-- Top bar -->
        <div class="top-bar">
          <div class="brand">
            <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" class="brand-logo">
              <defs>
                <linearGradient id="logoGrad" x1="0" y1="0" x2="80" y2="80" gradientUnits="userSpaceOnUse">
                  <stop stop-color="#FF3B4C"/>
                  <stop offset="1" stop-color="#7A0C16"/>
                </linearGradient>
              </defs>
              <rect width="80" height="80" rx="20" fill="url(#logoGrad)"/>
              <rect x="13" y="10" width="36" height="46" rx="7" stroke="rgba(255,255,255,0.5)" stroke-width="3.2"/>
              <rect x="29" y="24" width="36" height="46" rx="7" stroke="rgba(255,255,255,0.96)" stroke-width="3.2"/>
            </svg>
            <span class="brand-name">SnapSolve</span>
          </div>
          <theme-toggle />
        </div>

        <!-- Primary CTA: camera-first, like Photomath/Socratic -->
        <button class="scan-cta" @click="go('/solve')">
          <div class="scan-cta-icon-wrap">
            <ion-icon :icon="cameraOutline" class="scan-cta-icon"></ion-icon>
          </div>
          <p class="scan-cta-title">Scan a Problem</p>
          <p class="scan-cta-desc">Point your camera at any math problem, or type it in</p>
          <span class="scan-cta-button">
            Start Scanning
            <ion-icon :icon="arrowForwardOutline"></ion-icon>
          </span>
        </button>

        <!-- Secondary action -->
        <button class="action-card glass-card" @click="go('/check-work')">
          <div class="action-icon-wrap">
            <ion-icon :icon="checkmarkCircleOutline" class="action-icon"></ion-icon>
          </div>
          <div class="action-text">
            <span class="action-title">Check My Work</span>
            <span class="action-desc">Verify your answers step by step</span>
          </div>
          <ion-icon :icon="chevronForwardOutline" class="action-chevron"></ion-icon>
        </button>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { IonPage, IonContent, IonIcon } from '@ionic/vue';
import { cameraOutline, checkmarkCircleOutline, chevronForwardOutline, arrowForwardOutline } from 'ionicons/icons';
import { useRouter } from 'vue-router';
import ThemeToggle from '@/components/ThemeToggle.vue';

const router = useRouter();
function go(path: string) { router.push(path); }
</script>

<style scoped>
.home-content {
  --background: var(--app-gradient);
}

.content-wrapper {
  padding: 1.1rem 1.25rem 2.5rem;
  padding-top: calc(env(safe-area-inset-top, 0px) + 1.1rem);
  display: flex;
  flex-direction: column;
  min-height: 100%;
}

/* Top bar */
.top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 44px;
  margin-bottom: 1.75rem;
}
.brand {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}
.brand-logo {
  width: 32px;
  height: 32px;
  display: block;
  border-radius: 9px;
}
.brand-name {
  font-size: 1.15rem;
  font-weight: 800;
  color: var(--ion-text-color);
  letter-spacing: -0.2px;
}

/* Primary scan CTA */
.scan-cta {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  width: 100%;
  padding: 2.5rem 1.5rem 2rem;
  margin-bottom: 0.9rem;
  border: none;
  border-radius: var(--glass-radius);
  cursor: pointer;
  appearance: none;
  -webkit-appearance: none;
  -webkit-tap-highlight-color: transparent;
  background: linear-gradient(160deg, #FF3B4C 0%, #B91C2C 100%);
  box-shadow: 0 10px 28px rgba(212, 46, 61, 0.28);
  transition: transform 0.18s ease, opacity 0.18s ease;
}
.scan-cta:active { transform: scale(0.98); opacity: 0.94; }

.scan-cta-icon-wrap {
  width: 68px;
  height: 68px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.16);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 1rem;
}
.scan-cta-icon { font-size: 2.1rem; color: #ffffff; }

.scan-cta-title {
  font-size: 1.35rem;
  font-weight: 800;
  color: #ffffff;
  margin: 0 0 0.35rem;
  letter-spacing: -0.2px;
}
.scan-cta-desc {
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.85);
  margin: 0 0 1.4rem;
  max-width: 26ch;
  line-height: 1.5;
}
.scan-cta-button {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  background: #ffffff;
  color: #D42E3D;
  font-weight: 700;
  font-size: 0.88rem;
  padding: 0.65rem 1.3rem;
  border-radius: 999px;
}

/* Secondary action card */
.action-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.1rem 1.2rem;
  margin-bottom: 1.5rem;
  text-align: left;
  cursor: pointer;
  border: none;
  width: 100%;
  transition: transform 0.18s ease, opacity 0.18s ease;
  appearance: none;
  -webkit-appearance: none;
  -webkit-tap-highlight-color: transparent;
}
.action-card:active { transform: scale(0.98); opacity: 0.85; }

.action-icon-wrap {
  flex-shrink: 0;
  width: 42px;
  height: 42px;
  border-radius: 12px;
  background: var(--surface-tint);
  display: flex;
  align-items: center;
  justify-content: center;
}
.action-icon { font-size: 1.25rem; color: var(--ion-color-primary); }
.action-text {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}
.action-title {
  font-size: 0.94rem;
  font-weight: 700;
  color: var(--ion-text-color);
}
.action-desc {
  font-size: 0.78rem;
  color: var(--ion-color-medium);
}
.action-chevron {
  font-size: 1.05rem;
  color: var(--ion-color-medium);
  opacity: 0.5;
  flex-shrink: 0;
}

</style>
