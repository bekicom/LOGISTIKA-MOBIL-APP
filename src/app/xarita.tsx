/**
 * Xarita (TZ 09) — 2026-09-10.
 *
 * ── NEGA ILOVADAGI JOYLASHUV WEBDAN BOSHQA ──────────────────────
 *
 * Webda xarita — kengaytirilgan STOL ekrani: chapda filtrlar
 * paneli, o'ngda xarita, pastda ro'yxat. Telefonda bunday joy
 * yo'q va uni siqib solish xaritani pochta markasiga aylantirardi.
 *
 * Shuning uchun bu yerda xarita BUTUN EKRAN, boshqarish esa uning
 * USTIDA: tepada qatlam tugmalari, pastda tanlangan nuqta
 * kartochkasi. Ma'lumot va qoidalar bir xil, joylashuv boshqa.
 *
 * ── NISHON RANGI QORONG'I REJIMDA HAM O'ZGARMAYDI ───────────────
 *
 * Kartochka, tugma va matn — ilovaning yuzasi, ular rejimga
 * bo'ysunadi. Nishon esa XARITA PLITKASI ustida turadi va u
 * qorong'i rejimda ham o'sha rangda qolishi kerak: haydovchi
 * to'q sariq tamg'ani «yuk» deb tanib olgan, kechasi u ko'k
 * bo'lib qolsa xarita qaytadan o'rganishni talab qilardi.
 *
 * ── MEHMON NIMANI KO'RADI ───────────────────────────────────────
 *
 * Ochiq qatlam (yuk, transport, ustaxona, do'kon, chegara) —
 * hammaga; jonli GPS faqat kirganlarga. Bu qarorni SERVER qabul
 * qiladi (`/api/map`): mehmonga transport ro'yxati umuman
 * kelmaydi, ekranda yashirilmaydi.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FlatList, Linking, Pressable, ScrollView, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Location from "expo-location";
import { Text } from "@/components/Text";
import { Header } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { ErrorBox, Skeleton } from "@/components/state";
import { fmtNum, money } from "@/components/cards";
import { MapCanvas, type CanvasCircle, type CanvasPoint, type MapCanvasRef } from "@/components/MapCanvas";
import { api } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { color, radius, space, themed, themeName } from "@/lib/theme";
import { serviceSpecLabel, t } from "@/lib/i18n";

type Kind = "load" | "truck" | "master" | "shop";
const KINDS: Kind[] = ["load", "truck", "master", "shop"];

/* Web'dagi (`map-client.tsx`) ayni ranglar: ikki xarita bir xil
   ko'rinishi kerak */
const KIND_COLOR: Record<Kind, string> = {
  load: "#f45a18",
  truck: "#253569",
  master: "#2f6d4f",
  shop: "#7c3aed",
};
const BORDER_COLOR = "#0891b2";
const STATE_COLOR: Record<string, string> = {
  MOVING: "#16a34a",
  STOPPED: "#f59e0b",
  LOADING: "#3b82f6",
  UNLOADING: "#8b5cf6",
  BORDER: "#0891b2",
  PROBLEM: "#dc2626",
  OFFLINE: "#6b7280",
  IDLE: "#94a3b8",
};
const STATE_ICON: Record<string, string> = {
  MOVING: "🚚",
  STOPPED: "⏸",
  LOADING: "📦",
  UNLOADING: "📤",
  BORDER: "🛃",
  PROBLEM: "⛔",
  OFFLINE: "📡",
  IDLE: "🅿️",
};

type Badge =
  | { kind: "count"; n: number }
  | { kind: "money"; money: { amount: number; currency: string } }
  | { kind: "negotiable" }
  | { kind: "free" }
  | { kind: "text"; text: string };

