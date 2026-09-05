/** E'lon va reys kartochkalari — bosh sahifa, yuklar va reyslarda ishlatiladi. */
import { useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { Icon } from "./Icon";
import { TruckIcon } from "./TruckIcon";
import { API_BASE } from "@/lib/api";
import { vehiclePhoto } from "@/lib/img";
import { color, font, radius, shadow, space } from "@/lib/theme";
import { t, tOr } from "@/lib/i18n";

/* ─────────────────────────────────────────────── umumiy bo'laklar */

export function Route({ from, fromC, to, toC, size = 18 }: {
  from: string; fromC?: string | null; to: string; toC?: string | null; size?: number;
}) {
  return (
    <View style={s.route}>
      <View style={{ flex: 1 }}>
        <Text style={[s.city, { fontSize: size }]} numberOfLines={1}>{from}</Text>
        {fromC ? <Text style={s.country}>{country(fromC)}</Text> : null}
      </View>
      <View style={{ paddingTop: 5 }}>
        <Icon name="arrow-right" size={19} stroke="#94a3b8" />
      </View>
      <View style={{ flex: 1, alignItems: "flex-end" }}>
        <Text style={[s.city, { fontSize: size, textAlign: "right" }]} numberOfLines={1}>{to}</Text>
        {toC ? <Text style={s.country}>{country(toC)}</Text> : null}
      </View>
    </View>
  );
}

/* Davlat nomi lug'atdan olinadi — ilgari shu yerda o'zbekcha
   ro'yxat turardi va rus tilidagi ekranda ham o'zbekcha chiqardi. */
const country = (code: string) => t(`jobCatalog.countries.${code}`);

export function Chip({ text, tone = "muted" }: { text: string; tone?: "muted" | "success" | "brand" | "warning" | "danger" | "info" }) {
  const bg = {
    muted: color.muted, success: "#16a34a1f", brand: "#f45a181f",
    warning: "#b453091f", danger: "#dc26261a", info: "#1d4ed81a",
  }[tone];
  const fg = {
    muted: "#475569", success: "#15803d", brand: "#c2490f",
    warning: "#92400e", danger: "#b91c1c", info: "#1e40af",
  }[tone];
  return (
    <View style={[s.chip, { backgroundColor: bg }]}>
      <Text style={[s.chipText, { color: fg }]}>{text}</Text>
    </View>
  );
}

export function StatusChip({ label, tone }: { label: string; tone: "brand" | "warning" | "success" | "info" | "muted" | "danger" }) {
  const dot = { brand: color.brand, warning: color.warning, success: color.success, info: color.info, muted: "#94a3b8", danger: color.danger }[tone];
  const bg = { brand: "#f45a181f", warning: "#b453091f", success: "#16a34a1f", info: "#1d4ed81a", muted: color.muted, danger: "#dc26261a" }[tone];
  const fg = { brand: "#c2490f", warning: "#92400e", success: "#15803d", info: "#1e40af", muted: "#475569", danger: "#b91c1c" }[tone];
  return (
    <View style={[s.chip, { backgroundColor: bg, flexDirection: "row", alignItems: "center", gap: 6 }]}>
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: dot }} />
      <Text style={[s.chipText, { color: fg, fontWeight: "600" }]}>{label}</Text>
    </View>
  );
}

/** Reys holatiga rang — TZ dagi jadval bilan bir xil */
export function toneFor(status: string) {
  if (status === "AT_BORDER" || status === "TO_LOADING" || status === "LOADED") return "warning" as const;
  if (status === "ON_ROAD" || status === "NEAR_DESTINATION") return "brand" as const;
  if (status === "UNLOADED" || status === "CLOSED") return "success" as const;
  if (status === "CANCELLED") return "danger" as const;
  if (status === "CLOSING") return "muted" as const;
  return "info" as const;
}

/* ─────────────────────────────────────────────── e'lon kartasi */

export type Listing = {
  id: string;
  title?: string | null;
  from: string; fromCountry?: string | null;
  to: string; toCountry?: string | null;
  weightT?: number | null;
  vehicleType?: string | null;
  price?: number | null;
  currency?: string;
  isNegotiable?: boolean;
  isReadyNow?: boolean;
  isTop?: boolean;
  createdAt?: string;
  owner?: { name: string } | null;
  /* Transport turining KALITI — rasm shundan topiladi. Nomning
     o'zi yaramaydi: u tarjima qilinadi. */
  vehicleTypeKey?: string | null;
};

/**
 * Valyutasiz son: 620 000 km, 24 oy, 214 ko'rish.
 *
 * `money()` bilan bir xil ajratgich ishlatiladi — bir ekranda ikki
 * xil yozilishi («620000» va «58 000») e'tiborni tortadi va
 * beparvolikdek ko'rinadi.
 */
