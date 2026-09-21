/**
 * Chrome'ni DevTools protokoli (CDP) orqali boshqarish — kutubxonasiz.
 *
 * `olish.mjs` (ilova ekranlari) va `ramka.mjs` (do'kon ramkasi) ikkalasi
 * ham shu yerdan foydalanadi. Node 22 ning o'z `WebSocket` i yetadi —
 * Puppeteer/Playwright (~150 MB Chromium bilan) o'rnatilmaydi, tizimdagi
 * Chrome ishlatiladi.
 */
import { spawn } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

export const CHROME = process.env.CHROME ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";

export const kut = (ms) => new Promise((r) => setTimeout(r, ms));

/** Yashirin Chrome ochadi va bitta sahifaga ulanadi */
export async function ulan({ port = 9333, til = "uz" } = {}) {
  const profil = mkdtempSync(join(tmpdir(), "furam-chrome-"));
  const chrome = spawn(
    CHROME,
    [
      "--headless=new",
      `--remote-debugging-port=${port}`,
      `--user-data-dir=${profil}`,
      "--no-first-run",
      "--no-default-browser-check",
      "--hide-scrollbars",
      "--force-color-profile=srgb",
      /* `file://` sahifa `file://` shriftni o'qiy olsin (ramka) */
      "--allow-file-access-from-files",
      `--lang=${til === "ru" ? "ru-RU" : "uz-UZ"}`,
      "about:blank",
    ],
    { stdio: "ignore" },
  );

  let sahifa = null;
  for (let i = 0; i < 50 && !sahifa; i++) {
    await kut(200);
    try {
      const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
      sahifa = list.find((t) => t.type === "page");
    } catch {
      /* Chrome hali ko'tarilmagan */
    }
  }
  if (!sahifa) {
    chrome.kill();
    throw new Error("Chrome ishga tushmadi");
  }

  const ws = new WebSocket(sahifa.webSocketDebuggerUrl);
  await new Promise((r, j) => {
    ws.onopen = r;
    ws.onerror = j;
  });
  let id = 0;
  const kutilayotgan = new Map();
  ws.onmessage = (e) => {
    const m = JSON.parse(e.data);
    if (m.id && kutilayotgan.has(m.id)) {
      const { r, j } = kutilayotgan.get(m.id);
      kutilayotgan.delete(m.id);
      if (m.error) j(new Error(m.error.message));
      else r(m.result);
    }
  };
  const cdp = (method, params = {}) =>
    new Promise((r, j) => {
      const n = ++id;
      kutilayotgan.set(n, { r, j });
      ws.send(JSON.stringify({ id: n, method, params }));
    });

  return {
    cdp,
    yop: () => {
      ws.close();
      chrome.kill();
    },
  };
}
