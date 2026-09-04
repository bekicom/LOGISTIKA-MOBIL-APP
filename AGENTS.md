# Expo SDK 54 — sinov usuli o'zgarmoqda

Loyiha hozircha **Expo SDK 54** da (`expo@54.0.37`, `react-native@0.81`, `expo-router@6`).
Hujjatlar: https://docs.expo.dev/versions/v54.0.0/

Kod yozishdan oldin aynan **shu** versiyaning hujjatini o'qing. Expo tez
o'zgaradi: yangiroq SDK uchun yozilgan misol bu yerda ishlamasligi mumkin.

## ⚠️ 2026-09-04: sabab teskarisiga aylandi

Ilgari 54 da qolish SHART edi: do'kondagi Expo Go 54.0.2 bo'lib,
undan yangi SDK'da qurilgan ilova telefonda
«Project is incompatible with this version of Expo Go» berardi.
Bir marta 57 ga ko'tarilib, `node_modules` ni butunlay o'chirib
qaytarishga to'g'ri kelgan.

**Endi do'kondagi Expo Go — SDK 57**, va aynan o'sha xato QAYTA
chiqyapti, lekin bu safar loyiha ESKI bo'lgani uchun. Expo Go bir
vaqtda faqat bitta SDK ni ushlaydi, ya'ni 54 da qolish endi
«xavfsiz» qaror emas — u sinov usulini yo'qotadi.

Versiyani TAXMIN QILMANG, so'rang:

```
curl -s https://api.expo.dev/v2/versions/latest
```

`sdkVersions` ichida har SDK uchun `iosClientVersion`,
`androidClientVersion` va yuklab olish havolalari turadi.

- **Android** — eski Expo Go APK si bor (`androidClientUrl`).
  O'rnatib, avtoyangilanishni o'chirish kifoya.
- **iPhone** — yo'l yo'q. App Store faqat oxirgi versiyani beradi,
  `iosClientUrl` esa SIMULYATOR arxivi (Mac kerak). iPhone'da sinash
  uchun yo SDK ni ko'tarish, yo dev build kerak.

Ya'ni SDK'ni ko'tarish endi «texnik qaror» ham emas — kechiktirilsa
telefonlarda umuman sinab bo'lmaydi.

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
