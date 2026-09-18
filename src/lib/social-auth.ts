/**
 * Google va Apple bilan kirish — ilova tomoni (2026-09-15).
 *
 * ── NEGA IKKALASI BIRGA ─────────────────────────────────────────
 *
 * App Store 4.8-qoidasi: ilovada Google bilan kirish bo'lsa, «Sign in
 * with Apple» ham bo'lishi SHART, aks holda ilova rad etiladi. Bekzod
 * «Google + Apple birga» ni tanladi. Android'da Apple tugmasi yo'q —
 * u yerda bunday talab ham, Apple ID ham yo'q.
 *
 * ── GOOGLE: TIZIM BRAUZERI + BILET ──────────────────────────────
 *
 * Google o'rnatilgan WebView'da kirishni TAQIQLAGAN
 * (`disallowed_useragent`). Shuning uchun sahifa tizim brauzerida
 * ochiladi (iOS: ASWebAuthenticationSession, Android: Custom Tabs) va
 * server ilovaga `…?bilet=` bilan qaytaradi — token emas.
 *
 * Bilet `verifier` siz yaroqsiz. `verifier` shu faylda yasaladi va
 * telefondan TASHQARIGA chiqmaydi: Android'da `furam://` ni boshqa
 * ilova ushlab olsa ham kira olmaydi (RFC 8252, PKCE). Batafsili
 * serverdagi `mobil-kirish.ts` da.
 *
 * ── APPLE: NATIV OYNA ───────────────────────────────────────────
 *
 * Brauzer yo'q: iPhone o'zi Apple oynasini ochadi va imzolangan token
 * beradi. `nonce` — Apple'ga XESHI, serverga XOMI ketadi; server
 * xeshlab solishtiradi. Boshqa joyda olingan token qayta ishlatilmasin.
 *
 * ⚠️ Apple ISMNI FAQAT BIRINCHI ruxsatda beradi. Keyingi safar
 * `fullName` bo'sh keladi — shuning uchun ism faqat ro'yxat formasini
 * to'ldirish uchun, odam o'zi tuzatadi.
 */
import { Platform } from "react-native";
import * as AppleAuthentication from "expo-apple-authentication";
import * as Crypto from "expo-crypto";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { requireOptionalNativeModule } from "expo-modules-core";
import { API_BASE, api, FuramError } from "./api";
import { t } from "./i18n";

export type Provayder = "google" | "apple";

export type Yangi = {
  provayder: Provayder;
  /** Server imzolagan token — ro'yxat formasi bilan qaytariladi */
  kutilayotgan: string;
  email: string;
  firstName: string;
  lastName: string;
  referralCode: string;
};

export type Natija =
  | { tur: "kirdi"; token: string }
  | { tur: "yangi"; yangi: Yangi }
  /** Odam oynani o'zi yopdi — bu xato EMAS, hech narsa ko'rsatilmaydi */
  | { tur: "bekor" }
  | { tur: "xato"; matn: string };

/**
 * Ro'yxat formasigacha saqlanadigan ma'lumot.
 *
 * Marshrut parametrida EMAS: kutilayotgan token 600+ belgi va u
 * navigatsiya tarixida qolib ketardi. Ilova qayta ishga tushsa bu
 * yo'qoladi — forma «vaqt o'tdi, qaytadan» deydi, bu to'g'ri.
 */
let kutilayotgan: Yangi | null = null;
export const kutilayotganOl = () => kutilayotgan;
export const kutilayotganTozala = () => {
  kutilayotgan = null;
};

/** Server `?xato=` bilan qaytargan sabab → lug'at kaliti (web bilan bir xil) */
const GOOGLE_XATO: Record<string, string> = {
  xato: "googleAuth.errXato",
  email: "googleAuth.errEmail",
  bloklangan: "googleAuth.errBloklangan",
  ochirilgan: "googleAuth.errOchirilgan",
  band: "googleAuth.errBand",
  sozlanmagan: "googleAuth.errSozlanmagan",
};

