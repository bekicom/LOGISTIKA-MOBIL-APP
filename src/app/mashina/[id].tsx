/**
 * M2 — mashina tafsiloti.
 *
 * Uchta qaror dizayndan:
 *
 *  1. GALEREYA BIRINCHI EKRANNI EGALLAYDI. Yuk tafsilotida tepada
 *     yo'nalish turadi, bu yerda — surat. Mashinani odam ko'zi bilan
 *     tanlaydi: tenti yirtiqmi, refrijerator eskimi.
 *  2. «HUJJATLARI JOYIDA» — yozuv emas, HISOB. Egasi mashinani FURAM
 *     parkida yuritsa, texpasport va sug'urta muddati bazada.
 *     Yuritmaydigan odamda blok umuman chiqmaydi — «yo'q» demaymiz,
 *     chunki hujjat bor bo'lishi mumkin, shunchaki bizda yo'q.
 *  3. DAVLAT RAQAMI KONTAKT OCHILMAGUNCHA YOPIQ. Raqam bo'yicha
 *     mashinani boshqa joydan topib FURAM'ni chetlab o'tish mumkin;
 *     telefon raqami allaqachon shunday himoyalangan.
 */
import { useState } from "react";
import {
  Image,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Button } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { Chip, money } from "@/components/cards";
import { ErrorBox, Skeleton } from "@/components/state";
import { api, FuramError } from "@/lib/api";
import { vehiclePhoto } from "@/lib/img";
import { useApi } from "@/lib/use-api";
import { t } from "@/lib/i18n";
import { color, font, radius, space } from "@/lib/theme";

type Doc = { kind: string; state: string };

type Detail = {
  id: string;
  description: string | null;
  isMine: boolean;
  source: "USER" | "TELEGRAM";
  views: number;
  createdAt: string;
  route: {
    from: string; fromFull: string; fromCountry: string;
    to: string; toFull: string; toCountry: string;
  };
  truck: {
    capacityT: number | null;
    volumeM3: number | null;
    isFreeNow: boolean;
    freeDate: string | null;
    takesExtraLoad: boolean;
    vehicleType: { key: string; name: string };
  };
  price: {
    amount: number | null; currency: string; isNegotiable: boolean;
    advance: number | null; paymentType: string;
  };
  vehicle: {
    id: string;
    photos: string[];
    brand: string;
    model: string | null;
    year: number | null;
    plate: string | null;
    trailer: { plate: string | null; capacityT: number | null } | null;
    docsOk: boolean | null;
    docs: Doc[] | null;
  } | null;
  owner: {
    id: string; name: string; company: string | null; furamId: number;
    memberSince: string; rating: number | null; ratingCount: number;
    trustScore: number | null;
  } | null;
  contact: string | null;
};