type Parts = {
  from?: string | null;
  to?: string | null;
  weightT?: number | null;
  capacityT?: number | null;
  volumeM3?: number | null;
  vehicleType?: string | null;
  price?: { amount: number; currency: string } | null;
  negotiable?: boolean;
  specialities?: string[];
  workHours?: string | null;
  address?: string | null;
  approx?: boolean;
};

type PinItem = {
  id: string;
  kind: Kind;
  title: string;
  phone: string | null;
  parts: Parts;
};

type Group = {
  key: string;
  kind: Kind;
  lat: number;
  lng: number;
  km: number | null;
  badge: Badge;
  items: PinItem[];
};

type BorderPin = {
  id: string;
  name: string;
  countryA: string;
  countryB: string;
  mode: string;
  leadDays: number;
  lat: number;
  lng: number;
  pending: number;
  booked: number;
  total: number;
  ageMinutes: number | null;
  ageLevel: "none" | "fresh" | "aging" | "stale";
  suspect: boolean;
};

type Vehicle = {
  id: string;
  vehicleNo: number;
  plate: string;
  typeName: string;
  driverName: string | null;
  tripId: string | null;
  tripNo: number | null;
  state: string;
  lat: number | null;
  lng: number | null;
  speedKmh: number | null;
  placeName: string | null;
  remainingKm: number | null;
  etaAt: string | null;
  lastAt: string | null;
  fromName: string | null;
  toName: string | null;
  loadTitle: string | null;
  hasProblem: boolean;
  queueName: string | null;
  queueAt: string | null;
  docIssues: number;
};

type Resp = {
  tile: { url: string; dark: string; credit: string; premium: boolean };
  center: [number, number];
  zoom: number;
  signedIn: boolean;
  counts: Record<string, number>;
  pins: Group[];
  borders: {
    pins: BorderPin[];
    total: number;
    missing: number;
    missingNames: string[];
  };
  vehicles: Vehicle[];
  zones: { id: string; kind: string; name: string; lat: number; lng: number; radiusM: number }[];
  vehiclePoint: { lat: number; lng: number; plate: string } | null;
};

/** Masofa: yaqinda metr, uzoqda kilometr (`map-find.ts:kmLabel`) */
function kmText(km: number): string {
  if (km < 1) return t("mob.map.metre", { n: Math.round(km * 1000) });
  if (km < 10) return t("mob.map.km", { n: km.toFixed(1) });
  return t("mob.map.km", { n: String(Math.round(km)) });
}

/** Tamg'a matni — SERVER emas, ILOVA yozadi (1-qoida) */
function badgeText(b: Badge): string {
  switch (b.kind) {
    case "count":
      return String(b.n);
    case "money":
      /* Xaritada joy tor: to'liq son sig'maydi va u nishonni
         ekran bo'ylab cho'zib yuborardi. Shuning uchun qisqartma —
         web ham shunday qiladi (`shortMoney`) */
      return shortMoney(b.money.amount, b.money.currency);
    case "negotiable":
      return t("mob.loads.negotiable");
    case "free":
      return t("mob.map.free");
    default:
      return b.text;
  }
}

/**
 * Nishonga sig'adigan narx: 4 500 000 → «4.5 mln».
 *
 * `furam/src/lib/map-find.ts:shortMoney` ning ayni o'zi, lekin
 * birlik nomi LUG'ATDAN olinadi — serverdagi variantida u
 * o'zbekcha qotib qolgan.
 */
function shortMoney(amount: number, currency: string): string {
  if (currency === "UZS") {
    if (amount >= 1_000_000)
      return t("mob.map.mln", { n: (amount / 1_000_000).toFixed(amount % 1_000_000 ? 1 : 0) });
    if (amount >= 1000) return t("mob.map.thousand", { n: String(Math.round(amount / 1000)) });
    return `${fmtNum(amount)} ${t("mob.map.sum")}`;
  }
  if (amount >= 1000)
    return `${(amount / 1000).toFixed(amount % 1000 ? 1 : 0)}k ${currency}`;
  return `${amount} ${currency}`;
}

