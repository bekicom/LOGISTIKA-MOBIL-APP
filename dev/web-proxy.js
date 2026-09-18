/**
 * Ilovani BRAUZERDA bosib sinash uchun bitta manzil (2026-09-19).
 *
 *   1. cd furam && npm run dev                                   → 3000
 *   2. cd mobil && EXPO_PUBLIC_API_URL=http://localhost:8090 \
 *        npx expo start --web --port 8082                         → 8082
 *   3. node mobil/dev/web-proxy.js                                → 8090
 *   4. brauzerda http://localhost:8090; kirish — lokal bazadagi sinov
 *      hisobining tokeni `localStorage["furam_session_token"]` ga
 *      (`createSessionToken`, `lib/secure-kv.ts` web'da shu yerdan o'qiydi)
 *
 * /api/* → Next (3000), qolgani → Expo web (8082).
 *
 * NEGA PROKSI: ilova va API bir manzilda bo'lmasa brauzer so'rovni CORS
 * bilan to'sadi. `Host` sarlavhasi ATAYLAB o'zgartirilmaydi: server
 * CSRF tekshiruvi uni `Origin` bilan solishtiradi va aks holda «Не
 * пройдена проверка безопасности» qaytaradi. WebSocket (Metro HMR) ham
 * o'tkaziladi — busiz dev klient sahifani qayta-qayta yuklab turadi.
 *
 * Jonli serverga TEGMAYDI. `expo-sqlite` web'da `dev/web-sqlite-stub.js`
 * bilan almashtiriladi (`metro.config.js`).
 */
const http = require("http");
const net = require("net");

const API = { host: "127.0.0.1", port: 3000 };
const WEB = { host: "127.0.0.1", port: 8082 };
const pick = (url) => (url.startsWith("/api/") ? API : WEB);

const server = http.createServer((req, res) => {
  const target = pick(req.url);
  const p = http.request({ ...target, path: req.url, method: req.method, headers: req.headers }, (r) => {
    res.writeHead(r.statusCode || 502, r.headers);
    r.pipe(res);
  });
  p.on("error", (e) => {
    res.writeHead(502, { "Content-Type": "text/plain" });
    res.end(`proxy xato: ${e.message}`);
  });
  req.pipe(p);
});

server.on("upgrade", (req, socket, head) => {
  const target = pick(req.url);
  const conn = net.connect(target.port, target.host, () => {
    const headers = { ...req.headers, host: `${target.host}:${target.port}` };
    conn.write(
      `${req.method} ${req.url} HTTP/${req.httpVersion}\r\n` +
        Object.entries(headers)
          .map(([k, v]) => `${k}: ${v}`)
          .join("\r\n") +
        "\r\n\r\n",
    );
    if (head && head.length) conn.write(head);
    socket.pipe(conn).pipe(socket);
  });
  conn.on("error", () => socket.destroy());
  socket.on("error", () => conn.destroy());
});

server.listen(8090, () => console.log("proxy: http://localhost:8090 (ws bilan)"));