export function fmtNum(n: number): string {
  return new Intl.NumberFormat("ru-RU").format(n);
}

export function money(price: number | null | undefined, currency = "UZS", negotiable?: boolean) {
  if (negotiable || price == null) return null;
  // Web'dagidek: ru-RU bo'shliq bilan ajratadi — 28 000 000
  return `${new Intl.NumberFormat("ru-RU").format(price)} ${currency}`;
}

/* Qisqartmalar o'zbekcha qotib qolgan edi («daq», «soat», «kun») va
   ruscha interfeysda ham shundayligicha chiqardi (2026-09-04). */
export function ago(iso?: string) {
  if (!iso) return "";
  const m = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (m < 60) return t("mob.ago.min", { n: m });
  const h = Math.round(m / 60);
  if (h < 24) return t("mob.ago.hour", { n: h });
  return t("mob.ago.day", { n: Math.round(h / 24) });
}

export function ListingCard({ item, onPress }: { item: Listing; onPress?: () => void }) {
  const price = money(item.price, item.currency, item.isNegotiable);

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [s.card, item.isTop && s.cardTop, pressed && s.pressed]}>
      <View style={s.cardHead}>
        {item.isTop ? <Chip text="TOP" tone="brand" /> : <Chip text={t("mob.listing.new")} tone="success" />}
        <Icon name="heart" size={20} stroke="#cbd5e1" />
      </View>

      <View style={s.headRow}>
        <TypeThumb typeKey={item.vehicleTypeKey} />
        <View style={{ flexGrow: 1, minWidth: 0 }}>
          <Route from={item.from} fromC={item.fromCountry} to={item.to} toC={item.toCountry} />
          {item.title ? <Text style={s.cargo} numberOfLines={1}>{item.title}</Text> : null}
        </View>
      </View>

      <View style={s.chips}>
        {item.weightT != null ? <Chip text={`${item.weightT} t`} /> : null}
        {item.vehicleType ? <Chip text={item.vehicleType} /> : null}
        {item.isReadyNow ? <Chip text={t("mob.loads.readyNow")} tone="success" /> : null}
      </View>

      <View style={s.cardFoot}>
        <Text style={s.price}>
          {price ?? t("mob.loads.negotiable")}
        </Text>
        {item.createdAt ? <Text style={s.meta}>{ago(item.createdAt)}</Text> : null}
      </View>
    </Pressable>
  );
}

/**
 * Transport turi rasmi.
 *
 * ── NEGA SERVERDAN, ILOVA ICHIDAN EMAS ──────────────────────────
 *
 * Rasmlar `furam/public/trucks/{key}.webp` da — o'n to'rttasi,
 * webda allaqachon ishlatiladi. Ilova ichiga ko'chirilsa, ular
 * bundle'ni ~3 MB ga oshirardi va yangi tur qo'shilganda ikkita
 * joyni yangilash kerak bo'lardi.
 *
 * ── XATOLIKDA VEKTOR ─────────────────────────────────────────────
 *
 * Internet sekin bo'lsa yoki kalit noma'lum bo'lsa, rasm o'rniga
 * `TruckIcon` chiziladi — u ilova ichida va doim ishlaydi.
 * Kartochka hech qachon bo'sh kvadrat bilan qolmaydi.
 */
function TypeThumb({ typeKey }: { typeKey?: string | null }) {
  const [failed, setFailed] = useState(false);

  if (!typeKey || failed) {
    return (
      <View style={s.thumb}>
        <TruckIcon type={typeKey ?? "boshqa"} size={34} />
      </View>
    );
  }

  return (
    <View style={s.thumb}>
      <Image
        source={{ uri: `${API_BASE}/trucks/${typeKey}.webp` }}
        style={s.thumbImg}
        resizeMode="contain"
        onError={() => setFailed(true)}
      />
    </View>
  );
}

/* ─────────────────────────────────────────────── mashina kartasi */

export type TruckItem = Listing & {
  volumeM3?: number | null;
  isFreeNow?: boolean;
  statusKey?: string | null;
  statusLabel?: string | null;
  isExtra?: boolean;
  source?: "USER" | "TELEGRAM";
  /** Parkdagi mashinadan — bo'lishi shart emas */
  photo?: string | null;
  vehicleId?: string | null;
  brandModel?: string | null;
  isMine?: boolean;
};

