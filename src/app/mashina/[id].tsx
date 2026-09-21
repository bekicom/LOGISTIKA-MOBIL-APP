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
 *
 * ── 2026-09-21: YUK SAHIFASI BILAN BIR XIL ─────────────────────
 *
 * Yuk sahifasi Bekzod ko'rsatgan namunadagidek qayta chizilgan edi,
 * mashina sahifasi esa eskisida qolgandi: suratsiz e'londa (Telegram —
 * ro'yxatning ko'pi) tepada BO'SH to'q ko'k blok, katta «—» va
 * «Boshqa» turardi. Endi qismlar umumiy (`ElonTafsilot`): ikonkali
 * yo'nalish, «Narx» qutisi, ikonkali qatorlar. Surat bo'lsa — galereya
 * avvalgidek tepada (1-qaror), bo'lmasa oddiy sarlavha va tur rasmi.
 *
 * «Taklif yuborish» faqat chat RO'YXATINI ochardi — hech narsa
 * yuborilmasdi. Endi «Xabar yozish»: egasi bilan suhbat ochiladi
 * (`POST /api/chats`, webdagi kontakt kartasi bilan bir xil yo'l).
 * Telegram e'lonida yozib bo'lmaydi — tugma chiqmaydi, bog'lanish
 * havolalari sahifaning o'zida.
 */
import { useState } from "react";
import { Image, Linking, Pressable, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { Text } from "@/components/Text";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Button } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { ContactLinks, type Links } from "@/components/ContactLinks";
import { ago, davlatNomi, money } from "@/components/cards";
import { TruckImage } from "@/components/TruckImage";
import { Bekat, NarxQutisi, Qator, YolNuqtalari } from "@/components/ElonTafsilot";
import { xabarcha } from "@/components/Xabarcha";
import { ErrorBox, Skeleton } from "@/components/state";
import { api, FuramError } from "@/lib/api";
import { vehiclePhoto } from "@/lib/img";
import { useApi } from "@/lib/use-api";
import { currentLocale, t } from "@/lib/i18n";
import { color, font, radius, shadow, space, themed } from "@/lib/theme";
import { guestBlocked } from "@/lib/guest-gate";
import { ShareButton } from "@/components/ShareSheet";
import { ReportRow, ReportSheet } from "@/components/ReportSheet";

type Doc = { kind: string; state: string };

type Detail = {
  id: string;
  slug: string | null;
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
  /* Bog'lanish yo'llari — yuk e'lonidagi bilan bir xil qoida
     (`components/ContactLinks`), qaror serverda */
  links: Links | null;
  hasPhone: boolean;
};

export default function MashinaTafsilot() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [shot, setShot] = useState(0);
  const [revealing, setRevealing] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  /* Shikoyat varaqasi — do'kon talabi (2026-09-18, A12) */
  const [report, setReport] = useState(false);

  const { data, loading, error, refreshing, refresh, reload } = useApi<Detail>(
    id ? `/api/trucks/${id}` : null,
    [id],
  );

  const [yozBand, setYozBand] = useState(false);
  async function yozish() {
    if (guestBlocked()) return;
    setYozBand(true);
    try {
      const r = await api<{ chatId: string }>("/api/chats", { method: "POST", body: { kind: "truck", id: String(id) } });
      router.push({ pathname: "/suhbat/[id]", params: { id: r.chatId } });
    } catch (e) {
      xabarcha({ matn: (e as FuramError).message, ohang: "xato" });
    } finally {
      setYozBand(false);
    }
  }

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
  const rasmli = photos.length > 0 && !!v;
  const price = money(data.price.amount, data.price.currency, data.price.isNegotiable);

  return (
    <View style={s.root}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: space.xxl }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={color.brand} />
        }
      >
        {/* Surat bo'lsa — galereya tepada (1-qaror). Bo'lmasa bo'sh to'q
            blok o'rniga oddiy sarlavha: yuk sahifasi bilan bir xil */}
        {rasmli && v ? (
          <View style={s.gallery}>
            <Image source={vehiclePhoto(v.id, photos[shot])} style={s.shot} resizeMode="cover" />

            <Pressable
              onPress={() => router.back()}
              style={[s.round, { top: insets.top + 4, left: 12 }]}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel={t("mob.common.back")}
            >
              <Icon name="back" size={21} stroke="#fff" />
            </Pressable>

            {/* Ulashish — surat ustida, «orqaga» ning ro'parasida */}
            <View style={[s.shareWrap, { top: insets.top + 4 }]}>
              <ShareButton kind="truck" id={data.id} href={data.slug ? `/trucks/${data.slug}` : null} />
            </View>

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
        ) : (
          <View style={[s.header, { paddingTop: insets.top + 4 }]}>
            <Pressable
              onPress={() => router.back()}
              hitSlop={10}
              style={s.back}
              accessibilityRole="button"
              accessibilityLabel={t("mob.common.back")}
            >
              <Icon name="back" size={22} stroke={color.foreground} />
            </Pressable>
            <Text style={s.headerTitle} numberOfLines={1}>
              {t("mob.trucks.detailTitle")}
            </Text>
            <View style={s.headerRight}>
              <ShareButton kind="truck" id={data.id} href={data.slug ? `/trucks/${data.slug}` : null} compact />
            </View>
          </View>
        )}

        <View style={s.body}>
          {/* ── Asosiy karta: tur · yo'nalish · narx ── */}
          <View style={s.card}>
            <View style={s.heroTop}>
              {!rasmli ? (
                <View style={s.heroThumb}>
                  <TruckImage typeKey={data.truck.vehicleType.key} style={s.heroImg} />
                </View>
              ) : null}
              <View style={s.heroInfo}>
                <View style={s.typeChip}>
                  <Icon name="truck" size={15} stroke={color.foreground} />
                  <Text style={s.typeChipText} numberOfLines={1}>
                    {data.truck.vehicleType.name}
                  </Text>
                </View>
                <Text style={s.meta}>
                  {ago(data.createdAt)} · {t("mob.trucks.viewed", { n: data.views })}
                </Text>
              </View>
            </View>

            <View style={s.route}>
              <Bekat
                icon="truck"
                city={data.route.from}
                country={davlatNomi(data.route.fromCountry)}
                right={
                  data.truck.isFreeNow
                    ? t("mob.trucks.freeNow")
                    : data.truck.freeDate
                      ? t("mob.trucks.freeFrom", { d: sana(data.truck.freeDate) })
                      : undefined
                }
                rightTone={data.truck.isFreeNow ? color.successText : undefined}
              />
              <YolNuqtalari />
              <Bekat icon="border" city={data.route.to} country={davlatNomi(data.route.toCountry)} />
            </View>

            <NarxQutisi narx={price} />
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

          {/* ── Ma'lumotlar — ikonkali ro'yxat (yuk sahifasidagidek) ── */}
          <View style={[s.card, s.listCard]}>
            <Qator
              icon="package"
              label={t("mob.trucks.capShort")}
              value={data.truck.capacityT != null ? `${data.truck.capacityT} t` : "—"}
            />
            <Qator
              icon="grid"
              label={t("mob.last.volume")}
              value={data.truck.volumeM3 != null ? `${data.truck.volumeM3} m³` : "—"}
            />
            {v ? (
              <Qator icon="truck" label={t("mob.trucks.brand")} value={[v.brand, v.model].filter(Boolean).join(" ") || "—"} />
            ) : null}
            {v?.year ? <Qator icon="clock" label={t("mob.trucks.year")} value={String(v.year)} /> : null}
            {v?.trailer ? (
              <Qator
                icon="route"
                label={t("mob.trucks.trailer")}
                value={v.trailer.plate ?? t("mob.trucks.hidden")}
                locked={!v.trailer.plate}
              />
            ) : null}
            {v ? (
              <Qator icon="doc" label={t("mob.trucks.plate")} value={v.plate ?? "01 A ••• ••"} locked={!v.plate} />
            ) : null}
            <Qator
              icon="wallet"
              label={t("mob.post.payType")}
              value={[
                tolov()[data.price.paymentType] ?? data.price.paymentType,
                data.price.advance
                  ? t("mob.load.advance", { sum: money(data.price.advance, data.price.currency) ?? "" })
                  : null,
              ]
                .filter(Boolean)
                .join(" · ")}
              last={!data.truck.takesExtraLoad}
            />
            {data.truck.takesExtraLoad ? (
              <View style={s.extraNote}>
                <Icon name="plus" size={15} stroke={color.blue} />
                <Text style={s.extraText}>{t("mob.trucks.takesExtra")}</Text>
              </View>
            ) : null}
          </View>

          {/* Egasi — Telegram e'lonida «egasi» guruh boti: «Telegram, — — 0»
              degan ma'nosiz karta chiqardi (2026-09-21) */}
          {data.owner && data.source !== "TELEGRAM" ? (
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

          {/* Izoh — Telegram e'lonida ko'rsatilmaydi (Bekzod, 2026-09-21: «tg dan
              kelgan datani ko'rsatma»): u yerdagi matn guruhning xom posti */}
          {data.description && data.source !== "TELEGRAM" ? (
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

            {/* Telegram / WhatsApp / SMS — raqamsiz e'londa asl
                postga havola yagona yo'l bo'lib qoladi */}
            <ContactLinks links={data.links} hasPhone={data.hasPhone} />
          </View>

          {/* Shikoyat — do'kon talabi (2026-09-18, A12) */}
          {!data.isMine && data.owner ? (
            <ReportRow onPress={() => setReport(true)} label={t("mob.abuse.listing")} />
          ) : null}
        </View>
      </ScrollView>

      {report && data?.owner ? (
        <ReportSheet
          open
          onClose={() => setReport(false)}
          target="vehicle"
          targetId={String(id)}
          blockUserId={data.owner.id}
          onDone={(blocked) => {
            if (blocked) router.back();
          }}
        />
      ) : null}

      {/* O'z e'loni: shu mashinaga qanday yuk bor */}
      {data.isMine ? (
        <View style={[s.foot, { paddingBottom: insets.bottom + 14 }]}>
          <View style={{ flex: 1 }}>
            <Button
              title={t("mob.match.loadsTitle")}
              onPress={() =>
                router.push({
                  pathname: "/moslar/[kind]/[id]",
                  params: { kind: "mashina", id: data.id },
                })
              }
              icon={<Icon name="sparkle" size={18} stroke="#fff" />}
            />
          </View>
        </View>
      ) : null}

      {/* Pastdagi tugmalar */}
      {!data.isMine && data.source !== "TELEGRAM" ? (
        <View style={[s.foot, { paddingBottom: insets.bottom + 14 }]}>
          <View style={{ flex: 1 }}>
            <Button
              title={t("mob.trucks.writeOwner")}
              onPress={() => void yozish()}
              loading={yozBand}
              icon={<Icon name="chat" size={18} stroke="#fff" />}
            />
          </View>
        </View>
      ) : null}
    </View>
  );
}

function Stat({ label, value, good }: { label: string; value: string | number; good?: boolean }) {
  return (
    <View>
      <Text style={s.statLabel}>{label}</Text>
      <Text style={[s.statValue, good && { color: color.successText }]}>{value}</Text>
    </View>
  );
}

const s = themed(() => ({
  shareWrap: { position: "absolute", right: 12 },

  root: { flex: 1, backgroundColor: color.background },

  gallery: { height: 260, backgroundColor: "#b9c3cf" },
  shot: { width: "100%", height: 260 },
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
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 8, paddingBottom: 4 },
  back: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  headerTitle: { flex: 1, textAlign: "center", fontSize: 17, fontWeight: "700", color: color.foreground },
  headerRight: { width: 44, alignItems: "center", justifyContent: "center" },
  card: { backgroundColor: color.card, borderRadius: radius.card, padding: space.lg, ...shadow.card },
  heroTop: { flexDirection: "row", alignItems: "center", gap: space.md },
  heroThumb: {
    width: 96, height: 66, borderRadius: 18, backgroundColor: color.muted,
    alignItems: "center", justifyContent: "center",
  },
  heroImg: { width: 86, height: 54 },
  heroInfo: { flex: 1, minWidth: 0, gap: 7 },
  typeChip: {
    flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start",
    height: 30, paddingHorizontal: 10, borderRadius: radius.control, backgroundColor: color.muted,
  },
  typeChipText: { fontSize: 14, fontWeight: "700", color: color.foreground, flexShrink: 1 },
  route: {
    marginTop: space.lg, paddingTop: space.lg,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.border,
  },
  listCard: { paddingVertical: 4 },
  extraNote: { flexDirection: "row", alignItems: "center", gap: 9, paddingVertical: 13 },
  extraText: { flex: 1, fontSize: 13, fontWeight: "600", color: color.blue },

  sec: {
    backgroundColor: color.card,
    borderRadius: radius.card,
    padding: space.lg,
    ...shadow.card,
  },
  secTitle: { fontSize: font.caption, fontWeight: "700", color: color.foreground },

  meta: { fontSize: 12, color: color.mutedForeground },

  banner: { flexDirection: "row", gap: 11, borderRadius: radius.card, padding: 14 },
  bannerOk: { backgroundColor: color.successSoft },
  bannerWarn: { backgroundColor: color.warningSoft },
  bannerTitleOk: { fontSize: font.caption, fontWeight: "700", color: color.successText },
  bannerTextOk: { fontSize: 12, color: color.successText, marginTop: 3, lineHeight: 18 },
  bannerTitleWarn: { fontSize: font.caption, fontWeight: "700", color: color.warning },
  bannerTextWarn: { fontSize: 12, color: color.warning, marginTop: 3, lineHeight: 18 },


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

  note: { fontSize: 14, color: color.icon, marginTop: 7, lineHeight: 22 },

  contactOpen: { flexDirection: "row", alignItems: "center", gap: 12 },
  contactPhone: { fontSize: font.bodyLg, fontWeight: "700", color: color.foreground },
  err: { fontSize: font.caption, color: color.danger },

  foot: {
    flexDirection: "row",
    gap: 10,
    backgroundColor: color.card,
    paddingHorizontal: space.lg,
    paddingTop: 12,
    ...shadow.bar,
  },
}));

/* FUNKSIYA — til o'zgarganda qayta o'qilsin (yuk sahifasidagi `pay()` bilan bir xil) */
function tolov(): Record<string, string> {
  return { CASH: t("mob.load.cash"), TRANSFER: t("mob.load.transfer"), MIXED: t("mob.load.mixed") };
}

/** «2026-09-25» → «25-sen» — tanlangan tilda */
function sana(iso: string) {
  return new Date(iso).toLocaleDateString(currentLocale(), { day: "numeric", month: "short" });
}
