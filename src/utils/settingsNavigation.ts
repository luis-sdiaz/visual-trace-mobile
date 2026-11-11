import { router, type Href } from "expo-router";

export function openSettings() {
  router.push("/settings" as Href);
}

export function goBackFromSettings() {
  router.back();
}