/**
 * Mashina kartasi — yuk kartasidan ATAYLAB boshqacha.
 *
 * BOSH RAQAM NARX EMAS, SIG'IM. Yuk egasi «bu mashinaga yukim
 * sig'adimi?» deb qaraydi; narx keyin keladi va ko'pincha kelishiladi.
 *
 * SURAT KARTANING YARMINI EGALLAYDI. Mashina ko'rib tanlanadi:
 * tenti butunmi, refrijerator eskimi — suratdan bilinadi. Surat yo'q
 * bo'lsa (Telegram'dan yig'ilgan e'lonlar — ro'yxatning yarmi) bo'sh
 * joy qoldirilmaydi, transport turi belgisi qo'yiladi.
 */
export function TruckCard({ item, onPress }: { item: TruckItem; onPress?: () => void }) {
  const price = money(item.price, item.currency, item.isNegotiable);
  const tg = item.source === "TELEGRAM";

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        s.card,
        item.isTop && s.cardTop,
        item.isMine && s.cardMine,
        pressed && s.pressed,
      ]}
    >
      <View style={s.cardHead}>
        {item.isMine ? (
          <Chip text={t("mob.listing.mine")} tone="info" />
        ) : item.isTop ? (
          <Chip text="TOP" tone="brand" />
        ) : tg ? (
          <Chip text="TELEGRAM" />
        ) : (
          <Chip text={t("mob.listing.new")} tone="success" />
        )}
        <Icon name="heart" size={20} stroke="#cbd5e1" />
      </View>

      <View style={s.tRow}>
        {item.photo && item.vehicleId ? (
          <Image source={vehiclePhoto(item.vehicleId, item.photo)} style={s.tShot} resizeMode="cover" />
        ) : (
          <View style={[s.tShot, s.tShotEmpty]}>
            <Icon name="truck" size={26} stroke="#94a3b8" />
          </View>
        )}

        <View style={s.tBody}>
          <View style={s.tCap}>
            <Text style={s.tCapNum}>
              {item.weightT != null ? `${item.weightT} t` : "—"}
            </Text>
            {item.volumeM3 != null ? (
              <Text style={s.tCapSub}>{` · ${item.volumeM3} m³`}</Text>
            ) : null}
          </View>
          <Text style={s.tRoute} numberOfLines={1}>
            {item.from} → {item.to}
          </Text>
          <Text style={s.tSub} numberOfLines={1}>
            {[item.brandModel, item.vehicleType].filter(Boolean).join(" · ")}
          </Text>
        </View>
      </View>

      <View style={s.chips}>
        {item.statusKey === "freeNow" ? (
          <Chip text={t("mob.trucks.freeNow")} tone="success" />
        ) : item.statusLabel ? (
          <Chip text={t("mob.trucks.freeFrom", { d: item.statusLabel })} />
        ) : null}
        {item.isExtra ? <Chip text={t("mob.trucks.takesExtra")} /> : null}
      </View>

      <View style={s.cardFoot}>
        <Text style={price ? s.price : s.noPrice}>{price ?? t("mob.trucks.noPrice")}</Text>
        {item.createdAt ? <Text style={s.meta}>{ago(item.createdAt)}</Text> : null}
      </View>
    </Pressable>
  );
}

/* ─────────────────────────────────────────────── reys kartasi */

export type TripItem = {
  id: string; no: number; status: string;
  /* ⚠️ `statusLabel` ATAYLAB YO'Q. Server uni o'zbekcha yasaydi va
     `Accept-Language: ru` bilan ham «Yo'lda» qaytaradi — ya'ni rus
     tilidagi telefonda o'zbekcha chiqardi (2026-09-05 da topildi).
     Holat `status` kalitidan `tripStatus.*` lug'ati bilan
     chiziladi. */
  stepIndex: number; stepTotal: number;
  from: string; fromCountry?: string | null;
  to: string; toCountry?: string | null;
  cargo?: string | null;
  plate?: string | null; driver?: string | null;
  remainingKm?: number | null; etaAt?: string | null; placeName?: string | null;
  /* Kuzatuv yoqilganmi — bosh sahifadagi GPS chizig'i shunga
     qarab yozadi. Server allaqachon yuborardi, tur e'lon
     qilmagan edi. */
  trackingOn?: boolean;
};