export default function MapScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [layers, setLayers] = useState<Record<Kind, boolean>>({
    load: true,
    truck: true,
    master: true,
    shop: true,
  });
  const [borderOn, setBorderOn] = useState(true);
  const [mineOn, setMineOn] = useState(true);
  const [picked, setPicked] = useState<string | null>(null);
  const [me, setMe] = useState<{ lat: number; lng: number } | null>(null);
  const [geoErr, setGeoErr] = useState<string | null>(null);
  const canvas = useRef<MapCanvasRef | null>(null);

  /* Qatlam SO'ROVGA qo'shiladi, ekranda yashirilmaydi: o'chirilgan
     qatlamning 200 ta nuqtasini mobil internetda yuklab, keyin
     ko'rsatmaslik bekorga trafik bo'lardi */
  const want = KINDS.filter((k) => layers[k]);
  const near = me ? `&near=${me.lat.toFixed(5)},${me.lng.toFixed(5)}` : "";
  const path = `/api/map?layers=${want.join(",")}${near}`;
  const { data, loading, error, reload } = useApi<Resp>(path, [path]);

  /* Xarita ochildi = bo'lim ishlatildi. Webda ham shunday
     (`SectionUsed`) — aks holda «xaritani sinab ko'ring» eslatmasi
     odam uni ochib bo'lgandan keyin ham abadiy turardi. */
  useEffect(() => {
    if (!data?.signedIn) return;
    void api("/api/onboard/used", { method: "POST", body: { section: "map" } }).catch(() => null);
  }, [data?.signedIn]);

  const onReady = useCallback((ref: MapCanvasRef) => {
    canvas.current = ref;
  }, []);

  async function locate() {
    setGeoErr(null);
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (!perm.granted) {
        setGeoErr(t("mob.map.meDenied"));
        return;
      }
      const p = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const point = { lat: p.coords.latitude, lng: p.coords.longitude };
      setMe(point);
      canvas.current?.go(point.lat, point.lng, 11);
    } catch {
      setGeoErr(t("mob.map.meFailed"));
    }
  }

  const vehicles = useMemo(
    () => (data?.vehicles ?? []).filter((v) => v.lat != null && v.lng != null),
    [data?.vehicles],
  );

  /* ── Tuvalga beriladigan nuqtalar
     Har qatlam ALOHIDA `useMemo` da va `map` bilan yasaladi: bitta
     siklda `push` qilinsa React kompilyatori keshni saqlab qola
     olmaydi (`preserve-manual-memoization` xatosi) va butun
     ekranning memoizatsiyasi bekor bo'lardi. */
  const groupPoints = useMemo<CanvasPoint[]>(
    () =>
      (data?.pins ?? []).map((g) => ({
        id: g.key,
        lat: g.lat,
        lng: g.lng,
        badge: badgeText(g.badge),
        badgeKind: g.kind,
        badgeColor: KIND_COLOR[g.kind],
      })),
    [data?.pins],
  );

  const borderPoints = useMemo<CanvasPoint[]>(
    () =>
      borderOn
        ? (data?.borders?.pins ?? []).map((b) => ({
            id: `border:${b.id}`,
            lat: b.lat,
            lng: b.lng,
            /* Navbat bor bo'lsa SONI yoziladi — chegaraning nomi
               emas: haydovchining savoli «nechta mashina turibdi» */
            badge: b.total > 0 ? String(b.total) : null,
            badgeColor: BORDER_COLOR,
            color: BORDER_COLOR,
            icon: "🛃",
          }))
        : [],
    [data?.borders?.pins, borderOn],
  );

  const vehiclePoints = useMemo<CanvasPoint[]>(
    () =>
      mineOn
        ? vehicles.map((v) => ({
            id: `veh:${v.id}`,
            lat: v.lat as number,
            lng: v.lng as number,
            color: STATE_COLOR[v.state] ?? "#6b7280",
            icon: STATE_ICON[v.state] ?? "🚚",
          }))
        : [],
    [vehicles, mineOn],
  );

  const points = useMemo<CanvasPoint[]>(
    () => [
      ...groupPoints,
      ...borderPoints,
      ...vehiclePoints,
      ...(me ? [{ id: "me", lat: me.lat, lng: me.lng, color: "#1d4ed8", icon: "📍" }] : []),
    ],
    [groupPoints, borderPoints, vehiclePoints, me],
  );

  const circles = useMemo<CanvasCircle[]>(
    () =>
      mineOn
        ? (data?.zones ?? []).map((z) => ({
            lat: z.lat,
            lng: z.lng,
            radiusM: z.radiusM,
            color: "#f45a18",
          }))
        : [],
    [data?.zones, mineOn],
  );

  const dark = themeName() === "dark";
  const tile = data ? (dark ? data.tile.dark : data.tile.url) : null;

  const pickedGroup = data?.pins.find((g) => g.key === picked) ?? null;
  const pickedBorder =
    picked?.startsWith("border:") && data
      ? (data.borders.pins.find((b) => `border:${b.id}` === picked) ?? null)
      : null;
  const pickedVehicle =
    picked?.startsWith("veh:") && data
      ? (vehicles.find((v) => `veh:${v.id}` === picked) ?? null)
      : null;

  return (
    <View style={s.root}>
      <Header
        title={t("mob.map.title")}
        subtitle={data ? t("mob.map.found", { n: pinTotal(data) }) : undefined}
        right={
          <Pressable onPress={reload} hitSlop={8} accessibilityLabel={t("mob.ui.retry")}>
            <Icon name="search" size={20} stroke={color.icon} />
          </Pressable>
        }
      />

      {/* Qatlam tugmalari — xarita USTIDA emas, tepasida: nishonlarni
          yopib qo'ymasligi kerak */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.chips}
      >
        {KINDS.map((k) => (
          <Chip
            key={k}
            label={t(`mob.map.layer.${k}`)}
            n={data?.counts[k] ?? 0}
            on={layers[k]}
            tint={KIND_COLOR[k]}
            onPress={() => setLayers((v) => ({ ...v, [k]: !v[k] }))}
          />
        ))}
        <Chip
          label={t("mob.map.layer.border")}
          n={data?.borders.pins.length ?? 0}
          on={borderOn}
          tint={BORDER_COLOR}
          onPress={() => setBorderOn((v) => !v)}
        />
        {data?.signedIn ? (
          <Chip
            label={t("mob.map.layer.mine")}
            n={vehicles.length}
            on={mineOn}
            tint="#16a34a"
            onPress={() => setMineOn((v) => !v)}
          />
        ) : null}
      </ScrollView>

      {loading && !data ? (
        <View style={s.pad}>
          <Skeleton rows={4} />
        </View>
      ) : error && !data ? (
        <View style={s.pad}>
          <ErrorBox message={error} onRetry={reload} />
        </View>
      ) : (
        <MapCanvas
          tile={tile}
          credit={data?.tile.credit}
          points={points}
          circles={circles}
          center={data?.center}
          zoom={data?.zoom}
          onPick={setPicked}
          onReady={onReady}
          controls={
            <Pressable
              onPress={() => void locate()}
              style={s.meBtn}
              accessibilityLabel={t("mob.map.me")}
            >
              <Icon name="map-pin" size={19} stroke="#fff" />
            </Pressable>
          }
        />
      )}

      {/* Kalitsiz plitkada CARTO watermark'i chiqadi — yashirmaymiz */}
      {data && !data.tile.premium ? (
        <Text style={[s.foot, { paddingBottom: insets.bottom + 6 }]}>
          {t("mob.map.watermark")}
        </Text>
      ) : null}

      {geoErr ? <Text style={s.geoErr}>{geoErr}</Text> : null}

      {!data?.signedIn && data ? (
        <Text style={[s.foot, { paddingBottom: insets.bottom + 6 }]}>
          {t("mob.map.guestHint")}
        </Text>
      ) : null}

      {picked ? (
        <View style={[s.sheet, { paddingBottom: insets.bottom + space.md }]}>
          <Pressable onPress={() => setPicked(null)} hitSlop={10} style={s.sheetClose}>
            <Icon name="close" size={18} stroke={color.icon} />
          </Pressable>

          {pickedGroup ? (
            /* `FlatList`, `ScrollView` emas (4-qoida): bitta guruhda
               BITTA shahardan chiqqan hamma e'lon turadi — Toshkentda
               u yuzta bo'lishi mumkin */
            <FlatList
              style={s.sheetScroll}
              data={pickedGroup.items}
              keyExtractor={(it) => it.id}
              showsVerticalScrollIndicator={false}
              ListHeaderComponent={
                pickedGroup.km != null ? (
                  <Text style={s.km}>{kmText(pickedGroup.km)}</Text>
                ) : null
              }
              renderItem={({ item }) => (
                <PinCard item={item} onOpen={() => openPin(item, router)} />
              )}
            />
          ) : pickedBorder ? (
            <BorderCard b={pickedBorder} onOpen={() => router.push("/navbat")} />
          ) : pickedVehicle ? (
            <VehicleCard v={pickedVehicle} onOpen={() => router.push(`/reys/${pickedVehicle.tripId}`)} />
          ) : (
            <Text style={s.sub}>{t("mob.map.nothing")}</Text>
          )}
        </View>
      ) : null}

      {data && data.borders.missing > 0 && borderOn ? (
        <Text style={s.missing}>{t("mob.map.borderMissing", { n: data.borders.missing })}</Text>
      ) : null}
    </View>
  );
}

