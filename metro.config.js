// Metro sozlamasi (2026-09-19).
//
// Yagona o'zgarish: WEB platformada `expo-sqlite` o'rniga bo'sh
// o'rinbosar (`dev/web-sqlite-stub.js`). SDK 57 da `expo-sqlite` web
// uchun ishchi (worker) yig'ishni talab qiladi va Metro «Worker chunk
// not found» bilan yiqilib, ilova brauzerda umuman ochilmasdi — ya'ni
// ekranlarni brauzerda bosib sinab bo'lmasdi.
//
// iOS va Android'ga TEGMAYDI: shart `platform === "web"`.
const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

const asl = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === "web" && moduleName === "expo-sqlite") {
    return { type: "sourceFile", filePath: path.join(__dirname, "dev", "web-sqlite-stub.js") };
  }
  return (asl ?? context.resolveRequest)(context, moduleName, platform);
};

module.exports = config;
