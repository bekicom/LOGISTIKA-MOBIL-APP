/**
 * Xarita tuvali (2026-09-10).
 *
 * ── NEGA WEBVIEW ────────────────────────────────────────────────
 *
 * `react-native-maps` Android'da Google Maps kalitini talab qiladi
 * (bizda yo'q), iOS'da esa Apple Maps chizadi — bir ilovada ikki
 * xil xarita bo'lardi va CARTO uchun to'langan kalit ishlatilmay
 * qolardi.
 *
 * Tuval webdagi AYNI Leaflet kodini yuritadi (`/api/map/embed`):
 * bir xil plitka, bir xil nishon. «Webda nima bo'lsa mobilda ham»
 * degan qoida xarita uchun shu yo'l bilan harfan bajariladi.
 *
 * ── MATN TUVALDA EMAS ───────────────────────────────────────────
 *
 * Nishon ustidagi yozuvni ILOVA yasab beradi (`badge`), sahifa
 * emas — u sahifada o'zbekcha qotib qolardi (1-qoida). Bosilganda
 * ham popup chiqmaydi: kartochkani ilova chizadi, ya'ni u tarjima
 * qilingan va qorong'i rejimga bo'ysunadi.
 *
 * ── MA'LUMOT `injectJavaScript` BILAN ───────────────────────────
 *
 * `source` ni yangilash sahifani QAYTA YUKLARDI — har filtr
 * o'zgarishida xarita nolga qaytib, odam ko'rib turgan joyini
 * yo'qotardi. Shuning uchun sahifa bir marta yuklanadi va keyin
 * unga faqat ma'lumot kiritiladi.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, View } from "react-native";
import { WebView, type WebViewMessageEvent } from "react-native-webview";
import { Text } from "@/components/Text";
import { API_BASE } from "@/lib/api";
import { color, radius, space, themed } from "@/lib/theme";
import { t } from "@/lib/i18n";

export type CanvasPoint = {
  id: string;
  lat: number;
  lng: number;
  /** Yozuvli tamg'a. Bo'sh bo'lsa dumaloq nishon chiziladi */
  badge?: string | null;
  badgeKind?: "load" | "truck" | "master" | "shop";
  badgeColor?: string;
  /** Dumaloq nishon rangi */
  color?: string;
  /** Dumaloq nishon ichidagi belgi */
  icon?: string;
};

export type CanvasCircle = {
  lat: number;
  lng: number;
  radiusM: number;
  color?: string;
};

export type CanvasLine = {
  points: [number, number][];
  color?: string;
  dashed?: boolean;
};

export type MapCanvasRef = { go: (lat: number, lng: number, zoom?: number) => void };

/**
 * JS satr ichida SATR UZILISHI hisoblanadigan belgilar.
 *
 * `JSON.stringify` ularni qochirmaydi — JSON da ular haqiqiy
 * belgi, JS kodida esa yangi satr. Ma'lumot `injectJavaScript`
 * bilan KOD sifatida kiritilgani uchun bittasi e'lon nomiga
 * tushib qolsa xarita jimgina bo'sh qolardi.
 */