function pinTotal(d: Resp): number {
  return d.pins.reduce((n, g) => n + g.items.length, 0);
}

/** Nuqtadan ILOVANING o'z ekraniga — web havolasi ishlatilmaydi */
function openPin(it: PinItem, router: ReturnType<typeof useRouter>) {
  const id = it.id.split(":")[1];
  if (it.kind === "load") router.push(`/yuk/${id}`);
  else if (it.kind === "truck") router.push(`/mashina/${id}`);
  /* Usta sahifasi ilovada ham yo'q: buyurtma MUAMMOdan boshlanadi
     va mos ustalarga xabar o'zi ketadi (web ham `/service/new`) */
  else if (it.kind === "master") router.push("/usta-chaqirish");
  else router.push("/zapchast");
}

function Chip({
  label,
  n,
  on,
  tint,
  onPress,
}: {
  label: string;
  n: number;
  on: boolean;
  tint: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[s.chip, on && { backgroundColor: tint, borderColor: tint }]}
      accessibilityRole="switch"
      accessibilityState={{ checked: on }}
    >
      <Text style={[s.chipText, on && s.chipTextOn]}>{label}</Text>
      <Text style={[s.chipN, on && s.chipTextOn]}>{n}</Text>
    </Pressable>
  );
}

function PinCard({ item, onOpen }: { item: PinItem; onOpen: () => void }) {
  const p = item.parts;
  /* Jumla ILOVADA yig'iladi: server faqat qismlarni yuboradi
     (1-qoida). Bo'sh qismlar tashlanadi — «Toshkent →  · ·» degan
     satr chiqmasligi kerak */
  const line =
    item.kind === "load" || item.kind === "truck"
      ? [
          p.from && p.to ? `${p.from} → ${p.to}` : (p.from ?? p.to),
          p.weightT ? t("mob.map.tonn", { n: String(p.weightT) }) : null,
          p.capacityT ? t("mob.map.tonn", { n: String(p.capacityT) }) : null,
          p.volumeM3 ? t("mob.map.m3", { n: String(p.volumeM3) }) : null,
          p.vehicleType,
        ]
          .filter(Boolean)
          .join(" · ")
      : [
          (p.specialities ?? []).slice(0, 3).map(serviceSpecLabel).join(", ") || null,
          p.workHours,
          p.address,
        ]
          .filter(Boolean)
          .join(" · ");

  const price = p.negotiable
    ? t("mob.loads.negotiable")
    : p.price
      ? money(p.price.amount, p.price.currency)
      : null;

  return (
    <View style={s.card}>
      <View style={{ flex: 1 }}>
        <Text style={s.cardTitle} numberOfLines={2}>
          {item.title}
        </Text>
        {line ? (
          <Text style={s.sub} numberOfLines={2}>
            {line}
          </Text>
        ) : null}
        {p.approx ? <Text style={s.approx}>{t("mob.map.approx")}</Text> : null}
        {price ? <Text style={s.price}>{price}</Text> : null}
      </View>

      <View style={s.cardBtns}>
        {item.phone ? (
          <Pressable
            onPress={() => void Linking.openURL(`tel:${item.phone}`)}
            style={s.ghost}
          >
            <Icon name="phone" size={16} stroke={color.brand} />
            <Text style={s.ghostText}>{t("mob.clink.call")}</Text>
          </Pressable>
        ) : null}
        <Pressable onPress={onOpen} style={s.primary}>
          <Text style={s.primaryText}>{t("mob.map.open")}</Text>
        </Pressable>
      </View>
    </View>
  );
}

