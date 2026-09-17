/**
 * iOS `fetch` fon rejimini olib tashlash (2026-09-17, do'kon auditi A18).
 *
 * `expo-task-manager` plagini `UIBackgroundModes` ga `fetch` ni SHARTSIZ
 * qo'shadi. Ilova esa fon yangilanishini (background fetch) ishlatmaydi:
 * task-manager faqat GPS vazifasi uchun, u `location` rejimida ishlaydi
 * (`src/lib/gps.ts`).
 *
 * Apple tekshiruvchisi har e'lon qilingan fon rejimining sababini
 * so'raydi (2.5.4) — asossiz rejim rad etilishga olib keladi.
 *
 * Plagin `plugins` ro'yxatining OXIRIDA turadi: undan keyin hech kim
 * `fetch` ni qayta qo'shmasligi kerak. Natija `npx expo config --type
 * introspect` bilan tekshiriladi.
 */
const { withInfoPlist } = require("expo/config-plugins");

module.exports = function withoutBackgroundFetch(config) {
  return withInfoPlist(config, (c) => {
    const modes = c.modResults.UIBackgroundModes;
    if (Array.isArray(modes)) {
      c.modResults.UIBackgroundModes = modes.filter((m) => m !== "fetch");
    }
    return c;
  });
};
