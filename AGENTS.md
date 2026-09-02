# Expo SDK 54 — versiyani oshirmang

Loyiha **Expo SDK 54** da (`expo@54.0.37`, `react-native@0.81`, `expo-router@6`).
Hujjatlar: https://docs.expo.dev/versions/v54.0.0/

Kod yozishdan oldin aynan **shu** versiyaning hujjatini o'qing. Expo tez
o'zgaradi: yangiroq SDK uchun yozilgan misol bu yerda ishlamasligi mumkin.

## Nega 54, undan yuqorisi emas

App Store'dagi **Expo Go — 54.0.2**. Ilova undan yangi SDK'da qurilsa,
telefonda «Project is incompatible with this version of Expo Go» chiqadi
va hech narsani sinab bo'lmaydi. Bir marta 57 ga ko'tarilib, keyin
`node_modules` ni butunlay o'chirib qaytarishga to'g'ri kelgan.

Ya'ni SDK'ni oshirish — texnik qaror emas, **sinov usulini almashtirish**:
Expo Go o'rniga dev build kerak bo'ladi. Bunga o'tish alohida ish, yo'l-yo'lakay
qilinmaydi.

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
