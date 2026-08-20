import { createRouter, createWebHistory } from "vue-router";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/",
      name: "audience",
      component: () => import("@/components/placeholder-route.vue"),
    },
    {
      path: "/control/",
      name: "control",
      component: () => import("@/components/placeholder-route.vue"),
    },
    { path: "/:pathMatch(.*)*", redirect: "/" },
  ],
  scrollBehavior: () => ({ top: 0 }),
});

export default router;
