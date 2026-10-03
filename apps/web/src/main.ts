import { VueQueryPlugin } from "@tanstack/vue-query";
import { createApp } from "vue";

import { pinia, queryClient } from "@/features/shared/app/providers";
import "@/lib/api";

import App from "./App.vue";
import { router } from "./router";

import "@/assets/css/main.css";

const app = createApp(App);

app.use(pinia);
app.use(router);
app.use(VueQueryPlugin, { queryClient });

app.mount("#app");
