# Expo SDK 57

Loyiha **Expo SDK 57** da (`expo@57.0.19`, `react-native@0.86`, `expo-router@57`).
Hujjatlar: https://docs.expo.dev/versions/v57.0.0/

Kod yozishdan oldin aynan **shu** versiyaning hujjatini o'qing. Expo tez
o'zgaradi: yangiroq SDK uchun yozilgan misol bu yerda ishlamasligi mumkin.

## ⚠️ VERSIYANI TAXMIN QILMANG — SO'RANG

54 dan 57 ga **2026-09-04 da ko'tarildi**, chunki do'kondagi Expo Go
57 ga o'tdi va SDK 54 loyihasini ochmay qo'ydi. Undan oldin buning
aksi to'g'ri edi — shuning uchun bu yerdagi raqamga emas, jonli
javobga qarang:

```
curl -s https://api.expo.dev/v2/versions/latest
```

`sdkVersions` ichida har SDK uchun `iosClientVersion`,
`androidClientVersion` va yuklab olish havolalari turadi. Loyiha
do'kondagi Expo Go bilan BIR XIL SDK da bo'lishi kerak — Expo Go
bir vaqtda faqat bittasini ushlaydi.

- **Android** — eski Expo Go APK si bor (`androidClientUrl`), ya'ni
  loyihani orqada qoldirsa ham bo'ladi.
- **iPhone** — orqaga yo'l yo'q. App Store faqat oxirgi versiyani
  beradi, `iosClientUrl` esa simulyator arxivi (Mac kerak).

## Expo Go 57 KIRISH so'raydi

Dev serverni ochish uchun kompyuterda `npx expo login`, telefondagi
Expo Go da esa **o'sha hisob** bilan kirish kerak. Aylanib o'tish
yo'li yo'q: begona QR ilovani ixtiyoriy kodga yo'naltirmasin deb
ataylab qo'yilgan.

## React Compiler lint qoidalari o'chirilgan

`eslint-config-expo@57` `set-state-in-effect`, `purity`, `use-memo`
qoidalarini olib keldi. Kompilyator bu loyihada yoqilmagan, ya'ni
ular haqiqiy xarajat ko'rsatmaydi. Sabab `eslint.config.js` da.

## Amaliy eslatmalar

- **Yangi route PAPKASI qo'shilsa Metro qayta yoqiladi.** `expo-router` papka
  daraxtini ishga tushganda o'qiydi; yangi papka issiq qayta yuklashda
  ko'rinmaydi va «unmatched route» chiqadi. Fayl qo'shilsa — shart emas.
- **`.env` o'zgarsa ham Metro qayta yoqiladi.** `EXPO_PUBLIC_*` qiymatlari
  bundle ichiga yoziladi, ishlash paytida o'qilmaydi.
- **Backend porti qattiq yozilmaydi.** Next.js dev serveri 3000 band bo'lsa
  3100 ga o'tib ketadi va ilova jimgina «ulanmadi» deb turaveradi.
  `.env` dagi `EXPO_PUBLIC_API_PORT` ni `npm run dev` chiqishiga qarab
  moslang (namuna: `.env.example`).
- **Telefon uchun `localhost` — telefonning o'zi.** Manzil `Constants.expoConfig.hostUri`
  dan olinadi (`src/lib/api.ts`), qo'lda yozilmaydi.
- **Token `expo-secure-store` da** (Keychain / Keystore). AsyncStorage yoki
  MMKV ishlatilmaydi — ular shifrlanmagan.
- **Multipart yuborishda `Content-Type` QO'LDA QO'YILMAYDI.** React Native uni
  o'zi yozadi va ichiga `boundary` qo'shadi; qo'lda yozilsa boundary tushib
  qoladi va server so'rovni umuman o'qiy olmaydi.

## Backend

Alohida backend yo'q — web bilan bitta: `../furam/src/app/api/...`.
Farqi shundaki, mobil klient sessiyani cookie'da emas, `Authorization: Bearer`
sarlavhasida olib yuradi (`furam/src/lib/auth.ts`).