export default function MashinaTafsilot() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [shot, setShot] = useState(0);
  const [revealing, setRevealing] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const { data, loading, error, refreshing, refresh, reload } = useApi<Detail>(
    id ? `/api/trucks/${id}` : null,
    [id],
  );

  async function reveal() {
    setRevealing(true);
    setErr(null);
    try {
      await api("/api/contact-reveal", { method: "POST", body: { kind: "truck", id: String(id) } });
      reload();
    } catch (e) {
      setErr((e as FuramError).message);
    } finally {
      setRevealing(false);
    }
  }

  if (loading && !data) {
    return (
      <View style={[s.root, { paddingTop: insets.top + space.lg }]}>
        <View style={{ padding: space.lg }}>
          <Skeleton rows={5} />
        </View>
      </View>
    );
  }
  if (error || !data) {
    return (
      <View style={[s.root, { paddingTop: insets.top + space.lg }]}>
        <View style={{ padding: space.lg }}>
          <ErrorBox message={error ?? t("mob.trucks.notFound")} onRetry={reload} />
        </View>
      </View>
    );
  }

  const v = data.vehicle;
  const photos = v?.photos ?? [];
  const price = money(data.price.amount, data.price.currency, data.price.isNegotiable);

  return (
    <View style={s.root}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: space.xxl }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={color.brand} />
        }
      >
        {/* Galereya — to'liq enlik */}
        <View style={s.gallery}>
          {photos.length && v ? (
            <Image source={vehiclePhoto(v.id, photos[shot])} style={s.shot} resizeMode="cover" />
          ) : (
            <View style={[s.shot, s.shotEmpty]}>
              <Icon name="truck" size={54} stroke="rgba(255,255,255,0.5)" />
            </View>
          )}

          <Pressable
            onPress={() => router.back()}
            style={[s.round, { top: insets.top + 4, left: 12 }]}
            hitSlop={6}
            accessibilityRole="button"
          >
            <Icon name="back" size={21} stroke="#fff" />
          </Pressable>

          {photos.length > 1 ? (
            <>
              <View style={s.counter}>
                <Text style={s.counterText}>
                  {shot + 1} / {photos.length}
                </Text>
              </View>
              <View style={s.dots}>
                {photos.map((_, i) => (
                  <Pressable key={i} onPress={() => setShot(i)} hitSlop={8}>
                    <View style={[s.dot, i === shot && s.dotOn]} />
                  </Pressable>
                ))}
              </View>
            </>
          ) : null}
        </View>

        <View style={s.body}>
          {/* Sig'im — bosh raqam */}
          <View>
            <View style={s.capRow}>
              <Text style={s.cap}>{data.truck.capacityT != null ? `${data.truck.capacityT} t` : "—"}</Text>
              {data.truck.volumeM3 != null ? (
                <Text style={s.capSub}>{` · ${data.truck.volumeM3} m³`}</Text>
              ) : null}
            </View>
            <Text style={s.sub}>
              {[data.truck.vehicleType.name, v ? [v.brand, v.model].filter(Boolean).join(" ") : null]
                .filter(Boolean)
                .join(" · ")}
            </Text>
            <View style={s.chips}>
              {data.truck.isFreeNow ? (
                <Chip text={t("mob.trucks.freeNow")} tone="success" />
              ) : data.truck.freeDate ? (
                <Chip text={t("mob.trucks.freeFrom", { d: data.truck.freeDate.slice(0, 10) })} />
              ) : null}
              {data.truck.takesExtraLoad ? <Chip text={t("mob.trucks.takesExtra")} /> : null}
            </View>
          </View>

          {/* Yo'nalish va narx */}
          <View style={s.sec}>
            <View style={s.routeRow}>
              <View style={{ flex: 1 }}>
                <Text style={s.city}>{data.route.from}</Text>
                <Text style={s.country}>{t(`jobCatalog.countries.${data.route.fromCountry}`)}</Text>
              </View>
              <Icon name="arrow-right" size={19} stroke="#94a3b8" />
              <View style={{ flex: 1, alignItems: "flex-end" }}>
                <Text style={[s.city, { textAlign: "right" }]}>{data.route.to}</Text>
                <Text style={s.country}>{t(`jobCatalog.countries.${data.route.toCountry}`)}</Text>
              </View>
            </View>
            <View style={s.priceRow}>
              <Text style={price ? s.price : s.noPrice}>{price ?? t("mob.trucks.noPrice")}</Text>
              {data.price.isNegotiable ? (
                <Text style={s.meta}>{t("mob.loads.negotiable")}</Text>
              ) : null}
            </View>
          </View>

          {/* Hujjatlari joyidami — faqat park mashinasida */}
          {v?.docsOk === true ? (
            <View style={[s.banner, s.bannerOk]}>
              <Icon name="check" size={19} stroke={color.success} />
              <View style={{ flex: 1 }}>
                <Text style={s.bannerTitleOk}>{t("mob.trucks.docsOk")}</Text>
                <Text style={s.bannerTextOk}>{t("mob.trucks.docsOkText")}</Text>
              </View>
            </View>
          ) : v?.docsOk === false ? (
            <View style={[s.banner, s.bannerWarn]}>
              <Icon name="alert" size={19} stroke={color.warning} />
              <View style={{ flex: 1 }}>
                <Text style={s.bannerTitleWarn}>{t("mob.trucks.docsBad")}</Text>
                <Text style={s.bannerTextWarn}>{t("mob.trucks.docsBadText")}</Text>
              </View>
            </View>
          ) : null}

          {/* Texnik */}
          {v ? (
            <View style={s.sec}>
              <Text style={s.secTitle}>{t("mob.trucks.vehicle")}</Text>
              <Kv k={t("mob.trucks.brand")} v={[v.brand, v.model].filter(Boolean).join(" ")} />
              {v.year ? <Kv k={t("mob.trucks.year")} v={String(v.year)} /> : null}
              {v.trailer ? (
                <Kv
                  k={t("mob.trucks.trailer")}
                  v={v.trailer.plate ?? t("mob.trucks.hidden")}
                  locked={!v.trailer.plate}
                />
              ) : null}
              <Kv
                k={t("mob.trucks.plate")}
                v={v.plate ?? "01 A ••• ••"}
                locked={!v.plate}
              />
            </View>
          ) : null}

          {/* Egasi */}
          {data.owner ? (
            <View style={s.sec}>
              <View style={s.ownerRow}>
                <View style={s.avatar}>
                  <Text style={s.avatarText}>
                    {data.owner.name.slice(0, 2).toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.ownerName}>{data.owner.company || data.owner.name}</Text>
                  <Text style={s.meta}>
                    {t("mob.trucks.memberSince", { y: data.owner.memberSince.slice(0, 4) })}
                  </Text>
                </View>
              </View>
              <View style={s.stats}>
                <Stat label={t("mob.trucks.trust")} value={data.owner.trustScore ?? "—"} good />
                <Stat label={t("mob.trucks.rating")} value={data.owner.rating ?? "—"} />
                <Stat label={t("mob.trucks.reviews")} value={data.owner.ratingCount} />
              </View>
            </View>
          ) : null}

          {/* Izoh */}
          {data.description ? (
            <View style={s.sec}>
              <Text style={s.secTitle}>{t("mob.trucks.ownerNote")}</Text>
              <Text style={s.note}>{data.description}</Text>
            </View>
          ) : null}

          {/* Kontakt */}
          <View style={s.sec}>
            {data.contact ? (
              <Pressable
                style={s.contactOpen}
                onPress={() => Linking.openURL(`tel:${data.contact}`)}
                accessibilityRole="button"
              >
                <Icon name="user" size={20} stroke={color.success} />
                <View style={{ flex: 1 }}>
                  <Text style={s.contactPhone}>{data.contact}</Text>
                  <Text style={s.meta}>{t("mob.load.tapToCall")}</Text>
                </View>
              </Pressable>
            ) : (
              <View style={{ gap: 10 }}>
                <Text style={s.secTitle}>{t("mob.trucks.contactLocked")}</Text>
                {err ? <Text style={s.err}>{err}</Text> : null}
                <Button title={t("mob.post2.openContact")} onPress={reveal} loading={revealing} />
              </View>
            )}
          </View>

          <Text style={s.footMeta}>
            {t("mob.trucks.viewed", { n: data.views })}
          </Text>
        </View>
      </ScrollView>

      {/* Pastdagi tugmalar */}
      {!data.isMine ? (
        <View style={[s.foot, { paddingBottom: insets.bottom + 14 }]}>
          <Pressable
            style={s.iconBtn}
            onPress={() => router.push("/chat")}
            accessibilityRole="button"
            accessibilityLabel={t("mob.trucks.message")}
          >
            <Icon name="chat" size={21} stroke="#475569" />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Button title={t("mob.trucks.sendOffer")} onPress={() => router.push("/chat")} />
          </View>
        </View>
      ) : null}
    </View>
  );
}