function BorderCard({ b, onOpen }: { b: BorderPin; onOpen: () => void }) {
  return (
    <View style={s.card}>
      <View style={{ flex: 1 }}>
        <Text style={s.cardTitle}>{b.name}</Text>
        <Text style={s.sub}>
          {`${b.countryA} — ${b.countryB} · ${t(`mob.map.mode.${b.mode}`)}`}
        </Text>
        <Text style={s.sub}>
          {[
            t("mob.map.queuePending", { n: b.pending }),
            t("mob.map.queueBooked", { n: b.booked }),
          ].join(" · ")}
        </Text>
        {/* Ma'lumot YOSHI yashirilmaydi: kechagi «3 soat kutish» ga
            ishonib yo'lga chiqqan odam chegarada boshqa manzara
            ko'radi */}
        <Text style={b.ageLevel === "stale" ? s.ageBad : s.sub}>
          {b.ageMinutes == null
            ? t("mob.map.ageNone")
            : t("mob.map.age", { n: agoText(b.ageMinutes) })}
        </Text>
        {b.suspect ? <Text style={s.ageBad}>{t("mob.map.suspect")}</Text> : null}
      </View>
      <View style={s.cardBtns}>
        <Pressable onPress={onOpen} style={s.primary}>
          <Text style={s.primaryText}>{t("mob.map.openQueue")}</Text>
        </Pressable>
      </View>
    </View>
  );
}

