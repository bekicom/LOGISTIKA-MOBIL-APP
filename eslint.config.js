// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*"],
  },
  {
    /**
     * React Compiler qoidalari — O'CHIRILGAN (2026-09-04, SDK 57).
     *
     * `eslint-config-expo@57` React Compiler'ning lint to'plamini
     * olib keldi: `set-state-in-effect`, `purity`, `use-memo`.
     * Ular kompilyator YOQILGANDA ma'noli — u paytda effekt ichidagi
     * `setState` ortiqcha render beradi va render ichidagi
     * `Date.now()` memoizatsiyani buzadi.
     *
     * Bu loyihada kompilyator o'chirilgan (`app.json` dagi
     * `experiments.reactCompiler` — SDK'ga bog'liq, tajribaviy).
     * Ya'ni qoidalar hech qanday haqiqiy xarajatni ko'rsatmaydi,
     * lekin ishlab turgan yettita ekranni belgilaydi: ma'lumotni
     * formaga yuklash va ochilishda so'rov yuborish — ikkalasi ham
     * ataylab shunday yozilgan.
     *
     * ⚠️ Kompilyator yoqilsa — bu blok olib tashlanadi va o'sha
     * ekranlar qayta ko'riladi. Shundan oldin emas: qoidani
     * qondirish uchun ishlaydigan kodni qayta yozish — foydasi
     * yo'q o'zgartirish.
     *
     * `exhaustive-deps` va boshqa eski qoidalar O'Z KUCHIDA qoladi.
     */
    rules: {
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/purity": "off",
      "react-hooks/use-memo": "off",
    },
  },
]);
