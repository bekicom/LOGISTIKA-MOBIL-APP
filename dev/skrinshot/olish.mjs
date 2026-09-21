#!/usr/bin/env node
/**
 * Do'kon skrinshotlari — 1-qadam: ilova ekranlarini suratga olish.
 *
 *   node dev/skrinshot/olish.mjs --til=uz --token=<JWT> [--token2=<JWT>] --chiqish=<papka>
 *
 * ── NEGA SHUNDAY ────────────────────────────────────────────────
 *
 * Qo'lda (telefon yoki brauzer panelidan) olingan surat past sifatli
 * va har safar boshqacha chiqadi. Bu skript Chrome'ni DevTools
 * protokoli orqali boshqaradi: 390×844 telefon ekrani (iPhone 15 va
 * ko'p Android), piksel zichligi 3 → **1170×2532** surat. Kutubxona
 * o'rnatilmaydi — Node 22 ning o'z `WebSocket` i yetadi.
 *
 * ⚠️ NEGA 360 EMAS. Brauzerda `adjustsFontSizeToFit` ishlamaydi —
 * telefonda sig'masa kichrayadigan yozuv (masalan «Yuklar |
 * Mashinalar» almashtirgichi) brauzerda «Mashinal…» bo'lib kesiladi.
 * 360 da olingan surat telefondagidan YOMONROQ chiqardi. 390 da hamma
 * yozuv o'z o'lchamida sig'adi. Do'kon uchun o'lcham baribir ramkada
 * (`ramka.mjs`) belgilanadi.
 *
 * Ilova — o'sha kod (Expo web, `dev/web-proxy.js` orqali 8090 da),
 * ya'ni ekranlar telefondagi bilan bir xil. Xarita uchun brauzerda
 * `MapCanvas.web.tsx` ishlaydi.
 *
 * ── TAYYORGARLIK ────────────────────────────────────────────────
 *
 *   1. Next (3000), Expo web (8082) va proksi (8090) ishlab turadi
 *   2. Demo ma'lumot: `furam/scripts/skrinshot-demo.ts` (lokal baza)
 *   3. Tokenlar: o'sha skript `--token=<telefon>` bilan chiqaradi
 *
 * `--token` — asosiy hisob (Sardor), `--token2` — suhbat ekrani uchun
 * suhbatdosh (ruscha to'plamda suhbat Aleksey ko'zi bilan olinadi —
 * o'zbekcha xabarlar unga ruscha tarjimada ko'rinadi).
 *
 * «Harakatni kamaytirish» yoqiladi — ochilish videosi o'shanda umuman
 * ko'rsatilmaydi (`IntroVideo`), har ekranda 6 soniya kutilmaydi.
 */
import { Buffer } from "node:buffer";
import { mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { kut, ulan } from "./cdp.mjs";

const arg = (k, d = null) => process.argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3) ?? d;

const APP = arg("app", "http://localhost:8090");
const TIL = arg("til", "uz");
const TOKEN = arg("token");
const TOKEN2 = arg("token2", TOKEN);
const CHIQISH = arg("chiqish", join(tmpdir(), `skrinshot-${TIL}`));
const FAQAT = arg("ekranlar")?.split(",") ?? null;
const REYS = arg("reys");

if (!TOKEN) {
  console.error("✖ --token=<JWT> kerak (furam/scripts/skrinshot-demo.ts --token=+998...)");
  process.exit(1);
}

/**
 * O'zbekcha oy nomlari — Chrome uchun yamoq.
 *
 * Chrome'ning ICU ma'lumoti qisqartirilgan va unda o'zbekcha oy
 * nomlari YO'Q: `toLocaleDateString("uz", { month: "short" })`
 * «M09 21» qaytaradi. Telefonlarda (iOS, Android) CLDR to'liq —
 * u yerda «21-sen» (Bekzodning iPhone suratida chat ro'yxati
 * «16-sen» ko'rsatadi, Node ham «21-sen» beradi).
 *
 * Ya'ni bu ilova xatosi EMAS, brauzer farqi. Yamoq faqat shu
 * skrinshot vositasida — sahifa yuklanishidan OLDIN qo'yiladi va
 * «M09 21» ni telefondagi ko'rinishga keltiradi.
 */
/* `String.raw` — ichidagi `\d` brauzerga aynan shunday yetsin */
const UZ_OY = String.raw`(() => {
  const OY = ["yan","fev","mar","apr","may","iyn","iyl","avg","sen","okt","noy","dek"];
  const tuzat = (s) => typeof s === "string"
    ? s.replace(/M(\d{2}) (\d{1,2})/g, (_, m, d) => (+d) + "-" + OY[+m - 1])
       .replace(/\bM(\d{2})\b/g, (_, m) => OY[+m - 1])
    : s;
  const uzmi = (l) => (Array.isArray(l) ? l[0] : l || "").toString().toLowerCase().startsWith("uz");
  for (const k of ["toLocaleDateString", "toLocaleString"]) {
    const asl = Date.prototype[k];
    Date.prototype[k] = function (l, o) { const r = asl.call(this, l, o); return uzmi(l) ? tuzat(r) : r; };
  }
  const aslFormat = Object.getOwnPropertyDescriptor(Intl.DateTimeFormat.prototype, "format").get;
  Object.defineProperty(Intl.DateTimeFormat.prototype, "format", {
    get() { const f = aslFormat.call(this); const uz = this.resolvedOptions().locale.startsWith("uz"); return uz ? (d) => tuzat(f(d)) : f; },
  });
})();`;