function agoText(minutes: number): string {
  if (minutes < 60) return t("mob.ago.min", { n: minutes });
  if (minutes < 1440) return t("mob.ago.hour", { n: Math.round(minutes / 60) });
  return t("mob.ago.day", { n: Math.round(minutes / 1440) });
}

function VehicleCard({ v, onOpen }: { v: Vehicle; onOpen: () => void }) {
  return (
    <View style={s.card}>
      <View style={{ flex: 1 }}>
        <View style={s.vehHead}>
          <Text style={s.cardTitle}>{v.plate}</Text>
          <View style={[s.state, { backgroundColor: STATE_COLOR[v.state] ?? "#6b7280" }]}>
            <Text style={s.stateText}>{t(`mob.map.state.${v.state}`)}</Text>
          </View>
        </View>
        <Text style={s.sub}>
          {[v.typeName, v.driverName, v.tripNo ? `#${v.tripNo}` : null]
            .filter(Boolean)
            .join(" · ")}
        </Text>
        {v.fromName && v.toName ? (
          <Text style={s.sub}>{`${v.fromName} → ${v.toName}`}</Text>
        ) : null}
        {v.placeName ? <Text style={s.sub}>{v.placeName}</Text> : null}
        <Text style={s.sub}>
          {[
            v.speedKmh != null ? t("mob.map.speed", { n: Math.round(v.speedKmh) }) : null,
            v.remainingKm != null ? t("mob.map.remaining", { n: Math.round(v.remainingKm) }) : null,
            v.lastAt ? t("mob.map.lastSeen", { n: agoText(minutesSince(v.lastAt)) }) : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        </Text>
        {v.docIssues > 0 ? (
          <Text style={s.ageBad}>{t("mob.map.docIssues", { n: v.docIssues })}</Text>
        ) : null}
        {v.queueName ? (
          <Text style={s.sub}>{t("mob.map.queueAt", { name: v.queueName })}</Text>
        ) : null}
      </View>
      {v.tripId ? (
        <View style={s.cardBtns}>
          <Pressable onPress={onOpen} style={s.primary}>
            <Text style={s.primaryText}>{t("mob.map.openTrip")}</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

function minutesSince(iso: string): number {
  return Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
}

const s = themed(() => ({
  root: { flex: 1, backgroundColor: color.background },
  pad: { padding: space.md },
  chips: { paddingHorizontal: space.md, paddingBottom: 8, gap: 7 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.card,
  },
  chipText: { fontSize: 12.5, fontWeight: "700", color: color.foreground },
  chipTextOn: { color: "#fff" },
  chipN: { fontSize: 11.5, fontWeight: "700", color: color.mutedForeground },
  meBtn: {
    position: "absolute",
    left: 14,
    bottom: 18,
    width: 42,
    height: 42,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: color.navy,
  },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: "58%",
    paddingTop: space.md,
    paddingHorizontal: space.md,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    backgroundColor: color.card,
    borderTopWidth: 1,
    borderColor: color.border,
  },
  sheetScroll: { maxHeight: 320 },
  sheetClose: { position: "absolute", right: 12, top: 10, zIndex: 2, padding: 4 },
  card: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: color.border,
  },
  cardTitle: { fontSize: 14, fontWeight: "800", color: color.foreground },
  sub: { fontSize: 12, color: color.mutedForeground, marginTop: 2, lineHeight: 17 },
  price: { fontSize: 13.5, fontWeight: "800", color: color.brandText, marginTop: 4 },
  approx: { fontSize: 11, color: color.warningText, marginTop: 3 },
  ageBad: { fontSize: 12, color: color.dangerText, marginTop: 2, lineHeight: 17 },
  km: { fontSize: 12, fontWeight: "700", color: color.mutedForeground, marginBottom: 4 },
  cardBtns: { gap: 6, alignItems: "stretch" },
  primary: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: radius.pill,
    backgroundColor: color.brand,
  },
  primaryText: { fontSize: 12.5, fontWeight: "800", color: color.brandForeground },
  ghost: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.brand,
  },
  ghostText: { fontSize: 12, fontWeight: "700", color: color.brand },
  vehHead: { flexDirection: "row", alignItems: "center", gap: 8 },
  state: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill },
  stateText: { fontSize: 10.5, fontWeight: "800", color: "#fff" },
  foot: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: space.md,
    paddingTop: 6,
    fontSize: 10.5,
    color: color.mutedForeground,
    textAlign: "center",
    backgroundColor: color.background,
  },
  geoErr: {
    position: "absolute",
    left: space.md,
    right: space.md,
    bottom: 70,
    padding: 10,
    borderRadius: radius.card,
    backgroundColor: color.dangerSoft,
    fontSize: 12,
    color: color.dangerText,
  },
  missing: {
    position: "absolute",
    left: space.md,
    right: space.md,
    top: 4,
    fontSize: 10.5,
    color: color.warningText,
    textAlign: "center",
  },
}));
