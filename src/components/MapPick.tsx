/**
 * Xaritadan JOY BELGILASH — 2026-09-13.
 *
 * ── NEGA KERAK ──────────────────────────────────────────────────
 *
 * Usta profilida joy faqat HUDUD bo'lib tanlanardi (`locationId`)
 * va serverga `lat`/`lng` UMUMAN yuborilmasdi. Server esa ularni
 * qabul qiladi va xarita aynan shu ikki songa qarab nuqta chizadi
 * (`map-find-server.ts`).
 *
 * Natijasi: ilovadan ro'yxatdan o'tgan usta xaritada HECH QACHON
 * ko'rinmasdi. Jonli bazada xaritadagi ustalar soni nol bo'lgani
 * ham shundan. Webda bu 2026-09-05 dan bor (`place-picker.tsx`).
 *
 * ── HUDUD O'RNIGA EMAS, USTIGA ──────────────────────────────────
 *
 * Hudud qoladi: u qidiruv va ro'yxat uchun kerak («Toshkentdagi
 * ustalar»). Xaritadagi nuqta esa boshqa savolga javob beradi —
 * «menga eng yaqini qaysi». Ikkisi bir-birini almashtirmaydi.
 *
 * ── «HOZIRGI JOYIM» TUGMASI ─────────────────────────────────────
 *
 * Usta ko'p hollarda o'z ustaxonasida turib profil to'ldiradi.
 * Shunda xaritani surib, kattalashtirib, barmoq bilan aniq nuqta
 * qo'yishdan ko'ra bitta tugma tezroq va aniqroq.
 */
import { useEffect, useState } from "react";
import { Modal, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Location from "expo-location";
import { Text } from "@/components/Text";
import { Icon } from "@/components/Icon";
import { Button } from "@/components/ui";
import { MapCanvas, type MapCanvasRef } from "@/components/MapCanvas";
import { useApi } from "@/lib/use-api";
import { color, radius, space, themed, themeName } from "@/lib/theme";
import { t } from "@/lib/i18n";

type Tile = { url: string; dark: string; credit: string; premium: boolean };

export function MapPick({
  open,
  lat,
  lng,
  title,
  onClose,
  onDone,
}: {
  open: boolean;
  /** Avval belgilangan joy — bo'lsa xarita shu yerdan ochiladi */
  lat: number | null;
  lng: number | null;
  title: string;
  onClose: () => void;
  /** `null` — joy olib tashlandi */
  onDone: (p: { lat: number; lng: number } | null) => void;
}) {
  const insets = useSafeAreaInsets();
  const [point, setPoint] = useState<{ lat: number; lng: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [canvas, setCanvas] = useState<MapCanvasRef | null>(null);

  /* Butun xarita emas, faqat plitka manzili so'raladi: bu oynada
     nuqtalar, chegaralar va transport kerak emas */
  const { data: tile } = useApi<Tile>(open ? "/api/map/tile" : null, [open]);

  // Ochilganda saqlangan joydan boshlanadi
  useEffect(() => {
    if (open) {
      setPoint(lat != null && lng != null ? { lat, lng } : null);
      setErr(null);
    }
  }, [open, lat, lng]);

  async function meniki() {
    setErr(null);
    setBusy(true);
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (!perm.granted) {
        setErr(t("mob.map.meDenied"));
        return;
      }
      const p = await Location.getCurrentPositionAsync({
        /* Ustaxona nuqtasi uchun eng yuqori aniqlik: 100 metr
           xatolik haydovchini qo'shni ko'chaga yuborardi */
        accuracy: Location.Accuracy.High,
      });
      const next = { lat: p.coords.latitude, lng: p.coords.longitude };
      setPoint(next);
      canvas?.go(next.lat, next.lng, 16);
    } catch {
      setErr(t("mob.map.meFailed"));
    } finally {
      setBusy(false);
    }
  }

  const dark = themeName() === "dark";

  return (
    <Modal visible={open} animationType="slide" onRequestClose={onClose}>
      <View style={[s.root, { paddingTop: insets.top }]}>
        <View style={s.head}>
          <Pressable onPress={onClose} hitSlop={10} style={s.back}>
            <Icon name="back" size={22} stroke={color.foreground} />
          </Pressable>
          <Text style={s.title} numberOfLines={1}>
            {title}
          </Text>
        </View>

        <MapCanvas
          tile={tile ? (dark ? tile.dark : tile.url) : null}
          credit={tile?.credit}
          points={
            point
              ? [
                  {
                    id: "pick",
                    lat: point.lat,
                    lng: point.lng,
                    color: "#f45a18",
                    icon: "📍",
                  },
                ]
              : []
          }
          center={point ? [point.lat, point.lng] : undefined}
          zoom={point ? 15 : undefined}
          onMapPress={(la, ln) => setPoint({ lat: la, lng: ln })}
          onReady={setCanvas}
          controls={
            <Pressable
              onPress={() => void meniki()}
              disabled={busy}
              style={s.meBtn}
              accessibilityLabel={t("mapUi.useMyPlace")}
            >
              <Icon name="map-pin" size={18} stroke="#fff" />
              <Text style={s.meText}>{t("mapUi.useMyPlace")}</Text>
            </Pressable>
          }
        />

        <View style={[s.foot, { paddingBottom: insets.bottom + space.md }]}>
          {err ? <Text style={s.err}>{err}</Text> : null}
          <Text style={s.hint}>{t("mapUi.pickHint")}</Text>
          {point ? (
            /* Koordinata KO'RSATILADI: odam nuqtani to'g'ri joyga
               qo'yganini raqamdan ham tekshira oladi va kerak
               bo'lsa boshqa joyda (masalan Google Maps'da) solishtiradi */
            <Text style={s.coord}>{`${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}`}</Text>
          ) : null}

          <View style={s.btns}>
            {point ? (
              <Pressable onPress={() => onDone(null)} style={s.clear}>
                <Text style={s.clearText}>{t("mapUi.clearPlace")}</Text>
              </Pressable>
            ) : null}
            <View style={{ flex: 1 }}>
              <Button
                title={t("mob.common.save")}
                onPress={() => onDone(point)}
                disabled={!point}
              />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const s = themed(() => ({
  root: { flex: 1, backgroundColor: color.background },
  head: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: space.md,
    paddingBottom: 10,
  },
  back: { padding: 4 },
  title: { flex: 1, fontSize: 16, fontWeight: "800", color: color.foreground },
  meBtn: {
    position: "absolute",
    left: 14,
    bottom: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius.pill,
    backgroundColor: color.navy,
  },
  meText: { fontSize: 12.5, fontWeight: "700", color: "#fff" },
  foot: {
    paddingHorizontal: space.md,
    paddingTop: space.md,
    gap: 8,
    borderTopWidth: 1,
    borderColor: color.border,
    backgroundColor: color.card,
  },
  hint: { fontSize: 12, color: color.mutedForeground, lineHeight: 17 },
  coord: { fontSize: 12.5, fontWeight: "700", color: color.foreground },
  err: { fontSize: 12, color: color.dangerText },
  btns: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 4 },
  clear: {
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.border,
  },
  clearText: { fontSize: 12.5, fontWeight: "700", color: color.mutedForeground },
}));
