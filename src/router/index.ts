import { createRouter, createWebHistory } from '@ionic/vue-router';
import { RouteRecordRaw } from 'vue-router';
import HomePage from '../views/HomePage.vue';
import SolvePage from '../views/SolvePage.vue';
import CheckWorkPage from '../views/CheckWorkPage.vue';

const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    redirect: '/home',
  },
  {
    path: '/home',
    name: 'Home',
    component: HomePage,
  },
  {
    path: '/solve',
    name: 'Solve',
    component: SolvePage,
  },
  {
    path: '/check-work',
    name: 'CheckWork',
    component: CheckWorkPage,
  },
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
});

router.beforeEach(() => {
  (document.activeElement as HTMLElement)?.blur();
});

export default router;
