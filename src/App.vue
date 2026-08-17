<template>
  <ion-app>
    <ion-router-outlet />
    <welcome-tour />
  </ion-app>
</template>

<script setup lang="ts">
import { IonApp, IonRouterOutlet } from '@ionic/vue';
import WelcomeTour from '@/components/WelcomeTour.vue';
</script>