/* ── Ekranlar ─────────────────────────────────────────────────── */

async function api(path, token, init = {}) {
  const r = await fetch(`${APP}${path}`, { ...init, headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(init.headers ?? {}) } });
  return r.ok ? r.json() : null;
}

/** Suhbat ID si — ro'yxatdan, suhbatdosh nomi bo'yicha */
async function suhbat(token, kim) {
  const d = await api("/api/chats", token);
  return d?.chats?.find((c) => c.type === "PRIVATE" && c.title?.includes(kim)) ?? null;
}

async function main() {
  mkdirSync(CHIQISH, { recursive: true });

  /* Profil to'ldirish eslatmasi skrinshot ustiga chiqmasin */
  for (const t of new Set([TOKEN, TOKEN2])) await api("/api/profile-gap/snooze", t, { method: "POST" });

  const kimBilan = TIL === "ru" ? "Sardor" : "Алексей";
  const chat = await suhbat(TOKEN2, kimBilan);
  const reysId = REYS;

  /* `tayyor` — ekranda chiqishi KERAK bo'lgan matn: ma'lumot kelmagan
     ekran suratga tushmasin. `sekin` — xarita plitkalari kabi
     keyinroq chiziladigan narsa uchun qo'shimcha kutish. */
  const EKRANLAR = [
    { nom: "01-bosh", yol: "/bosh", tayyor: TIL === "ru" ? "Sardor" : "Sardor" },
    { nom: "02-yuklar", yol: "/yuklar", tayyor: TIL === "ru" ? "Хлопковая" : "Paxta ipi" },
    /* `--reys` — skrinshot-demo.ts chiqargan REYS_ID */
    { nom: "03-reys", yol: reysId ? `/reys/${reysId}` : null, tayyor: "Guliston", sekin: 3500 },
    {
      nom: "04-suhbat",
      yol: chat ? `/suhbat/${chat.id}?title=${encodeURIComponent(chat.title)}` : null,
      tayyor: TIL === "ru" ? "Договорились" : "Kelishdik",
      token: TOKEN2,
    },
    { nom: "05-ai", yol: "/ai", tayyor: "?" },
    { nom: "06-park", yol: "/parkim", tayyor: "01 B 452 KA" },
    { nom: "07-mashinalar", yol: "/mashinalar", tayyor: "t" },
    { nom: "08-analitika", yol: "/analitika", tayyor: "000" },
  ].filter((e) => !FAQAT || FAQAT.includes(e.nom));

  const { cdp, yop } = await ulan({ til: TIL });
  try {
    await cdp("Page.enable");
    await cdp("Runtime.enable");
    await cdp("Page.addScriptToEvaluateOnNewDocument", { source: UZ_OY });
    await cdp("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 3, mobile: true });
    await cdp("Emulation.setEmulatedMedia", {
      features: [
        { name: "prefers-color-scheme", value: "light" },
        { name: "prefers-reduced-motion", value: "reduce" },
      ],
    });

    /* Kelib chiqish manzili ochilmaguncha localStorage yo'q */
    await cdp("Page.navigate", { url: `${APP}/` });
    await kut(1500);

    for (const e of EKRANLAR) {
      if (!e.yol) {
        console.log(`⚠ ${e.nom}: yo'l topilmadi — o'tkazildi`);
        continue;
      }
      const tok = e.token ?? TOKEN;
      await cdp("Runtime.evaluate", {
        expression: `(() => {
          localStorage.setItem("furam_session_token", ${JSON.stringify(tok)});
          localStorage.setItem("furam_locale", ${JSON.stringify(TIL)});
          localStorage.setItem("furam.theme", "light");
          localStorage.setItem("furam.tourSeen", "1");
          localStorage.setItem("furam.splashSeen", "1");
        })()`,
      });
      await cdp("Page.navigate", { url: `${APP}${e.yol}` });

      let bor = false;
      for (let i = 0; i < 60 && !bor; i++) {
        await kut(300);
        const r = await cdp("Runtime.evaluate", {
          expression: `document.body && document.body.innerText.includes(${JSON.stringify(e.tayyor)})`,
          returnByValue: true,
        });
        bor = r.result.value === true;
      }
      /* Shriftlar, rasmlar va animatsiya tugashi */
      await kut(1800 + (e.sekin ?? 0));

      const shot = await cdp("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
      const fayl = join(CHIQISH, `${e.nom}.png`);
      writeFileSync(fayl, Buffer.from(shot.data, "base64"));
      console.log(`${bor ? "✓" : "⚠ (kutilgan matn chiqmadi)"} ${e.nom} → ${fayl}`);
    }
  } finally {
    yop();
  }
}

main().catch((e) => {
  console.error("✖", e.message);
  process.exit(1);
});
