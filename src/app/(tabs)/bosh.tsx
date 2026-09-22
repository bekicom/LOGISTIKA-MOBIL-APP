/**
 * B1 — bosh sahifa. ROLGA QARAB ikki xil.
 *
 * Ma'lumot bitta so'rovdan keladi (`/api/home`): server rolni o'zi biladi
 * va `kind` bilan qaysi ko'rinish kerakligini aytadi.
 *
 * ── DIZAYN-2, 3-QADAM ────────────────────────────────────────────
 *
 * Salomlashish katta, tez amallar rangli ikonka bilan, haydovchiga
 * «Yuk qidirish» kartasi (LoadMe uslubi — yo'nalish bilan qidiruv
 * bosh sahifadan boshlanadi). Karta chegarasiz, soya bilan.
 *
 * Dispetcher salomlashuvi kodda o'zbekcha qotib qolgan edi
 * («Salom, … Bugun hammasi joyida») — lug'atga ko'chdi.
 *
 * ── TZ-05: BESH ASOSIY VA ROLGA XOS QATOR (2026-09-19) ──────────
 *
 * Salomlashishdan keyin — hamma rolda bir xil besh tugma, ostida
 * rolning o'z tugmalari (`/api/home` → `quick`, web bilan bitta
 * manba). Ilgari faqat haydovchida to'rtta qattiq yozilgan tugma bor
 * edi, SOS esa bosilmasdi. SOS endi faol reys kartasi ostida — faqat
 * reys yo'lda bo'lganda (reys ekranidagi shart bilan bir xil).
 */
import { useCallback, useEffect, useState } from "react";
import { Pressable, RefreshControl, ScrollView, View } from "react-native";
import { Text } from "@/components/Text";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { Icon, type IconName } from "@/components/Icon";
import { Logo } from "@/components/Logo";
import { HeaderIcons } from "@/components/TabHeader";
import { setCounts } from "@/lib/counts";
import { activeTrip, isRunning as gpsRunning, stop as gpsStop } from "@/lib/gps";
import { ListingCard, TripCard, type Listing, type TripItem } from "@/components/cards";
import { Skeleton, ErrorBox, Empty } from "@/components/state";
import { FxStrip, StartHere } from "@/components/HomeStart";
import { TodayCard } from "@/components/TodayCard";
import { TourPanel } from "@/components/TourPanel";
import { HomeMap } from "@/components/HomeMap";
import { AsosiyTugmalar, RolTugmalari } from "@/components/HomeQuick";
import type { TezkorTugma } from "@/lib/bosh-tugmalar";
import { useApi } from "@/lib/use-api";
import { color, font, radius, shadow, space, themed } from "@/lib/theme";
import { t } from "@/lib/i18n";

type Home =
  | {
      kind: "driver";
      user: { firstName: string; role: string; furamId: number };
      unreadNotifications: number;
      expiringDocuments: number;
      activeTrips: TripItem[];
      /** Rolga xos tezkor tugmalar (TZ-05); eski serverda yo'q */
      quick?: TezkorTugma[];
      suggestedLoads: Listing[];
    }
  | {
      kind: "dispatcher";
      user: { firstName: string; role: string; furamId: number };
      unreadNotifications: number;
      expiringDocuments: number;
      activeTrips: TripItem[];
      quick?: TezkorTugma[];
      counts: { liveTrips: number; problems: number; awaitingReply: number; expiringDocuments: number };
      /** `name: null` — ismsiz suhbat, ilova o'z tilida yozadi */
      recentChats: { id: string; name: string | null; lastMessage: string | null; lastAt: string }[];
    };

