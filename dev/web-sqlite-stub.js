/**
 * `expo-sqlite` ning WEB uchun o'rinbosari — faqat brauzerda sinash uchun
 * (2026-09-19).
 *
 * NEGA: SDK 57 da `expo-sqlite` web'da ishchi (worker) va WASM talab
 * qiladi; Metro uni yig'olmay «Worker chunk not found» bilan yiqiladi va
 * ilova brauzerda umuman ochilmaydi. Brauzerda esa bizga offline navbat
 * va kesh kerak emas — ekranlarni bosib sinash kerak.
 *
 * Shuning uchun web'da baza «bo'sh» ishlaydi: yozish jimgina o'tadi,
 * o'qish bo'sh qaytadi. `metro.config.js` bu faylni FAQAT `web`
 * platformasida ulaydi — telefon va do'kon build'iga tegmaydi.
 */
function db() {
  return {
    execAsync: async () => {},
    runAsync: async () => ({ lastInsertRowId: 0, changes: 0 }),
    getAllAsync: async () => [],
    getFirstAsync: async () => null,
    withTransactionAsync: async (fn) => fn(),
    closeAsync: async () => {},
    execSync: () => {},
    runSync: () => ({ lastInsertRowId: 0, changes: 0 }),
    getAllSync: () => [],
    getFirstSync: () => null,
    closeSync: () => {},
  };
}

module.exports = {
  openDatabaseAsync: async () => db(),
  openDatabaseSync: () => db(),
};
