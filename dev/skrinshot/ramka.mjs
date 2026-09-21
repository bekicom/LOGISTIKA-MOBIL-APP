#!/usr/bin/env node
/**
 * Do'kon skrinshotlari — 2-qadam: brend ramkasi va sarlavha.
 *
 *   node dev/skrinshot/ramka.mjs --til=uz --manba=<olish.mjs papkasi> --chiqish=<papka>
 *
 * Natija: **1080×1920** (9:16) — Google Play telefon skrinshoti
 * talabiga mos (tomonlar nisbati 2:1 dan oshmaydi, 1080 px — tavsiya
 * va reklama bloklariga tushish uchun eng kami).
 *
 * ── TUZILISH ────────────────────────────────────────────────────
 *
 *   · fon — logodagi ko'k (ilovaning kirish ekranlari bilan bir xil),
 *     yuqorida to'q sariq chiziqcha — brendning ikkinchi rangi;
 *   · sarlavha (Manrope ExtraBold) + bir qator izoh;
 *   · telefon — ekran ustida holat paneli (vaqt, aloqa, batareya).
 *     Brauzerda olingan suratda u yo'q, u holda ilova sarlavhasi
 *     ekranning eng chetiga yopishib turardi va telefon «soxta»
 *     ko'rinardi. Panel rangi ekranning o'zidan (yuqori chap nuqta)
 *     olinadi — har ekranda o'z sarlavhasi bilan qo'shilib ketadi;
 *   · telefon pastdan chiqib turadi — ekran kattaroq, yozuv
 *     do'kon ro'yxatidagi kichik ko'rinishda ham o'qiladi.
 *
 * Sarlavhalar bu faylda — do'kon matni ilova lug'atiga kirmaydi.
 */
import { Buffer } from "node:buffer";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { kut, ulan } from "./cdp.mjs";

const arg = (k, d = null) => process.argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3) ?? d;
const TIL = arg("til", "uz");
const MANBA = arg("manba");
const CHIQISH = arg("chiqish", join(tmpdir(), `ramka-${TIL}`));

const BU = dirname(fileURLToPath(import.meta.url));
const SHRIFT = resolve(BU, "../../node_modules/@expo-google-fonts/manrope");
const font = (w, nom) => pathToFileURL(join(SHRIFT, `${w}${nom}`, `Manrope_${w}${nom}.ttf`)).href;

/* Tartib — do'kondagi tartib: birinchi uchtasi ro'yxatda darrov
   ko'rinadi, shuning uchun eng kuchli uchtasi oldinda */
const RAMKALAR = {
  uz: [
    { xom: "02-yuklar", sarlavha: "Yuk va bo'sh mashinalar", izoh: "Yo'nalish va mashina turi bo'yicha qidiring" },
    { xom: "03-reys", sarlavha: "Reys jonli xaritada", izoh: "Har bosqich va qolgan masofa — ko'z oldingizda" },
    { xom: "04-suhbat", sarlavha: "Til to'sig'isiz chat", izoh: "Xabarlar suhbatdosh tiliga tarjima qilinadi" },
    { xom: "01-bosh", sarlavha: "Hammasi bitta ilovada", izoh: "Yuk, transport, reys va daromad — bir joyda" },
    { xom: "06-park", sarlavha: "Park nazoratda", izoh: "Har mashina qayerda va qaysi reysda" },
    { xom: "08-analitika", sarlavha: "Daromad va xarajat hisobi", izoh: "Har mashina va reys bo'yicha foyda" },
    { xom: "05-ai", sarlavha: "AI yordamchi", izoh: "Park, reys va hujjatlar bo'yicha savol bering" },
  ],
  ru: [
    { xom: "02-yuklar", sarlavha: "Грузы и свободные машины", izoh: "Поиск по направлению и типу машины" },
    { xom: "03-reys", sarlavha: "Рейс на живой карте", izoh: "Каждый этап и оставшийся путь — перед глазами" },
    { xom: "04-suhbat", sarlavha: "Чат без языкового барьера", izoh: "Сообщения переводятся на язык собеседника" },
    { xom: "01-bosh", sarlavha: "Всё в одном приложении", izoh: "Грузы, транспорт, рейсы и доход — в одном месте" },
    { xom: "06-park", sarlavha: "Автопарк под контролем", izoh: "Где каждая машина и в каком она рейсе" },
    { xom: "08-analitika", sarlavha: "Учёт доходов и расходов", izoh: "Прибыль по каждой машине и рейсу" },
    { xom: "05-ai", sarlavha: "AI-помощник", izoh: "Спросите о парке, рейсах и документах" },
  ],
};

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");

/* Holat paneli belgilari — aloqa, Wi-Fi, batareya (neytral shakl) */
const BELGILAR = `
<svg width="30" height="20" viewBox="0 0 30 20"><rect x="0" y="13" width="5" height="7" rx="1.2"/><rect x="8" y="9" width="5" height="11" rx="1.2"/><rect x="16" y="5" width="5" height="15" rx="1.2"/><rect x="24" y="0" width="5" height="20" rx="1.2"/></svg>
<svg width="28" height="21" viewBox="0 0 28 21"><path d="M14 20.5 9.4 15.4a6.6 6.6 0 0 1 9.2 0L14 20.5ZM5 11.1l2.4 2.6a9.4 9.4 0 0 1 13.2 0l2.4-2.6a12.9 12.9 0 0 0-18 0ZM.6 6.5 3 9.1a15.6 15.6 0 0 1 22 0l2.4-2.6a19.1 19.1 0 0 0-26.8 0Z"/></svg>
<svg width="44" height="22" viewBox="0 0 44 22"><rect x="1" y="1" width="37" height="20" rx="6" fill="none" stroke-width="2" stroke="currentColor" opacity=".45"/><rect x="4" y="4" width="28" height="14" rx="3.5"/><rect x="40" y="7" width="3" height="8" rx="1.5" opacity=".45"/></svg>`;

