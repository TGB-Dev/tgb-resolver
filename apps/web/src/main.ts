import { VueQueryPlugin } from "@tanstack/vue-query";
import { createPinia } from "pinia";
import { createApp } from "vue";

import { queryClient } from "@/features/shared/app/providers";
import "@/lib/api";

import App from "./App.vue";
import { router } from "./router";

import "@/assets/css/main.css";

const app = createApp(App);

app.use(createPinia());
app.use(router);
app.use(VueQueryPlugin, { queryClient });

app.mount("#app");
