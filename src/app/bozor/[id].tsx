/**
 * P2 — e'lon tafsiloti.
 *
 * ── TELEFON BOSILGANDA OCHILADI ─────────────────────────────────
 *
 * Web sahifasi raqamni kirgan har kimga darhol beradi. Bu yerda esa
 * u `contact` amalidan keyin keladi. Ikki sabab: sotuvchi qancha
 * odam qiziqqanini biladi (bu «Sotuvlarim» dagi asosiy raqam), va
 * raqamlar yig'ib olinishi qiyinlashadi.
 *
 * ── PARK TARIXI — BO'LIMNING ASOSI ──────────────────────────────
 *
 * E'lon parkdagi mashinaga bog'langan bo'lsa, probeg va texnik
 * xizmat SOTUVCHINING GAPI EMAS, tizim yozuvi. Boshqa bozorlarda
 * bunday narsa yo'q, shuning uchun u qora kartochkada — ekrandagi
 * eng ko'zga tashlanadigan joyda.
 */
import { useState } from "react";
import {
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Icon } from "@/components/Icon";
import { ErrorBox, Skeleton } from "@/components/state";
import { fmtNum } from "@/components/cards";
import { api, FuramError } from "@/lib/api";
import { salePhoto } from "@/lib/img";
import { useApi } from "@/lib/use-api";
import { color, font, radius, space } from "@/lib/theme";
import {
  saleCategoryLabel,
  saleFeatureLabel,
  salePriceKindLabel,
  saleSpecLabel,
  saleStatusLabel,
  t,
} from "@/lib/i18n";

type Fleet = {
  trips: number;
  services: number;
  lastServiceAt: string | null;
  odometer: number | null;
};

type Sale = {
  id: string;
  saleNo: number;
  status: string;
  category: string;
  brand: string;
  model: string | null;
  year: number | null;
  odometer: number | null;
  price: number;
  currency: string;
  priceKind: string;
  installment: {
    down: number;
    months: number;
    monthly: number;
    total: number;
    overpay: number;
    overpayPct: number;
  } | null;
  exchange: boolean;
  exchangeNote: string | null;
  specs: { key: string; value: string }[];
  features: string[];
  about: string | null;
  hasDocs: boolean;
  docsNote: string | null;
  photos: string[];
  location: string | null;
  address: string | null;
  views: number;
  createdAt: string;
  fleet: Fleet | null;
  seller: { furamId: number; name: string; verified: boolean };
};

type Viewer = {
  authed: boolean;
  isSeller: boolean;
  isBuyer: boolean;
  saved: boolean;
  sold: boolean;
  confirmed: boolean;
  canAddToFleet: boolean;
};

const TONE: Record<string, string> = {
  ACTIVE: color.success,
  NEGOTIATING: color.warning,
  IN_DEAL: color.warning,
  SOLD: color.foreground,
  PAUSED: color.mutedForeground,
  CANCELLED: color.mutedForeground,
  EXPIRED: color.mutedForeground,
};