export default function Bosh() {
  const { data, loading, error, refreshing, refresh, reload } = useApi<Home>("/api/home");
  const insets = useSafeAreaInsets();
  const router = useRouter();

  /* Qo'ng'iroq nishoni endi sarlavha komponentida — sanoqni
     do'konga yozib qo'yamiz, u yerdan o'qiydi */
  useEffect(() => {
    if (data) setCounts({ notif: data.unreadNotifications });
  }, [data]);

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      {/* Sarlavha */}
      <View style={s.header}>
        <Logo width={104} />
        <View style={{ flex: 1 }} />
        {/* Dizayn-2: qidiruv, chat va qo'ng'iroq — hamma tabda bir xil
            (`TabHeader`). Sanoqlar `lib/counts` do'konidan. */}
        {/* Avatar `HeaderIcons` ichida — 2026-09-07 dan u HAR
            tabda bor. Bu yerda alohida chizilsa ikkita bo'lardi. */}
        <HeaderIcons search />
      </View>

      {/* GPS chizig'i — faqat kuzatuv HAQIQATAN ishlayotganda */}
      <GpsChiziq trips={data?.activeTrips ?? []} />

      <ScrollView
        contentContainerStyle={[s.scroll, { paddingBottom: space.xxl * 2 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={color.brand} />}
        showsVerticalScrollIndicator={false}
      >
        {loading ? <Skeleton /> : null}
        {error ? <ErrorBox message={error} onRetry={reload} /> : null}

        {data ? (
          <Hello
            name={data.user.firstName}
            sub={
              data.kind === "dispatcher"
                ? data.counts.problems > 0
                  ? t("mob.home.todayProblems", { n: data.counts.problems })
                  : t("mob.home.todayOk")
                : data.expiringDocuments > 0
                  ? t("mob.home.docExpiringN", { n: data.expiringDocuments })
                  : t("mob.home.todayOk")
            }
            warn={data.kind === "dispatcher" ? data.counts.problems > 0 : data.expiringDocuments > 0}
          />
        ) : null}

        {/* Besh asosiy tugma — hamma rolda, ma'lumot kutmaydi (TZ-05) */}
        <AsosiyTugmalar />
        {/* Rolning o'z tugmalari — serverdan (web bilan bitta jadval) */}
        {data?.quick?.length ? <RolTugmalari quick={data.quick} /> : null}

        {/* «Bugun siz uchun» — kurs USTIDA: bu vazifa, kurs esa
            ma'lumot. Vazifa bo'lmasa kartochka umuman chizilmaydi. */}
        <TodayCard />

        {/* «Ishga chiqdim» — HAYDOVCHIGA, bosh sahifada.
            Webda u `/driver` sahifasida turadi, ilovada esa
            haydovchi aynan bosh sahifaga tushadi va kunlik ishi
            shu tugmadan boshlanadi. */}
        {data?.kind === "driver" ? <TourPanel /> : null}

        {/* Kurs — ikkala rolda ham. Narx o'girish kunlik ish va u
            bo'limlar ichida ko'milib qolmasin. */}
        <FxStrip />

        {/* Xarita — kursdan KEYIN: kurs har kuni kerak bo'ladigan
            raqam, xarita esa «bozor tirikmi» degan savolga javob.
            Yo'nalish bo'lmasa kartochka o'zi chizilmaydi. */}
        <HomeMap />

        {data?.kind === "dispatcher" ? (
          <Dispatcher
            data={data}
            onTrip={(tid) => router.push(`/reys/${tid}`)}
            onChat={(cid) => router.push(`/suhbat/${cid}`)}
          />
        ) : null}

        {data?.kind === "driver" ? (
          <Driver
            data={data}
            onLoads={() => router.push("/yuklar")}
            onSearch={() => router.push({ pathname: "/yuklar", params: { filtr: "1" } })}
            onTrip={(tid) => router.push(`/reys/${tid}`)}
            onSos={(tid) => router.push({ pathname: "/reys/[id]", params: { id: tid, sos: "1" } })}
            onLoad={(lid) => router.push(`/yuk/${lid}`)}
            onDocs={() => router.push("/hujjatlarim")}
          />
        ) : null}

        {/* «Boshlash» — eng OXIRIDA. Yangi odamga kerak, tanish
            odamga esa lenta muhimroq; tepaga qo'ysak, har ochilishda
            u ishini ikkinchi ekrandan boshlardi. */}
        <StartHere />
      </ScrollView>
    </View>
  );
}

/* ──────────────────────────────────────────────── GPS chizig'i */

/**
 * «GPS yoqilgan» chizig'i — FAQAT kuzatuv haqiqatan ishlayotganda.
 *
 * Ilgari chiziq FAOL REYS bo'lsa chizilardi: kuzatuv o'chiq bo'lsa ham
 * «GPS yoqilgan» deb turardi, «To'xtatish» esa oddiy matn edi va
 * bosilmasdi (2026-09-23 da video yozayotganda topildi). Ikkalasi ham
 * joylashuv haqida YOLG'ON da'vo — Google do'koni buni rad etish sababi
 * deb biladi, haydovchi esa yozuvni to'xtata olmasdi.
 */
function GpsChiziq({ trips }: { trips: TripItem[] }) {
  const router = useRouter();
  const [tripId, setTripId] = useState<string | null>(null);

  const holat = useCallback(async () => {
    setTripId((await gpsRunning()) ? await activeTrip() : null);
  }, []);

  /* Ekranga qaytganda ham tekshiriladi: kuzatuv reys ekranidan
     yoqiladi va shu chiziq darrov to'g'ri bo'lishi kerak */
  useFocusEffect(
    useCallback(() => {
      void holat();
      const timer = setInterval(() => void holat(), 15_000);
      return () => clearInterval(timer);
    }, [holat]),
  );

  if (!tripId) return null;
  const no = trips.find((tr) => tr.id === tripId)?.no ?? null;

  return (
    <View style={s.gps}>
      <View style={s.gpsDot} />
      <Pressable style={{ flex: 1 }} onPress={() => router.push(`/reys/${tripId}`)} accessibilityRole="button">
        <Text style={s.gpsText}>
          {t("mob.home.gpsOn")}
          {no != null ? <Text style={{ fontWeight: "600", color: "#fff" }}> #TR-{no}</Text> : null}
        </Text>
      </Pressable>
      <Pressable
        onPress={async () => {
          await gpsStop();
          void holat();
        }}
        hitSlop={10}
        accessibilityRole="button"
      >
        <Text style={s.gpsStop}>{t("mob.home.gpsStop")}</Text>
      </Pressable>
    </View>
  );
}

/* ─────────────────────────────────────────────── salomlashish */

function Hello({ name, sub, warn }: { name: string; sub: string; warn: boolean }) {
  return (
    <View style={s.hello}>
      <Text style={s.helloName}>
        {t("mob.home.hello")} {name} 👋
      </Text>
      <Text style={[s.helloSub, warn && { color: color.warning }]}>{sub}</Text>
    </View>
  );
}

/* ─────────────────────────────────────────────── haydovchi */

function Driver({ data, onLoads, onSearch, onTrip, onSos, onLoad, onDocs }: {
  data: Extract<Home, { kind: "driver" }>;
  onLoads: () => void;
  onSearch: () => void;
  onTrip: (id: string) => void;
  onSos: (id: string) => void;
  onLoad: (id: string) => void;
  onDocs: () => void;
}) {
  const trip = data.activeTrips[0] ?? null;

  return (
    <>
      {/* Qidiruv kartasi — yuk topish bosh sahifadan boshlanadi */}
      <Pressable onPress={onSearch} style={({ pressed }) => [s.search, pressed && { opacity: 0.85 }]}>
        <View style={s.searchIcon}>
          <Icon name="search" size={22} stroke="#ffffff" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.searchTitle}>{t("mob.home.searchTitle")}</Text>
          <Text style={s.searchHint} numberOfLines={1}>
            {t("mob.home.searchHint")}
          </Text>
        </View>
        <Icon name="chevron" size={20} stroke="#94a3b8" />
      </Pressable>

      {trip ? (
        <>
          <TripCard item={trip} onPress={() => onTrip(trip.id)} />
          {/* SOS — reys ekranini varaq OCHIQ holda ochadi. Ilgari bu yerda
              bosilmaydigan SOS katagi turardi (Apple 2.1) */}
          {trip.isLive ? (
            <Pressable
              onPress={() => onSos(trip.id)}
              accessibilityRole="button"
              style={({ pressed }) => [s.sos, pressed && { opacity: 0.85 }]}
            >
              <Icon name="alert" size={18} stroke={color.danger} />
              <Text style={s.sosText}>{t("mob.sos.btn")}</Text>
            </Pressable>
          ) : null}
        </>
      ) : (
        <Empty
          icon="route"
          title={t("mob.home.noActiveTrip")}
          text={t("mob.home.noTripText")}
          actionLabel={t("mob.home.findLoad")}
          onAction={onLoads}
        />
      )}

      {data.expiringDocuments > 0 ? (
        <Pressable onPress={onDocs} style={({ pressed }) => [s.alert, pressed && { opacity: 0.85 }]}>
          <View style={s.alertIcon}>
            <Icon name="clock" size={19} stroke={color.warning} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.alertTitle}>
              {t("mob.home.docExpiringN", { n: data.expiringDocuments })}
            </Text>
            <Text style={s.alertText}>{t("mob.home.docExpiringHint")}</Text>
          </View>
          <Icon name="chevron" size={18} stroke={color.warning} />
        </Pressable>
      ) : null}

      {data.suggestedLoads.length > 0 ? (
        <View style={{ gap: space.md }}>
          <View style={s.sectionHead}>
            <Text style={s.sectionTitle}>{t("mob.home.suggested")}</Text>
            <Pressable onPress={onLoads} hitSlop={8}>
              <Text style={s.link}>{t("mob.common.all")}</Text>
            </Pressable>
          </View>
          {data.suggestedLoads.map((l) => (
            <ListingCard key={l.id} item={l} onPress={() => onLoad(l.id)} />
          ))}
        </View>
      ) : null}
    </>
  );
}

