# LOGISTIKA-MOBIL-APP

[FURAM.uz](https://furam.uz) platformasining mobil ilovasi — iOS va Android.

Yuk egalari, transport egalari, haydovchi va dispetcherlarni bog'laydigan
logistika platformasi. Ilova web bilan **bitta backend va bitta bazadan**
ishlaydi: telefonda qilingan ish saytda darhol ko'rinadi.

## Texnologiyalar

Expo **SDK 54** · React Native 0.81 · TypeScript · expo-router (fayl asosida
marshrutlash) · react-native-svg

> ⚠️ **SDK 54 dan yuqoriga ko'tarmang.** App Store va Play Market'dagi
> Expo Go 54.0.2 — undan yangi SDK'ni ochmaydi va telefonda
> *«Project is incompatible with this version of Expo Go»* chiqadi.
> Ko'tarishdan oldin do'kondagi versiyani tekshiring:
> `curl -s "https://itunes.apple.com/lookup?bundleId=host.exp.Exponent"`

## Ishga tushirish

Backend ham kerak — u alohida repoda
([LOGISTIKA-WEB](https://github.com/bekicom/LOGISTIKA-WEB)):

```bash
# 1-oyna: backend
cd furam && npm run dev        # port 3000

# 2-oyna: ilova
npm install
npx expo start --lan           # port 8081
```

Telefonda **Expo Go** ni oching va QR ni skanerlang. Telefon kompyuter
bilan **bir xil Wi-Fi**da bo'lishi shart.

**API manzili qo'lda yozilmaydi.** `src/lib/api.ts` uni
`Constants.expoConfig.hostUri` dan oladi — ya'ni Expo qaysi kompyuterdan
uzatilayotgan bo'lsa, backend ham o'sha yerda deb hisoblaydi. IP o'zgarsa
o'zi topadi. `localhost` yaramaydi: telefon uchun localhost — telefonning
o'zi.

Boshqa manzil kerak bo'lsa: `EXPO_PUBLIC_API_URL=https://furam.uz npx expo start`

## Papkalar

| Yo'l | Nima |
|---|---|
| `src/app/` | Ekranlar. Fayl nomi = marshrut (expo-router) |
| `src/components/` | Umumiy UI: kartochkalar, ikonkalar, holatlar |
| `src/lib/` | API qatlami, sessiya, dizayn token'lari |

## Muhim qoidalar

**Dizayn token'lari web'dan ko'chiriladi.** `src/lib/theme.ts` dagi ranglar
va o'lchamlar — `furam/src/app/globals.css` ning nusxasi. Web o'zgarsa shu
fayl ham yangilanadi, aks holda sayt va ilova ajralib ketadi.

**Logotip qo'lda tahrirlanmaydi.** `src/components/Logo.tsx` —
`furam/public/logo.svg` dan skript bilan generatsiya qilinadi.

**Sessiya faqat `expo-secure-store` da.** iOS Keychain, Android Keystore.
AsyncStorage yoki MMKV ga yozilmaydi — ular shifrlanmagan.

Ilova serverga `Authorization: Bearer` sarlavhasi va `X-Client: mobile`
bilan murojaat qiladi. Backend tomonda buni `getCurrentUser()` qo'llaydi.

## Tekshiruv

```bash
npx tsc --noEmit
```

## Holat

Qurilgan: kirish oqimi (til, tanishtiruv, ro'yxatdan o'tish, kirish),
bosh sahifa (haydovchi va dispetcher uchun alohida), bildirishnomalar,
yuklar ro'yxati va filtrlar, reyslar ro'yxati, profil.

Hali yo'q: reys tafsiloti, yuk tafsiloti, e'lon berish, chat, xarita,
hujjatlar, AI yordamchi.