const JS_BREAK = /[\u2028\u2029]/g;


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
}: {
  /** Plitka manzili — serverdan keladi (kalit ilovada saqlanmaydi) */
  tile: string | null;
  credit?: string | null;
  points: CanvasPoint[];
  circles?: CanvasCircle[];
  lines?: CanvasLine[];
  center?: [number, number];
  zoom?: number;
  /** Nuqtalarni ekranga sig'dirish — faqat ma'lumot ALMASHGANDA */
  fit?: boolean;
  onPick?: (id: string) => void;
  /**
   * Xaritaning BO'SH joyiga bosilganda (nishonga emas).
   *
   * Usta ustaxonasining joyini shu bilan belgilaydi: manzilni
   * matn bilan yozish yetarli emas — «Chilonzor, 12-uy» degan
   * yozuvdan xaritada nuqta chiqmaydi va haydovchi uni topa
   * olmaydi.
   */
  onMapPress?: (lat: number, lng: number) => void;
  onReady?: (ref: MapCanvasRef) => void;
  /** Xarita ustida turadigan tugmalar */
  controls?: React.ReactNode;
}) {
  const web = useRef<WebView>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [tries, setTries] = useState(0);

  const send = useCallback((payload: unknown) => {
    /* Ma'lumot JS satr sifatida kiritiladi: ichidagi qo'shtirnoq va
       teskari chiziqlarni `JSON.stringify` ikki qavat qo'yib
       zararsizlantiradi. U+2028/2029 esa JS da satr uzilishi
       hisoblanadi va kodni buzardi — ular ataylab qochiriladi. */
    const raw = JSON.stringify(JSON.stringify(payload)).replace(JS_BREAK, (c) =>
      c === "\u2028" ? "\\u2028" : "\\u2029",
    );
    web.current?.injectJavaScript(`window.FURAM && window.FURAM.set(${raw});true;`);
  }, []);

  // Sahifa tayyor bo'lgach va ma'lumot o'zgargach — qayta kiritamiz
  useEffect(() => {
    if (!ready || !tile) return;
    send({ tile, credit, points, circles, lines, center, zoom, fit });
  }, [ready, tile, credit, points, circles, lines, center, zoom, fit, send]);

  useEffect(() => {
    if (!ready) return;
    onReady?.({
      go: (lat, lng, z) =>
        web.current?.injectJavaScript(`window.FURAM && window.FURAM.go(${lat},${lng},${z ?? 13});true;`),
    });
  }, [ready, onReady]);

  function onMessage(e: WebViewMessageEvent) {
    let msg: { type?: string; id?: string; lat?: number; lng?: number } = {};
    try {
      msg = JSON.parse(e.nativeEvent.data);
    } catch {
      return;
    }
    if (msg.type === "ready") setReady(true);
    else if (msg.type === "pick" && msg.id) onPick?.(msg.id);
    else if (msg.type === "map" && msg.lat != null && msg.lng != null) {
      onMapPress?.(msg.lat, msg.lng);
    }
  }

  if (failed) {
    return (
      <View style={s.fail}>
        <Text style={s.failText}>{t("mob.map.canvasFailed")}</Text>
        <Pressable
          onPress={() => {
            setFailed(false);
            setReady(false);
            setTries((n) => n + 1);
          }}
          style={s.retry}
        >
          <Text style={s.retryText}>{t("mob.ui.retry")}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={s.wrap}>
      <WebView
        /* `key` qayta urinishda sahifani majburan yangilaydi */
        key={tries}
        ref={web}
        source={{ uri: `${API_BASE}/api/map/embed` }}
        onMessage={onMessage}
        onError={() => setFailed(true)}
        onHttpError={() => setFailed(true)}
        /* Xarita barmoq bilan boshqariladi: WebView o'zi
           aylanmasligi kerak, aks holda surish xaritaga yetib
           bormasdan sahifani sudrardi */
        scrollEnabled={false}
        bounces={false}
        overScrollMode="never"
        javaScriptEnabled
        domStorageEnabled
        /* Sahifa faqat o'z serverimizdan yuklanadi */
        originWhitelist={[API_BASE]}
        /* Havolalar xaritada ochilmaydi — tuvalda havola yo'q,
           lekin kutilmagan yo'naltirish ekranni egallamasligi kerak */
        onShouldStartLoadWithRequest={(r) => r.url.startsWith(API_BASE)}
        style={s.web}
        /* Qorong'i rejimda oq miltillash bo'lmasin */
        containerStyle={s.web}
      />
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
  web: { flex: 1, backgroundColor: color.muted },
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
  fail: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: space.lg,
    backgroundColor: color.muted,
  },
  failText: { fontSize: 13, color: color.mutedForeground, textAlign: "center", lineHeight: 19 },
  retry: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: radius.pill,
    backgroundColor: color.brand,
  },
  retryText: { fontSize: 13, fontWeight: "700", color: color.brandForeground },
}));