const b64url = (bytes: Uint8Array) => {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

/** Server javobini umumiy natijaga o'giradi — Google va Apple bir xil shaklda */
function javobdan(r: {
  ok?: boolean;
  token?: string;
  yangi?: boolean;
  provayder?: Provayder;
  kutilayotgan?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  referralCode?: string;
}): Natija {
  if (r.ok && r.token) return { tur: "kirdi", token: r.token };
  if (r.yangi && r.kutilayotgan && r.provayder) {
    kutilayotgan = {
      provayder: r.provayder,
      kutilayotgan: r.kutilayotgan,
      email: r.email ?? "",
      firstName: r.firstName ?? "",
      lastName: r.lastName ?? "",
      referralCode: r.referralCode ?? "",
    };
    return { tur: "yangi", yangi: kutilayotgan };
  }
  return { tur: "xato", matn: t("googleAuth.errXato") };
}

export async function googleBilan(): Promise<Natija> {
  const verifier = b64url(Crypto.getRandomBytes(32));
  const challenge = (
    await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, verifier, {
      encoding: Crypto.CryptoEncoding.BASE64,
    })
  )
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  /* Build'da `furam://google`, Expo Go'da `exp://<kompyuter>/--/google`.
     Server ikkinchisiga faqat sinov bayrog'i bilan ruxsat beradi. */
  const qaytish = Linking.createURL("google");
  const url =
    `${API_BASE}/api/auth/google/start` +
    `?mobil=${encodeURIComponent(challenge)}&qaytish=${encodeURIComponent(qaytish)}`;

  let res: WebBrowser.WebBrowserAuthSessionResult;
  try {
    res = await WebBrowser.openAuthSessionAsync(url, qaytish);
  } catch {
    return { tur: "xato", matn: t("googleAuth.errXato") };
  }
  if (res.type !== "success") return { tur: "bekor" };

  const q = Linking.parse(res.url).queryParams ?? {};
  const xato = typeof q.xato === "string" ? q.xato : null;
  if (xato === "bekor") return { tur: "bekor" };
  if (xato) return { tur: "xato", matn: t(GOOGLE_XATO[xato] ?? "googleAuth.errXato") };

  const bilet = typeof q.bilet === "string" ? q.bilet : null;
  if (!bilet) return { tur: "xato", matn: t("googleAuth.errXato") };

  try {
    return javobdan(await api("/api/auth/mobil/bilet", { method: "POST", auth: false, body: { bilet, verifier } }));
  } catch (e) {
    return { tur: "xato", matn: (e as FuramError).message };
  }
}

/** Apple bilan kirish mumkinmi — faqat iPhone va iOS 13+ */
export async function appleBormi(): Promise<boolean> {
  if (Platform.OS !== "ios") return false;
  try {
    const v = await AppleAuthentication.isAvailableAsync();
    /* ⚠️ EXPO GO'DA DOIM `false` (2026-09-16, iPhone'da tekshirildi).

       App Store'dagi Expo Go ichida `ExpoAppleAuthentication` native
       moduli YO'Q — jurnal: «isAvailableAsync: false | native modul:
       false». Expo hujjatida «Expo Go'da sinasa bo'ladi» deyilgan, lekin
       amalda bunday emas. Kutubxona modul topilmasa xato bermaydi,
       jimgina `false` qaytaradi — shuning uchun tugma yo'qligining
       sababi ko'rinmay qoldi.

       Ya'ni Apple tugmasi Expo Go'da CHIQMAYDI va bu to'g'ri. U faqat
       haqiqiy build'da (EAS) ishlaydi: `app.json` da plagin va
       `usesAppleSignIn` bor, modul build'ga o'zi ulanadi. */
    if (__DEV__ && !v) {
      console.warn(
        "[apple] Apple bilan kirish mavjud emas — native modul:",
        !!requireOptionalNativeModule("ExpoAppleAuthentication"),
        "(Expo Go'da modul yo'q, faqat build'da ishlaydi)",
      );
    }
    return v;
  } catch (e) {
    /* Xato JIMGINA yutilmaydi: tugma chiqmay qolsa sababi jurnalda
       ko'rinsin (2026-09-16 da shu sababdan sabab topilmay turdi) */
    if (__DEV__) console.warn("[apple] isAvailableAsync xato:", String(e));
    return false;
  }
}

export async function appleBilan(): Promise<Natija> {
  const nonce = b64url(Crypto.getRandomBytes(32));
  /* Apple tokenga AYNAN shu satrni yozadi — xeshni o'zimiz olamiz
     (hex), server xom nonce'ni xeshlab solishtiradi (`apple-auth.ts`) */
  const xesh = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, nonce);

  let cred: AppleAuthentication.AppleAuthenticationCredential;
  try {
    cred = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
      nonce: xesh,
    });
  } catch (e) {
    if ((e as { code?: string }).code === "ERR_REQUEST_CANCELED") return { tur: "bekor" };
    return { tur: "xato", matn: t("mob.social.appleFailed") };
  }
  if (!cred.identityToken) return { tur: "xato", matn: t("mob.social.appleFailed") };

  try {
    return javobdan(
      await api("/api/auth/apple", {
        method: "POST",
        auth: false,
        body: {
          identityToken: cred.identityToken,
          nonce,
          ism: cred.fullName?.givenName ?? null,
          familiya: cred.fullName?.familyName ?? null,
          /* App Store 5.1.1(v): hisob o'chirilganda Apple'dagi ruxsat ham
             bekor qilinishi shart. Buning uchun server SHU kodni refresh
             tokenga almashtirib qo'yadi (`furam/src/lib/apple-revoke.ts`).
             Kod bir marta ishlaydi — kirishdan boshqa payt olinmaydi. */
          authorizationCode: cred.authorizationCode ?? null,
        },
      }),
    );
  } catch (e) {
    return { tur: "xato", matn: (e as FuramError).message };
  }
}
