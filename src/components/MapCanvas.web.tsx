/**
 * Xarita — BRAUZER varianti (faqat Expo web, 2026-09-21).
 *
 * Telefonda xarita `react-native-webview` ichida ochiladi. Brauzerda
 * u kutubxona ishlamaydi va xarita o'rnida qizil «React Native
 * WebView does not support this platform» yozuvi chiqardi — ya'ni
 * xaritali ekranlarni (reys, bosh sahifa, xarita) brauzerda na
 * sinab, na do'kon uchun suratga olib bo'lardi.
 *
 * Metro `.web.tsx` ni faqat web yig'ishda oladi — telefondagi
 * `MapCanvas.tsx` ga bu fayl TEGMAYDI.
 *
 * Sahifa o'sha: `/api/map/embed`. Farqi faqat ko'prikda:
 *
 *   · telefonda ma'lumot `injectJavaScript` bilan kiritiladi —
 *     bu yerda `iframe.contentWindow.FURAM.set(...)` to'g'ridan;
 *   · sahifa javobni `window.ReactNativeWebView.postMessage` ga
 *     yozadi — bu yerda o'sha nomdagi obyektni o'zimiz qo'yamiz.
 *
 * ⚠️ SAHIFA `src` BILAN EMAS, `srcDoc` BILAN OCHILADI. Server hamma
 * sahifaga `X-Frame-Options: DENY` va `frame-ancestors 'none'`
 * qo'yadi (boshqa sayt FURAM'ni ramkaga olib, odamni aldamasin) —
 * birinchi urinishda brauzer ramkani to'sdi va ilova yiqildi. Bu
 * himoyaga tegilmaydi: HTML `fetch` bilan olinadi va ramka ICHIDA
 * chiziladi. Sarlavhalar faqat manzilga o'tishda ishlaydi, `srcDoc`
 * esa ilovaning o'z hujjati — manbasi ham o'sha, ya'ni
 * `contentWindow` ga yetiladi. Sahifadagi `/api/map/embed/*.js`
 * nisbiy havolalari ilova manzili bo'yicha ochiladi (proksi).
 *
 * Ko'prik o'rnatilmasa (masalan, boshqa manbadan ochilgan bo'lsa)
 * ilova YIQILMAYDI — xarita shunchaki bo'sh qoladi.
 */
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { API_BASE } from "@/lib/api";
import { color, themed } from "@/lib/theme";
import type { CanvasCircle, CanvasLine, CanvasPoint, MapCanvas as Asl, MapCanvasRef } from "./MapCanvas";

export type { CanvasCircle, CanvasLine, CanvasPoint, MapCanvasRef };

type Props = Parameters<typeof Asl>[0];

/** Xarita sahifasining oynasi — `embed/lib.ts` dagi global nomlar */
type Sahifa = Window & {
  FURAM?: { set: (raw: string) => void; go: (lat: number, lng: number, zoom: number) => void };
  ReactNativeWebView?: { postMessage: (data: string) => void };
};

export function MapCanvas({
  tile,
  credit,
  points,
  circles = [],
  lines = [],
  center,
  zoom,
  fit = false,
  onPick,
  onMapPress,
  onReady,
  controls,
}: Props) {
  /* Oyna ref'i HODISADA yoziladi (`onLoad`), chizishda emas —
     `react-hooks/refs` chizish paytida ref'ga tegishni taqiqlaydi */
  const oynaRef = useRef<Sahifa | null>(null);
  const [ready, setReady] = useState(false);
  const [html, setHtml] = useState<string | null>(null);

  useEffect(() => {
    let tirik = true;
    fetch(`${API_BASE}/api/map/embed`)
      .then((r) => (r.ok ? r.text() : null))
      .then((t) => {
        if (tirik && t) setHtml(t);
      })
      .catch(() => {});
    return () => {
      tirik = false;
    };
  }, []);

  /* Qayta chaqiruvlar ref'da: ko'prik bir marta o'rnatiladi, lekin
     har doim eng so'nggi funksiyani chaqirishi kerak */
  const cb = useRef({ onPick, onMapPress });
  useEffect(() => {
    cb.current = { onPick, onMapPress };
  });

  const oyna = () => oynaRef.current;

  function yuklandi(el: HTMLIFrameElement) {
    const w = el.contentWindow as Sahifa | null;
    if (!w) return;
    oynaRef.current = w;
    try {
      w.ReactNativeWebView = {
        postMessage: (data: string) => {
          let msg: { type?: string; id?: string; lat?: number; lng?: number } = {};
          try {
            msg = JSON.parse(data);
          } catch {
            return;
          }
          if (msg.type === "pick" && msg.id) cb.current.onPick?.(msg.id);
          else if (msg.type === "map" && msg.lat != null && msg.lng != null) {
            cb.current.onMapPress?.(msg.lat, msg.lng);
          }
        },
      };
      setReady(true);
    } catch {
      /* Boshqa manba — ko'prik yo'q, xarita bo'sh qoladi */
    }
  }

  useEffect(() => {
    if (!ready || !tile) return;
    try {
      oyna()?.FURAM?.set(JSON.stringify({ tile, credit, points, circles, lines, center, zoom, fit }));
    } catch {
      /* sahifa hali tayyor emas yoki boshqa manba */
    }
  }, [ready, tile, credit, points, circles, lines, center, zoom, fit]);

  useEffect(() => {
    if (!ready) return;
    onReady?.({
      go: (lat, lng, z) => {
        try {
          oyna()?.FURAM?.go(lat, lng, z ?? 13);
        } catch {
          /* yuqoridagi bilan bir xil */
        }
      },
    });
  }, [ready, onReady]);

  return (
    <View style={s.wrap}>
      {html ? (
        <iframe
          srcDoc={html}
          onLoad={(e) => yuklandi(e.currentTarget)}
          title="map"
          style={{ border: 0, width: "100%", height: "100%", display: "block" }}
        />
      ) : null}
      {!ready ? (
        <View style={s.load} pointerEvents="none">
          <ActivityIndicator color={color.brand} />
        </View>
      ) : null}
      {controls}
    </View>
  );
}

const s = themed(() => ({
  wrap: { flex: 1, backgroundColor: color.muted, overflow: "hidden" },
  load: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: color.muted,
  },
}));