/* ─────────────────────────────────────────────── dispetcher */

function Dispatcher({ data, onTrip, onChat }: {
  data: Extract<Home, { kind: "dispatcher" }>;
  onTrip: (id: string) => void;
  onChat: (id: string) => void;
}) {
  const c = data.counts;
  return (
    <>
      <View style={s.tiles}>
        <Tile icon="route" label={t("mob.home.activeTrips")} value={c.liveTrips} tint={color.brand} bg={color.brandSoft} />
        <Tile icon="alert" label={t("mob.home.problems")} value={c.problems} tint={color.danger} bg={color.dangerSoft} hot />
        <Tile icon="chat" label={t("mob.home.waitingReply")} value={c.awaitingReply} tint={color.blue} bg={color.blueSoft} />
        <Tile icon="doc" label={t("mob.misc.docExpiryTile")} value={c.expiringDocuments} tint={color.warning} bg={color.warningSoft} hot />
      </View>

      {data.activeTrips.length > 0 ? (
        <View style={{ gap: space.md }}>
          <Text style={s.sectionTitle}>{t("mob.home.activeTrips")}</Text>
          {data.activeTrips.map((t) => (
            <TripCard key={t.id} item={t} onPress={() => onTrip(t.id)} />
          ))}
        </View>
      ) : (
        <Empty icon="route" title={t("mob.home.noActiveTrip")} text={t("mob.misc.noTripShort")} />
      )}

      {data.recentChats.length > 0 ? (
        <View style={{ gap: space.md }}>
          <Text style={s.sectionTitle}>{t("mob.home.recentChats")}</Text>
          <View style={s.list}>
            {data.recentChats.map((ch, i) => {
              /* Ilgari qator bosilmasdi — suhbatni chatlar ro'yxatidan qayta
                 qidirish kerak edi */
              const nomi = ch.name ?? t("mob.chat.conversation");
              return (
                <Pressable
                  key={ch.id}
                  onPress={() => onChat(ch.id)}
                  accessibilityRole="button"
                  style={({ pressed }) => [s.chatRow, i > 0 && s.divider, pressed && { opacity: 0.7 }]}
                >
                  <View style={s.chatAvatar}>
                    <Text style={s.chatAvatarText}>{nomi.slice(0, 2).toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.chatName} numberOfLines={1}>{nomi}</Text>
                    {ch.lastMessage ? (
                      <Text style={s.chatMsg} numberOfLines={1}>{ch.lastMessage}</Text>
                    ) : null}
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}
    </>
  );
}

/* ─────────────────────────────────────────────── bo'laklar */

function Tile({ icon, label, value, tint, bg, hot }: {
  icon: IconName; label: string; value: number; tint: string; bg: string;
  /** Nol bo'lmasa rang bilan ogohlantiradi (muammo, muddat) */
  hot?: boolean;
}) {
  const alert = hot && value > 0;
  return (
    <View style={s.tile}>
      <View style={[s.tileIcon, { backgroundColor: alert ? tint : bg }]}>
        <Icon name={icon} size={18} stroke={alert ? "#ffffff" : tint} />
      </View>
      <Text style={[s.tileValue, alert && { color: tint }]}>{value}</Text>
      <Text style={s.tileLabel} numberOfLines={1}>{label}</Text>
    </View>
  );
}

const s = themed(() => ({
  root: { flex: 1, backgroundColor: color.background },
  header: {
    paddingHorizontal: space.lg,
    paddingTop: 6,
    paddingBottom: space.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
  },

  gps: { backgroundColor: color.navy, paddingHorizontal: space.lg, paddingVertical: 9, flexDirection: "row", alignItems: "center", gap: 9 },
  gpsDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: color.brand },
  gpsText: { flex: 1, fontSize: 13, color: "#e2e8f0" },
  gpsStop: { fontSize: 13, fontWeight: "600", color: color.brandText },

  scroll: { padding: space.lg, paddingTop: space.sm, gap: space.md },

  hello: { marginBottom: 2 },
  helloName: { fontSize: 22, fontWeight: "800", color: color.foreground, letterSpacing: -0.4 },
  helloSub: { fontSize: 13.5, color: color.mutedForeground, marginTop: 2 },

  search: {
    backgroundColor: color.card,
    borderRadius: radius.card,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    ...shadow.card,
  },
  searchIcon: { width: 46, height: 46, borderRadius: 15, backgroundColor: color.brand, alignItems: "center", justifyContent: "center" },
  searchTitle: { fontSize: 16, fontWeight: "700", color: color.foreground },
  searchHint: { fontSize: 12.5, color: color.mutedForeground, marginTop: 2 },

  tiles: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  tile: {
    width: "47.5%", flexGrow: 1, backgroundColor: color.card, borderRadius: radius.card,
    padding: space.lg, ...shadow.card,
  },
  tileIcon: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  tileValue: { fontSize: 28, fontWeight: "800", color: color.foreground, marginTop: 10, letterSpacing: -0.5 },
  tileLabel: { fontSize: 12, color: color.mutedForeground, marginTop: 1 },

  sos: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    paddingVertical: 12, borderRadius: radius.card,
    borderWidth: 1.5, borderColor: color.danger + "55", backgroundColor: color.dangerSoft,
  },
  sosText: { fontSize: 15, fontWeight: "800", color: color.danger, letterSpacing: 0.3 },

  alert: {
    backgroundColor: color.warningSoft, borderRadius: radius.card,
    padding: space.lg, flexDirection: "row", alignItems: "center", gap: space.md,
  },
  alertIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: "#ffffff", alignItems: "center", justifyContent: "center" },
  alertTitle: { fontSize: 14, fontWeight: "700", color: color.foreground },
  alertText: { fontSize: 12, color: color.mutedForeground, marginTop: 2 },

  sectionHead: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" },
  sectionTitle: { fontSize: 17, fontWeight: "800", color: color.foreground, letterSpacing: -0.3 },
  link: { fontSize: 13, fontWeight: "700", color: color.brandText },

  list: { backgroundColor: color.card, borderRadius: radius.card, ...shadow.card },
  chatRow: { flexDirection: "row", alignItems: "center", gap: space.md, padding: space.md },
  divider: { borderTopWidth: 1, borderTopColor: color.border },
  chatAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: color.muted, alignItems: "center", justifyContent: "center" },
  chatAvatarText: { fontSize: 13, fontWeight: "600", color: color.mutedForeground },
  chatName: { fontSize: 14, fontWeight: "600", color: color.foreground },
  chatMsg: { fontSize: 12, color: color.mutedForeground, marginTop: 1 },
  /* eskirgan (font import saqlanadi) */
  unused: { fontSize: font.caption },
}));