export function TripCard({ item, onPress }: { item: TripItem; onPress?: () => void }) {
  const tone = toneFor(item.status);
  const eta = item.etaAt ? new Date(item.etaAt) : null;

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [s.card, pressed && s.pressed]}>
      <View style={s.cardHead}>
        <StatusChip label={tOr(`tripStatus.${item.status}`, item.status)} tone={tone} />
        <Text style={s.no}>#TR-{item.no}</Text>
      </View>

      <View style={{ marginTop: 12 }}>
        <Route from={item.from} fromC={item.fromCountry} to={item.to} toC={item.toCountry} />
      </View>

      {/* Bosqich chizig'i — kartochkaning belgisi */}
      <View style={s.track}>
        {Array.from({ length: item.stepTotal }, (_, i) => (
          <View
            key={i}
            style={[
              s.trackStep,
              { backgroundColor: i <= item.stepIndex ? (tone === "warning" ? color.warning : color.brand) : color.border },
            ]}
          />
        ))}
      </View>

      {item.remainingKm != null || eta ? (
        <View style={s.figures}>
          {item.remainingKm != null ? (
            <View style={s.figure}>
              <Text style={s.figureNum}>{item.remainingKm}</Text>
              <Text style={s.figureLabel}>{t("mob.trip.kmLeft")}</Text>
            </View>
          ) : null}
          {eta ? (
            <View style={s.figure}>
              <Text style={s.figureNum}>
                {String(eta.getHours()).padStart(2, "0")}:{String(eta.getMinutes()).padStart(2, "0")}
              </Text>
              <Text style={s.figureLabel}>{t("mob.trip.arrives")}</Text>
            </View>
          ) : null}
        </View>
      ) : null}

      {item.plate || item.driver ? (
        <View style={s.owner}>
          <View style={s.ownerIcon}>
            <Icon name="truck" size={16} />
          </View>
          <View style={{ flex: 1 }}>
            {item.plate ? <Text style={s.ownerName}>{item.plate}</Text> : null}
            {item.driver ? <Text style={s.meta}>{item.driver}</Text> : null}
          </View>
        </View>
      ) : null}
    </Pressable>
  );
}

const s = StyleSheet.create({
  headRow: { flexDirection: "row", alignItems: "center", gap: 11, marginTop: 11 },
  /* Rasm KVADRAT va o'lchami qat'iy: turli nisbatdagi rasmlar
     kartochka balandligini har xil qilib yuborardi va ro'yxat
     tekis ko'rinmasdi. */
  thumb: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: color.muted,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  thumbImg: { width: "100%", height: "100%" },

  card: {
    backgroundColor: color.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: color.border,
    padding: space.lg,
    ...shadow.card,
  },
  cardTop: { borderLeftWidth: 3, borderLeftColor: color.brand },
  cardMine: { borderColor: color.info + "59", backgroundColor: color.info + "08" },

  tRow: { flexDirection: "row", gap: 12, marginTop: 11 },
  tShot: { width: 72, height: 72, borderRadius: 12, backgroundColor: "#cbd5e1" },
  tShotEmpty: {
    backgroundColor: color.muted,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
  },
  tBody: { flex: 1, minWidth: 0 },
  tCap: { flexDirection: "row", alignItems: "baseline" },
  tCapNum: { fontSize: 24, fontWeight: "700", color: color.foreground, letterSpacing: -0.5 },
  tCapSub: { fontSize: 13, color: color.mutedForeground },
  tRoute: { fontSize: 14, fontWeight: "600", color: color.foreground, marginTop: 4 },
  tSub: { fontSize: 12, color: color.mutedForeground, marginTop: 1 },
  noPrice: { fontSize: font.body, fontWeight: "600", color: color.mutedForeground },
  pressed: { backgroundColor: "#fafbfc" },
  cardHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },

  route: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  city: { fontWeight: "700", color: color.foreground, letterSpacing: -0.2 },
  country: { fontSize: 12, color: color.mutedForeground, marginTop: 1 },

  cargo: { fontSize: 14, color: "#475569", marginTop: 10 },

  chips: { flexDirection: "row", gap: 6, marginTop: 11, flexWrap: "wrap" },
  chip: { height: 26, paddingHorizontal: 10, borderRadius: radius.control, alignItems: "center", justifyContent: "center" },
  chipText: { fontSize: 12, fontWeight: "500" },

  cardFoot: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", marginTop: 13 },
  price: { fontSize: 20, fontWeight: "700", color: color.foreground, letterSpacing: -0.3 },
  meta: { fontSize: 12, color: color.mutedForeground },
  no: { fontSize: 12, color: color.mutedForeground, fontFamily: "monospace" },

  track: { flexDirection: "row", gap: 3, marginTop: 14 },
  trackStep: { flex: 1, height: 4, borderRadius: 2 },

  figures: { flexDirection: "row", gap: 18, marginTop: 12 },
  figure: { flexDirection: "row", alignItems: "baseline", gap: 4 },
  figureNum: { fontSize: 20, fontWeight: "700", color: color.foreground },
  figureLabel: { fontSize: 12, color: color.mutedForeground },

  owner: {
    flexDirection: "row", alignItems: "center", gap: 8,
    marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: color.border,
  },
  ownerIcon: { width: 28, height: 28, borderRadius: radius.control, backgroundColor: color.muted, alignItems: "center", justifyContent: "center" },
  ownerName: { fontSize: 13, fontWeight: "600", color: color.foreground },
});