export default function EelonTafsilot() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { width } = useWindowDimensions();

  const { data, loading, error, reload } = useApi<{ sale: Sale; viewer: Viewer }>(
    id ? `/api/market/${id}` : null,
    [id],
  );

  const [shot, setShot] = useState(0);
  const [phone, setPhone] = useState<string | null>(null);
  const [saved, setSaved] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState("");

  const sale = data?.sale;
  const viewer = data?.viewer;
  const isSaved = saved ?? viewer?.saved ?? false;

  async function act(body: Record<string, unknown>) {
    setBusy(true);
    setFailed("");
    try {
      return await api<Record<string, unknown>>("/api/market", {
        method: "POST",
        body: { ...body, id },
      });
    } catch (e) {
      setFailed((e as FuramError).message ?? t("mob.common.failed"));
      return null;
    } finally {
      setBusy(false);
    }
  }

  /* Raqam SERVERDAN olinadi, tafsilot javobida kelmaydi: shunda u
     ochilgani ham yoziladi. */
  async function showPhone() {
    const r = await act({ action: "contact" });
    if (r && typeof r.phone === "string") setPhone(r.phone);
  }

  if (loading && !data) {
    return (
      <View style={[s.root, { paddingTop: insets.top + space.lg }]}>
        <View style={{ padding: space.lg }}>
          <Skeleton rows={4} />
        </View>
      </View>
    );
  }

  if (error || !sale || !viewer) {
    return (
      <View style={[s.root, { paddingTop: insets.top + space.lg }]}>
        <View style={{ padding: space.lg }}>
          <ErrorBox message={error ?? t("mob.state.noData")} onRetry={reload} />
        </View>
      </View>
    );
  }

  return (
    <View style={s.root}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + space.xxl }}>
        {/* ── Suratlar. Yon aylantiriladi, tepada tugmalar */}
        <View style={[s.gallery, { height: width * 0.72 }]}>
          {sale.photos.length > 0 ? (
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(e) =>
                setShot(Math.round(e.nativeEvent.contentOffset.x / width))
              }
            >
              {sale.photos.map((p) => (
                <Image
                  key={p}
                  source={salePhoto(sale.id, p)}
                  style={{ width, height: width * 0.72 }}
                  resizeMode="cover"
                />
              ))}
            </ScrollView>
          ) : (
            <View style={s.noPhoto}>
              <Icon name="truck" size={44} stroke="#94a3b8" />
              <Text style={s.noPhotoText}>{t("mob.market.noPhoto")}</Text>
            </View>
          )}

          <Pressable
            style={[s.round, { left: 12, top: insets.top + 6 }]}
            onPress={() => router.back()}
            hitSlop={8}
          >
            <Icon name="back" size={19} stroke="#fff" />
          </Pressable>

          {!viewer.isSeller && viewer.authed && (
            <Pressable
              style={[s.round, { right: 12, top: insets.top + 6 }]}
              disabled={busy}
              onPress={async () => {
                const r = await act({ action: "saved" });
                if (r) setSaved(r.saved === true);
              }}
              hitSlop={8}
            >
              <Icon
                name="heart"
                size={18}
                stroke={isSaved ? color.brand : "#fff"}
                fill={isSaved ? color.brand : undefined}
              />
            </Pressable>
          )}

          {sale.photos.length > 1 && (
            <View style={s.shots}>
              <Text style={s.shotsText}>
                {shot + 1} / {sale.photos.length}
              </Text>
            </View>
          )}
        </View>

        <View style={s.body}>
          {failed ? (
            <View style={s.failed}>
              <Text style={s.failedText}>{failed}</Text>
            </View>
          ) : null}

          {/* ── Bosh ma'lumot */}
          <View style={s.card}>
            <View style={s.topRow}>
              <View style={[s.status, { backgroundColor: (TONE[sale.status] ?? color.mutedForeground) + "1a" }]}>
                <Text style={[s.statusText, { color: TONE[sale.status] ?? color.mutedForeground }]}>
                  {saleStatusLabel(sale.status)}
                </Text>
              </View>
              <Text style={s.no}>
                #{sale.saleNo} · {t("mob.market.viewsN", { n: sale.views })}
              </Text>
            </View>

            <Text style={s.name}>
              {sale.brand} {sale.model ?? ""}
            </Text>
            <Text style={s.meta}>
              {[
                sale.year ? t("mob.market.yearN", { n: sale.year }) : null,
                sale.odometer != null ? `${fmtNum(sale.odometer)} km` : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </Text>

            <Text style={s.price}>
              {fmtNum(sale.price)} <Text style={s.cur}>{sale.currency}</Text>
            </Text>
            <Text style={s.kind}>{salePriceKindLabel(sale.priceKind)}</Text>

            {sale.location && (
              <View style={s.place}>
                <Icon name="border" size={15} stroke={color.mutedForeground} />
                <Text style={s.placeText}>
                  {sale.location}
                  {sale.address ? ` · ${sale.address}` : ""}
                </Text>
              </View>
            )}
          </View>

          {/* ══ PARK TARIXI ══ */}
          {sale.fleet && (
            <View style={s.fleet}>
              <View style={s.fleetHead}>
                <View style={s.fleetIcon}>
                  <Icon name="check" size={17} stroke={color.brand} />
                </View>
                <View style={{ flexGrow: 1 }}>
                  <Text style={s.fleetTitle}>{t("mob.market.fleetTitle")}</Text>
                  <Text style={s.fleetSub}>{t("mob.market.fleetSub")}</Text>
                </View>
              </View>

              <View style={s.fleetRow}>
                <Box label={t("mob.market.fleetTrips")} value={fmtNum(sale.fleet.trips)} />
                <Box label={t("mob.market.fleetServices")} value={fmtNum(sale.fleet.services)} />
                <Box
                  label={t("mob.market.fleetOdo")}
                  value={
                    sale.fleet.odometer != null ? `${fmtNum(sale.fleet.odometer)} km` : "—"
                  }
                />
              </View>
            </View>
          )}

          {/* ── Muddatli to'lov */}
          {sale.installment && (
            <View style={s.card}>
              <Text style={s.sec}>{t("mob.market.installment")}</Text>
              <View style={s.instRow}>
                <Cell
                  label={t("mob.market.down")}
                  value={`${fmtNum(sale.installment.down)} ${sale.currency}`}
                />
                <Cell
                  label={t("mob.market.perMonth")}
                  value={`${fmtNum(sale.installment.monthly)} ${sale.currency}`}
                  strong
                />
                <Cell
                  label={t("mob.market.months")}
                  value={t("mob.market.monthsN", { n: sale.installment.months })}
                />
              </View>
              {sale.installment.overpay > 0 && (
                <View style={s.warn}>
                  <Text style={s.warnText}>
                    {t("mob.market.overpay", {
                      sum: `${fmtNum(sale.installment.overpay)} ${sale.currency}`,
                      pct: sale.installment.overpayPct,
                    })}
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* ── Ayriboshlash */}
          {sale.exchange && (
            <View style={s.card}>
              <Text style={s.sec}>{t("mob.market.exchangeOk")}</Text>
              {sale.exchangeNote ? <Text style={s.text}>{sale.exchangeNote}</Text> : null}
            </View>
          )}

          {/* ── Texnik ma'lumot */}
          <View style={s.card}>
            <Text style={s.sec}>{t("mob.market.specs")}</Text>
            <View style={{ marginTop: 4 }}>
              <Row label={saleSpecLabel("category")} value={saleCategoryLabel(sale.category)} />
              {sale.year != null && <Row label={saleSpecLabel("year")} value={String(sale.year)} />}
              {sale.odometer != null && (
                <Row label={saleSpecLabel("odometer")} value={`${fmtNum(sale.odometer)} km`} />
              )}
              {sale.specs.map((x, i) => (
                <Row
                  key={x.key}
                  label={saleSpecLabel(x.key)}
                  value={x.key === "engineL" ? `${x.value} l` : x.key === "capacityT" ? `${x.value} t` : x.value}
                  last={i === sale.specs.length - 1}
                />
              ))}
            </View>
          </View>

          {/* ── Jihozlar */}
          {sale.features.length > 0 && (
            <View style={s.card}>
              <Text style={s.sec}>{t("mob.market.features")}</Text>
              <View style={s.chips}>
                {sale.features.map((f) => (
                  <View key={f} style={s.chip}>
                    <Text style={s.chipText}>{saleFeatureLabel(f)}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {sale.about ? (
            <View style={s.card}>
              <Text style={s.sec}>{t("mob.market.about")}</Text>
              <Text style={s.text}>{sale.about}</Text>
            </View>
          ) : null}

          {/* ── Hujjatlar */}
          {sale.hasDocs && (
            <View style={[s.card, s.docs]}>
              <View style={s.docsHead}>
                <Icon name="check" size={17} stroke="#15803d" />
                <Text style={s.docsTitle}>{t("mob.market.docsReady")}</Text>
              </View>
              {sale.docsNote ? <Text style={s.text}>{sale.docsNote}</Text> : null}
            </View>
          )}

          {/* ── Sotuvchi */}
          <View style={s.card}>
            <Text style={s.sec}>{t("mob.market.seller")}</Text>
            <View style={s.sellerRow}>
              <View style={s.avatar}>
                <Text style={s.avatarText}>{initials(sale.seller.name)}</Text>
              </View>
              <View style={{ flexGrow: 1, minWidth: 0 }}>
                <View style={s.sellerName}>
                  <Text style={s.sellerNameText} numberOfLines={1}>
                    {sale.seller.name}
                  </Text>
                  {sale.seller.verified && <Icon name="check" size={15} stroke={color.success} />}
                </View>
                <Text style={s.sellerId}>FURAM-{sale.seller.furamId}</Text>
              </View>
            </View>

            {viewer.isSeller ? (
              <Text style={s.own}>{t("mob.market.ownListing")}</Text>
            ) : !viewer.authed ? (
              <Pressable style={s.primary} onPress={() => router.push("/kirish")}>
                <Text style={s.primaryText}>{t("mob.market.signInToCall")}</Text>
              </Pressable>
            ) : phone ? (
              <Pressable style={s.primary} onPress={() => void Linking.openURL(`tel:${phone}`)}>
                <Icon name="check" size={17} stroke="#fff" />
                <Text style={s.primaryText}>{phone}</Text>
              </Pressable>
            ) : (
              <Pressable style={s.primary} disabled={busy} onPress={showPhone}>
                <Text style={s.primaryText}>{t("mob.market.showPhone")}</Text>
              </Pressable>
            )}

            {!viewer.isSeller && viewer.authed && (
              <Text style={s.note}>{t("mob.market.contactNote")}</Text>
            )}
          </View>

          {/* ── Xaridorning bitimi. Ikkala qadam ham shu yerda:
               tasdiqlash va parkka qo'shish. */}
          {viewer.isBuyer && viewer.sold && (
            <View style={[s.card, s.deal]}>
              <Text style={s.sec}>{t("mob.market.deal")}</Text>
              {!viewer.confirmed ? (
                <>
                  <Text style={s.text}>{t("mob.market.confirmHint")}</Text>
                  <Pressable
                    style={s.primary}
                    disabled={busy}
                    onPress={async () => {
                      if (await act({ action: "confirm" })) reload();
                    }}
                  >
                    <Text style={s.primaryText}>{t("mob.market.confirm")}</Text>
                  </Pressable>
                </>
              ) : viewer.canAddToFleet ? (
                <>
                  <Text style={s.text}>{t("mob.market.toFleetHint")}</Text>
                  <Pressable
                    style={s.primary}
                    disabled={busy}
                    onPress={async () => {
                      const r = await act({ action: "to-fleet" });
                      if (r?.vehicleId) router.push(`/parkim/${String(r.vehicleId)}`);
                    }}
                  >
                    <Text style={s.primaryText}>{t("mob.market.toFleet")}</Text>
                  </Pressable>
                </>
              ) : (
                <Text style={s.text}>{t("mob.market.dealClosed")}</Text>
              )}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

function Row({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[s.row, last && { borderBottomWidth: 0 }]}>
      <Text style={s.rowKey}>{label}</Text>
      <Text style={s.rowValue}>{value}</Text>
    </View>
  );
}

function Cell({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={s.cellKey}>{label}</Text>
      <Text style={[s.cellValue, strong && { color: "#c2490f" }]}>{value}</Text>
    </View>
  );
}

function Box({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.box}>
      <Text style={s.boxKey}>{label}</Text>
      <Text style={s.boxValue}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.background },

  gallery: { backgroundColor: "#cbd5e1" },
  noPhoto: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8 },
  noPhotoText: { fontSize: 13, color: color.mutedForeground },
  round: {
    position: "absolute",
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#0f172a80",
    alignItems: "center",
    justifyContent: "center",
  },
  shots: {
    position: "absolute",
    right: 12,
    bottom: 12,
    height: 24,
    paddingHorizontal: 9,
    borderRadius: 6,
    backgroundColor: "#0f172a99",
    justifyContent: "center",
  },
  shotsText: { fontSize: 11, fontWeight: "600", color: "#fff" },

  body: { padding: space.lg, gap: space.md },

  failed: {
    borderWidth: 1,
    borderColor: color.danger + "59",
    backgroundColor: color.danger + "0d",
    borderRadius: radius.control,
    padding: space.md,
  },
  failedText: { fontSize: font.caption, color: color.danger },

  card: {
    backgroundColor: color.card,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.card,
    padding: space.md,
  },

  topRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  status: { height: 21, paddingHorizontal: 8, borderRadius: 6, justifyContent: "center" },
  statusText: { fontSize: 10, fontWeight: "700" },
  no: { fontSize: 11, color: "#94a3b8" },

  name: { fontSize: 21, fontWeight: "700", color: color.foreground, marginTop: 8, letterSpacing: -0.4 },
  meta: { fontSize: 13, color: color.mutedForeground, marginTop: 2 },
  price: { fontSize: 30, fontWeight: "700", color: color.foreground, marginTop: 13, letterSpacing: -0.8 },
  cur: { fontSize: 17, color: color.mutedForeground },
  kind: { fontSize: 13, color: color.mutedForeground, marginTop: 1 },

  place: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: color.muted,
  },
  placeText: { flex: 1, fontSize: 13, color: color.mutedForeground },

  fleet: { backgroundColor: color.navy, borderRadius: radius.card, padding: space.md },
  fleetHead: { flexDirection: "row", alignItems: "center", gap: 10 },
  fleetIcon: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: color.brand + "33",
    alignItems: "center",
    justifyContent: "center",
  },
  fleetTitle: { fontSize: 14, fontWeight: "700", color: "#fff" },
  fleetSub: { fontSize: 12, color: "#f1f5f9a6", marginTop: 1 },
  fleetRow: { flexDirection: "row", gap: 10, marginTop: 13 },
  box: { flex: 1, padding: 10, borderRadius: 10, backgroundColor: "#ffffff0f" },
  boxKey: { fontSize: 11, color: "#f1f5f999" },
  boxValue: { fontSize: 16, fontWeight: "700", color: "#fff", marginTop: 2 },

  sec: { fontSize: 15, fontWeight: "700", color: color.foreground },
  text: { fontSize: 13, color: color.mutedForeground, marginTop: 6, lineHeight: 20 },

  instRow: { flexDirection: "row", gap: 10, marginTop: 11 },
  cellKey: { fontSize: 11, color: color.mutedForeground },
  cellValue: { fontSize: 15, fontWeight: "700", color: color.foreground, marginTop: 2 },
  warn: {
    marginTop: 11,
    paddingVertical: 9,
    paddingHorizontal: 11,
    borderRadius: radius.control,
    backgroundColor: color.warning + "14",
  },
  warnText: { fontSize: 12, color: "#92400e" },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: color.muted,
    gap: space.md,
  },
  rowKey: { fontSize: 13, color: color.mutedForeground },
  rowValue: { flexShrink: 1, fontSize: 13, fontWeight: "600", color: color.foreground, textAlign: "right" },

  chips: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 11 },
  chip: { height: 30, paddingHorizontal: 11, borderRadius: 8, backgroundColor: color.muted, justifyContent: "center" },
  chipText: { fontSize: 12, fontWeight: "500", color: color.mutedForeground },

  docs: { borderColor: color.success + "59", backgroundColor: color.success + "0a" },
  docsHead: { flexDirection: "row", alignItems: "center", gap: 9 },
  docsTitle: { fontSize: 14, fontWeight: "700", color: "#15803d" },

  sellerRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 11 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: color.muted,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 13, fontWeight: "700", color: color.mutedForeground },
  sellerName: { flexDirection: "row", alignItems: "center", gap: 6 },
  sellerNameText: { flexShrink: 1, fontSize: 14, fontWeight: "600", color: color.foreground },
  sellerId: { fontSize: 12, color: "#94a3b8" },

  primary: {
    height: 46,
    borderRadius: 10,
    backgroundColor: color.brand,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 13,
  },
  primaryText: { fontSize: 15, fontWeight: "600", color: color.brandForeground },
  note: { fontSize: 11, color: "#94a3b8", marginTop: 8, textAlign: "center" },
  own: { fontSize: 13, color: color.mutedForeground, marginTop: 11 },

  deal: { borderColor: color.brand, borderWidth: 2 },
});
