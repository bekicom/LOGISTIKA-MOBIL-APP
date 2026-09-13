# Do'kon buildi — nima uchun shunday sozlangan

`eas.json` 2026-09-13 da yozildi. Uch profil bor va ularning
farqi ataylab.

## Profillar

| Profil | Nima chiqadi | Kimga |
|---|---|---|
| `development` | `apk` + dev-client | ishlab chiqish paytida, Metro ga ulanadi |
| `preview` | `apk` | Bekzod va mijozga sinov uchun — o'rnatib ko'riladi |
| `production` | `aab` (Android), imzolangan iOS | do'konga |

Android `preview` da **`apk`**, `production` da **`aab`**: Google
Play faqat `aab` qabul qiladi, lekin `aab` ni telefonga shunchaki
o'rnatib bo'lmaydi. Sinov uchun `apk` kerak.

## ⚠️ `EXPO_PUBLIC_API_URL` build profilida yozilgan

Bu eng oson o'tkazib yuboriladigan joy. Manzil `mobil/.env` da
turadi, `.env` esa `.gitignore` da — EAS Build esa loyihani
**git orqali** yuklaydi. Ya'ni server manzili build paytida
bo'lmaydi va chiqarilgan ilova serverni topolmay, bo'sh ekran
ko'rsatadi.

Shuning uchun `preview` va `production` profillariga
`https://furam.uz` ochiq yozilgan. Bu maxfiy ma'lumot emas —
ilova baribir shu manzilga so'rov yuboradi va uni bundle'dan
o'qib olish mumkin.

`development` da yozilmagan: u kompyuterdagi serverga ulanadi
(`hostUri`), manzil esa har kishida boshqacha.

## Versiya raqami EAS da (`appVersionSource: "remote"`)

`buildNumber` (iOS) va `versionCode` (Android) har yuklashda
oshishi SHART — bir xil raqam bilan ikkinchi marta yuklab
bo'lmaydi. Ularni `app.json` da qo'lda yuritish — unutiladigan
ish va git'da keraksiz o'zgarish qoldiradi.

`remote` da sanoqni EAS yuritadi va `production` profilida
`autoIncrement` o'zi oshiradi.

`version` (`1.0.0`) esa `app.json` da qoladi — uni ODAM
o'zgartiradi, chunki u do'konda ko'rinadigan raqam.

## Build qilish

```
npx eas-cli build --platform android --profile preview      # sinov apk
npx eas-cli build --platform android --profile production   # Play uchun aab
npx eas-cli build --platform ios --profile production       # App Store uchun
```

iOS buildi **Apple Developer hisobini** talab qiladi (sertifikat
va provisioning profil EAS tomonidan o'sha hisobda yaratiladi).
Hisob ochilmaguncha faqat Android chiqariladi.

Birinchi buildda `eas-cli` loyihani Expo hisobiga bog'laydi
(`extra.eas.projectId` yoziladi) — bu bir martalik ish.
