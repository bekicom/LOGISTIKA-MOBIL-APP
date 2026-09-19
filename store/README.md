# Do'kon materiallari (17-band, 2026-09-19)

Anketa javoblari, tekshiruvchi izohi va skrinshot rejasi:
`../../docs/dokon-materiallari.md` (5–8-bo'limlar).

## App Store — `../store.config.json` (EAS Metadata)

Ruscha — **asosiy til**, qo'shimcha: `en-US`, `tr`, `zh-Hans`. App Store
o'zbek, qozoq, qirg'iz va tojik tillarini qo'llamaydi; bu qurilmalarda
asosiy (ruscha) sahifa ko'rinadi.

    npx eas-cli metadata:lint     # tekshiruv (oflayn)
    npx eas-cli metadata:push     # App Store Connect'ga yuklash

`metadata:push` ilova App Store Connect'da yaratilgandan keyin ishlaydi
(Apple Developer hisobi — 16-band). Ilova yaratilganda asosiy tilni
**Russian** qilib tanlang.

Yuklanmaydigan qismlar (App Store Connect'da qo'lda):
- App Review Information: ism, email, telefon, demo hisob (sharhlovchi
  skripti — `furam/scripts/sharhlovchi-hisobi.ts`) va izoh
  (`docs/dokon-materiallari.md` 5-bo'lim);
- App Privacy anketasi (6-bo'lim), yangi yosh reytingi savollari (7);
- skrinshotlar (8).

## Google Play — `play/<til>/` (fastlane `supply` tuzilmasi)

| Papka | Play Console tili | title | short_description | full_description |
|---|---|---|---|---|
| `ru` | ru-RU — **asosiy** | ✓ | ✓ | ✓ |
| `uz` | uz (O'zbek) | ✓ | ✓ | ✓ |
| `en` | en-US | ✓ | ✓ | ✓ |
| `tr` | tr-TR | ✓ | ✓ | ✓ |
| `kk` | kk (Қазақ) | ✓ | ✓ | ✓ |
| `ky` | ky-KG | ✓ | ✓ | ✓ |
| `tg` | tg (Тоҷикӣ) — Play ro'yxatida bo'lmasa, tashlab ketiladi | ✓ | ✓ | ✓ |
| `zh` | zh-CN | ✓ | ✓ | ✓ |

Chegaralar: sarlavha 30, qisqa tavsif 80, to'liq 4000 belgi — `test-dokon-mobile`
tekshiradi.

Grafika (`play/graphics/`):
- `feature-graphic.png` — 1024×500, alfasiz (Play talabi), matnsiz logo —
  hamma tilga mos;
- `icon-512.png` — Play ikonkasi 512×512.

## Matnlar qoidasi

- Do'kon nomi matnda yo'q: «ilova ichidagi xarid» — ikkala do'konda bir xil
  (Apple 2.3.10).
- Faqat bor funksiyalar; son («minglab yuk») yozilmaydi.
- Joylashuv va AI — «faqat ruxsatingiz bilan» (ilovadagi qoidaning o'zi).