function Kv({ k, v, locked }: { k: string; v: string; locked?: boolean }) {
  return (
    <View style={s.kv}>
      <Text style={s.k}>{k}</Text>
      <View style={s.vWrap}>
        <Text style={[s.v, locked && s.vLocked]}>{v}</Text>
        {locked ? <Icon name="alert" size={15} stroke="#94a3b8" /> : null}
      </View>
    </View>
  );
}

function Stat({ label, value, good }: { label: string; value: string | number; good?: boolean }) {
  return (
    <View>
      <Text style={s.statLabel}>{label}</Text>
      <Text style={[s.statValue, good && { color: color.success }]}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.background },

  gallery: { height: 260, backgroundColor: "#b9c3cf" },
  shot: { width: "100%", height: 260 },
  shotEmpty: { backgroundColor: color.navy, alignItems: "center", justifyContent: "center" },
  round: {
    position: "absolute",
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(15,23,42,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  counter: {
    position: "absolute",
    bottom: 12,
    right: 12,
    height: 26,
    paddingHorizontal: 11,
    borderRadius: 13,
    backgroundColor: "rgba(15,23,42,0.55)",
    justifyContent: "center",
  },
  counterText: { fontSize: 12, fontWeight: "600", color: "#fff" },
  dots: {
    position: "absolute",
    bottom: 14,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    gap: 5,
  },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.5)" },
  dotOn: { width: 18, backgroundColor: "#fff" },

  body: { padding: space.lg, gap: space.md },
  capRow: { flexDirection: "row", alignItems: "baseline" },
  cap: { fontSize: 34, fontWeight: "700", color: color.foreground, letterSpacing: -1 },
  capSub: { fontSize: font.bodyLg, color: color.mutedForeground },
  sub: { fontSize: font.body, color: "#475569", marginTop: 3 },
  chips: { flexDirection: "row", gap: 6, marginTop: 11, flexWrap: "wrap" },

  sec: {
    backgroundColor: color.card,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.card,
    padding: space.lg,
  },
  secTitle: { fontSize: font.caption, fontWeight: "700", color: color.foreground },

  routeRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  city: { fontSize: font.title, fontWeight: "700", color: color.foreground },
  country: { fontSize: 12, color: color.mutedForeground, marginTop: 1 },
  priceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    marginTop: 13,
    paddingTop: 13,
    borderTopWidth: 1,
    borderTopColor: color.border,
  },
  price: { fontSize: 22, fontWeight: "700", color: color.foreground, letterSpacing: -0.4 },
  noPrice: { fontSize: font.body, fontWeight: "600", color: color.mutedForeground },
  meta: { fontSize: 12, color: color.mutedForeground },

  banner: { flexDirection: "row", gap: 11, borderWidth: 1, borderRadius: radius.card, padding: 14 },
  bannerOk: { borderColor: color.success + "66", backgroundColor: color.success + "0d" },
  bannerWarn: { borderColor: color.warning + "66", backgroundColor: color.warning + "0d" },
  bannerTitleOk: { fontSize: font.caption, fontWeight: "700", color: "#15803d" },
  bannerTextOk: { fontSize: 12, color: "#15803d", marginTop: 3, lineHeight: 18 },
  bannerTitleWarn: { fontSize: font.caption, fontWeight: "700", color: color.warning },
  bannerTextWarn: { fontSize: 12, color: color.warning, marginTop: 3, lineHeight: 18 },

  kv: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: color.border,
    marginTop: 4,
  },
  k: { fontSize: font.caption, color: color.mutedForeground },
  vWrap: { flexDirection: "row", alignItems: "center", gap: 7 },
  v: { fontSize: 14, fontWeight: "600", color: color.foreground },
  vLocked: { color: "#94a3b8", letterSpacing: 1.5 },

  ownerRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: color.muted,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 15, fontWeight: "600", color: color.mutedForeground },
  ownerName: { fontSize: font.body, fontWeight: "700", color: color.foreground },
  stats: {
    flexDirection: "row",
    gap: 22,
    marginTop: 14,
    paddingTop: 13,
    borderTopWidth: 1,
    borderTopColor: color.border,
  },
  statLabel: { fontSize: 11, color: color.mutedForeground },
  statValue: { fontSize: 17, fontWeight: "700", color: color.foreground, marginTop: 1 },

  note: { fontSize: 14, color: "#475569", marginTop: 7, lineHeight: 22 },

  contactOpen: { flexDirection: "row", alignItems: "center", gap: 12 },
  contactPhone: { fontSize: font.bodyLg, fontWeight: "700", color: color.foreground },
  err: { fontSize: font.caption, color: color.danger },
  footMeta: { fontSize: 12, color: "#94a3b8", textAlign: "center" },

  foot: {
    flexDirection: "row",
    gap: 10,
    backgroundColor: color.card,
    borderTopWidth: 1,
    borderTopColor: color.border,
    paddingHorizontal: space.lg,
    paddingTop: 12,
  },
  iconBtn: {
    width: 52,
    height: 52,
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: color.border,
    alignItems: "center",
    justifyContent: "center",
  },
});