function html({ sarlavha, izoh, rasm }) {
  return `<!doctype html><html lang="${TIL}"><head><meta charset="utf-8"><style>
@font-face{font-family:M8;src:url("${font("800", "ExtraBold")}")}
@font-face{font-family:M6;src:url("${font("600", "SemiBold")}")}
@font-face{font-family:M5;src:url("${font("500", "Medium")}")}
html,body{margin:0;width:1080px;height:1920px;overflow:hidden}
body{position:relative;background:
  radial-gradient(90% 55% at 50% 64%, rgba(76,140,230,.38) 0%, rgba(76,140,230,0) 70%),
  linear-gradient(180deg,#0f4a94 0%,#0c3f80 55%,#0a376e 100%)}
.cap{position:absolute;top:92px;left:64px;right:64px;text-align:center}
.bar{width:76px;height:9px;border-radius:5px;background:#f45a18;margin:0 auto 34px}
h1{margin:0;font-family:M8;font-size:70px;line-height:1.08;letter-spacing:-1.4px;color:#fff;text-wrap:balance}
p{margin:22px auto 0;max-width:880px;font-family:M5;font-size:33px;line-height:1.32;color:rgba(222,234,255,.88);text-wrap:balance}
.phone{position:absolute;left:50%;top:404px;width:744px;margin-left:-372px;padding:16px;border-radius:84px;
  background:#0b1526;box-shadow:0 60px 110px rgba(2,10,28,.55),inset 0 0 0 2px rgba(255,255,255,.07)}
.screen{position:relative;border-radius:68px;overflow:hidden;background:var(--sb,#f4f6fa)}
.status{height:78px;display:flex;align-items:center;justify-content:space-between;padding:0 46px 0 54px;
  font-family:M6;font-size:27px;letter-spacing:.3px;color:var(--si,#0f172a)}
.status .ico{display:flex;align-items:center;gap:10px;fill:var(--si,#0f172a);color:var(--si,#0f172a)}
.cam{position:absolute;top:24px;left:50%;width:28px;height:28px;margin-left:-14px;border-radius:50%;background:#0b1526}
.shot{display:block;width:100%}
</style></head><body>
<div class="cap"><div class="bar"></div><h1>${esc(sarlavha)}</h1><p>${esc(izoh)}</p></div>
<div class="phone"><div class="screen" id="ekran">
  <div class="status"><span>12:30</span><span class="ico">${BELGILAR}</span></div>
  <div class="cam"></div>
  <img class="shot" id="rasm" src="${rasm}">
</div></div>
<script>
/* Holat paneli rangi — ekranning yuqori chap nuqtasidan; yozuv rangi
   yorug'ligiga qarab (to'q sarlavhali ekranda oq belgilar) */
const img = document.getElementById("rasm");
window.tayyor = new Promise((ok) => {
  const bitdi = () => {
    const c = document.createElement("canvas");
    c.width = 4; c.height = 4;
    const x = c.getContext("2d");
    x.drawImage(img, 12, 12, 4, 4, 0, 0, 4, 4);
    const [r, g, b] = x.getImageData(1, 1, 1, 1).data;
    const e = document.getElementById("ekran");
    e.style.setProperty("--sb", "rgb(" + r + "," + g + "," + b + ")");
    const yorug = 0.299 * r + 0.587 * g + 0.114 * b;
    e.style.setProperty("--si", yorug > 140 ? "#0f172a" : "#ffffff");
    document.fonts.ready.then(() => ok(true));
  };
  img.complete ? bitdi() : (img.onload = bitdi);
});
</script></body></html>`;
}

async function main() {
  if (!MANBA) {
    console.error("✖ --manba=<olish.mjs chiqargan papka> kerak");
    process.exit(1);
  }
  const ro = RAMKALAR[TIL];
  if (!ro) throw new Error(`Sarlavha yo'q: ${TIL}`);
  mkdirSync(CHIQISH, { recursive: true });

  const { cdp, yop } = await ulan({ port: 9334, til: TIL });
  try {
    await cdp("Page.enable");
    await cdp("Runtime.enable");
    await cdp("Emulation.setDeviceMetricsOverride", { width: 1080, height: 1920, deviceScaleFactor: 1, mobile: false });

    for (const [i, r] of ro.entries()) {
      const png = readFileSync(join(MANBA, `${r.xom}.png`));
      const rasm = `data:image/png;base64,${png.toString("base64")}`;
      const sahifa = join(tmpdir(), `ramka-${TIL}-${i}.html`);
      writeFileSync(sahifa, html({ sarlavha: r.sarlavha, izoh: r.izoh, rasm }));

      await cdp("Page.navigate", { url: pathToFileURL(sahifa).href });
      let ok = false;
      for (let k = 0; k < 40 && !ok; k++) {
        await kut(150);
        const v = await cdp("Runtime.evaluate", { expression: "window.tayyor", awaitPromise: true, returnByValue: true }).catch(() => null);
        ok = v?.result?.value === true;
      }
      await kut(250);
      const shot = await cdp("Page.captureScreenshot", { format: "png" });
      const nom = `${String(i + 1).padStart(2, "0")}-${r.xom.slice(3)}.png`;
      writeFileSync(join(CHIQISH, nom), Buffer.from(shot.data, "base64"));
      console.log(`${ok ? "✓" : "⚠"} ${nom}`);
    }
  } finally {
    yop();
  }
}

main().catch((e) => {
  console.error("✖", e.message);
  process.exit(1);
});
