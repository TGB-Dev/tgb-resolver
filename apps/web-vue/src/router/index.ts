import { createRouter, createWebHistory } from "vue-router";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/",
      name: "audience",
      component: () => import("@/features/leaderboard/leaderboard.vue"),
    },
    {
      path: "/control/",
      name: "control",
      component: () => import("@/features/control/control-route.vue"),
    },
    { path: "/:pathMatch(.*)*", redirect: "/" },
  ],
  scrollBehavior: () => ({ top: 0 }),
});

export default router;
