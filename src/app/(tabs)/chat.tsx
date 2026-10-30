/**
 * F1 — chat ro'yxati.
 *
 * Reysga bog'langan suhbat ostida reys belgisi turadi: dispetcherda
 * o'nlab suhbat bo'ladi va qaysi biri qaysi reysga tegishli ekani
 * darrov bilinishi kerak.
 *
 * A-qadam (2026-09-06, web bilan moslik): yordam suhbati DOIM
 * tepada alohida qatorda (`type === "SUPPORT"` — ro'yxatdan
 * ajratiladi, aks holda «Shaxsiy» ichida yo'qolardi); «Guruhlar»
 * yorlig'i — yo'nalish bo'yicha ochiq guruhlar, qo'shilish/chiqish;
 * «Muhim» — qadalgan suhbatlar; uzoq bosilsa — muhim / ovozsiz.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { FlatList, Image, Pressable, RefreshControl, ScrollView, TextInput, View } from "react-native";
import { Text } from "@/components/Text";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { Icon, type IconName } from "@/components/Icon";
import { Sheet } from "@/components/Sheet";
import { guruhRasmi, YangiGuruhSheet } from "@/components/Guruh";
import { Empty, ErrorBox, Skeleton } from "@/components/state";
import { api, FuramError } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { groupAbout, groupTitle } from "@/lib/chat";
import { tariffBlocked } from "@/lib/features";
import { color, font, radius, shadow, space, themed } from "@/lib/theme";
import { currentLocale, t } from "@/lib/i18n";

type Chat = {
  id: string;
  type: "PRIVATE" | "GROUP" | "SUPPORT";
  title: string;
  subtitle: string | null;
  tripId: string | null;
  bucket: "private" | "trip" | "contract" | "route";
  pinned: boolean;
  muted: boolean;
  unread: number;
  lastText: string | null;
  lastAt: string | null;
  /* TZ 28-okt Q63–Q67: asosiy guruh kaliti, arxiv, guruh rasmi */
  routeKey?: string | null;
  archived?: boolean;
  avatarUrl?: string | null;
};
type Group = {
  key: string;
  title?: string;
  chatId: string | null;
  members: number;
  joined: boolean;
  lastAt: string | null;
  /* O'z roli guruhi — ro'yxat boshida (Q64) */
  mine?: boolean;
  muted?: boolean;
  /** Bo'lim (TZ 29-okt §4.1.2): umumiy / asosiy / yo'nalish / yordam */
  turi?: "umumiy" | "asosiy" | "yonalish" | "yordam";
};

/* «Guruhlar katalogi» bo'limlari — web bilan bir xil tartib
   (`furam/src/components/chat/guruh-ui.tsx`) */
const BOLIMLAR = ["umumiy", "asosiy", "yonalish", "yordam"] as const;
const bolimNomi = (b: (typeof BOLIMLAR)[number]) =>
  b === "umumiy"
    ? t("guruh.bolim_umumiy")
    : b === "asosiy"
      ? t("guruh.bolim_asosiy")
      : b === "yonalish"
        ? t("guruh.bolim_yonalish")
        : t("guruh.bolim_yordam");

/* ── UCHTA BO'LIM (2026-09-10, web bilan bir xil) ──────────────
 *
 * Ilgari YETTITA filtr bor edi va ular telefonda ikki qatorga
 * tushardi. «Yuk chatlari» bilan «Shartnomalar» farqi esa faqat
 * ichkariga kirgandan keyin ma'lum bo'lardi.
 *
 * Endi uchta, va har biri odam O'YLAYDIGAN savolga javob beradi:
 * «guruhlar qayerda», «shu reys bo'yicha kim yozgan», «tanishim
 * nima dedi».
 *
 * «O'qilmagan» va «Qadalgan» filtr sifatida OLIB TASHLANDI, lekin
 * yo'qolmadi: qadalgan suhbat har bo'lim ichida tepada turadi va
 * o'qilmagani baribir ko'k nishon bilan ajralib turadi. Filtr
 * bo'lib turgani esa har ochilishda tanlash talab qilardi.
 *
 * ⚠️ `bucket` maydoni SERVERDA o'zgarmadi — bo'lim shu yerda,
 * klientda hisoblanadi (web'da ham shunday). Server shartnomasini
 * o'zgartirmasdan ikki tomonni bir xil qilishning yagona yo'li. */
function tabs() {
  return [
    /* TZ v2 §5.2: Shaxsiy · Guruhlar · Reyslar — web bilan bir xil */
    { key: "shaxsiy", label: t("chatUi.tab_shaxsiy") },
    { key: "umumiy", label: t("chatUi.tab_guruhlar") },
    { key: "yuk", label: t("chatUi.tab_reyslar") },
  ] as const;
}

type Section = "umumiy" | "yuk" | "shaxsiy";

/** Suhbat qaysi bo'limga tushadi — web'dagi `sectionOf` bilan bir xil */
function sectionOf(c: { type: string; bucket: string }): Section {
  if (c.bucket === "trip" || c.bucket === "contract") return "yuk";
  /* GURUH — yo'nalish guruhi ham, umumiy guruh ham, oddiy yopiq
     guruh ham. Ilgari `routeKey` yo'q guruh `bucket` bo'yicha
     «Shaxsiy» ga tushardi va odam uni tanishlari orasidan
     qidirardi. */
  if (c.type === "GROUP") return "umumiy";
  return "shaxsiy";
}

function when(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) {
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  }
  const y = new Date(Date.now() - 86400000);
  if (d.toDateString() === y.toDateString()) return t("mob.chat.yesterday");
  return d.toLocaleDateString(currentLocale(), { day: "numeric", month: "short" });
}

export default function ChatRoyxati() {
  const [tab, setTab] = useState<Section>("shaxsiy");
  /* O'z guruhini ochish (TZ v2 §5.1) */
  const [yangiGuruh, setYangiGuruh] = useState(false);
  const [held, setHeld] = useState<Chat | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { data, loading, error, refreshing, refresh, reload } = useApi<{ chats: Chat[]; unread: number }>("/api/chats");

  /* SUHBATDAN QAYTGANDA RO'YXAT YANGILANADI (2026-09-19, brauzerda bosib
     sinalganda topildi): suhbat ichida odam bloklangach ilova shu
     ekranga qaytardi, ro'yxat esa eski holicha qolib, bloklangan
     suhbat va uning oxirgi xabari ko'rinib turardi. O'qilgan xabarlar
     soni ham shu sababdan kechikib yangilanardi.

     `refresh` har chizishda yangi funksiya — ref orqali olinadi, aks
     holda fokus effekti har chizishda qayta ishlab, halqa bo'lardi. */
  const yangila = useRef(refresh);
  useEffect(() => {
    yangila.current = refresh;
  });
  const birinchiFokus = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (birinchiFokus.current) {
        birinchiFokus.current = false;
        return;
      }
      yangila.current();
    }, []),
  );
  /* Yo'nalish guruhlari «Umumiy» bo'limida ko'rinadi — a'zo
     bo'lmagan guruhlar ham shu yerda taklif qilinadi */
  const groups = useApi<{ groups: Group[] }>(tab === "umumiy" ? "/api/chat/groups" : null, [tab]);

  const all = data?.chats ?? [];
  /* Yordam chati bo'limlarga TUSHMAYDI: u har doim tepada, alohida
     turadi — odam muammo bilan kelganda uni bo'lim tanlab
     qidirmasin. Web'da ham shunday. */
  const support = all.find((c) => c.type === "SUPPORT") ?? null;
  const rest = all.filter((c) => c.type !== "SUPPORT");
  /* Qadalgani bo'lim ICHIDA tepada — filtr yo'qolgani bilan u
     ko'rinmay qolmasin */
  /* Asosiy guruhlar (Q63) o'z kartasida, arxiv (Q66) — pastda yig'ilgan */
  const chats = rest
    .filter((c) => sectionOf(c) === tab && !(tab === "umumiy" && (c.routeKey || c.archived)))
    .sort((a, b) => Number(b.pinned) - Number(a.pinned));
  const arxiv = rest.filter((c) => c.archived);
  const [arxivOchiq, setArxivOchiq] = useState(false);
  const oqilmagan = new Map(rest.map((c) => [c.id, c.unread]));
  /* Ochiq guruhlarni nomi bo'yicha qidirish (Q67) */
  const [gq, setGq] = useState("");
  const ochiqlar = useApi<{ guruhlar: { id: string; title: string; members: number; joined: boolean }[] }>(
    tab === "umumiy" && gq.trim().length >= 2 ? `/api/chat/guruh/qidir?guruh=${encodeURIComponent(gq.trim())}` : null,
    [tab, gq],
  );

  const openChat = useCallback(
    (c: Chat) =>
      router.push({
        pathname: "/suhbat/[id]",
        params: { id: c.id, title: c.title, pinned: c.pinned ? "1" : "0", muted: c.muted ? "1" : "0" },
      }),
    [router],
  );

  /* ── QO'SHILISH MUMKIN BO'LGAN GURUHLAR ──────────────────────
     «Umumiy» bo'limi OSTIDA, ro'yxatni almashtirmasdan. Ilgari
     alohida yorliq edi va u bosilganda suhbatlar ro'yxati
     YO'QOLARDI — odam guruhga qo'shilib, keyin suhbatlarini
     qayerdan topishni o'ylab qolardi. Web'da ham ro'yxat ostida
     turadi. */
  /* ── ASOSIY GURUHLAR (TZ 28-okt Q63–Q65, Q68) ──────────────────
     «Guruhlar» bo'limi TEPASIDA: o'z roli guruhi birinchi («Sizning
     guruhingiz»), har birida o'qilmaganlar, qo'ng'iroqcha, «Tark etish» /
     «Ochish» yoki «Qo'shilish». Nom tepada, tugmalar pastda (2026-09-20
     qarori — uzun nom bo'linib ketmasin). */
  const AsosiyGuruhlar = () => {
    if (tab !== "umumiy") return null;
    const list = groups.data?.groups ?? [];
    if (list.length === 0) return null;
    /* «Guruhlar katalogi» (TZ 29-okt §4.2.3): chiqib ketgan guruhga shu
       yerdan bir bosishda qaytiladi; bo'limlar sarlavhasi bilan */
    const kartochka = (g: Group) => {
          const n = g.chatId ? (oqilmagan.get(g.chatId) ?? 0) : 0;
          return (
            <View key={g.key} style={[s.groupCard, g.mine && { borderWidth: 1.5, borderColor: color.brand }]}>
              <View style={s.groupTop}>
                <View style={[s.avatar, s.avatarGroup]}>
                  <Icon name="users" size={22} stroke={color.blue} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={s.name} numberOfLines={2}>{groupTitle(g.key, g.title)}</Text>
                  {g.mine ? <Text style={s.mineTag}>{t("guruh.yourGroup")}</Text> : null}
                  <Text style={s.last} numberOfLines={2}>{groupAbout(g.key)}</Text>
                </View>
                {n > 0 && g.joined ? (
                  <View style={s.badge}>
                    <Text style={s.badgeText}>{n > 99 ? "99+" : n}</Text>
                  </View>
                ) : null}
              </View>

              <View style={s.groupBottom}>
                <Text style={s.members}>{t("mob.chatList.members", { n: g.members })}</Text>
                {g.joined && g.chatId ? (
                  <View style={s.groupActions}>
                    {/* Bildirishnoma — har guruhda (Q68) */}
                    <Pressable
                      onPress={() => void qongiroq(g)}
                      disabled={busyKey === g.key}
                      accessibilityRole="switch"
                      accessibilityState={{ checked: !g.muted }}
                      accessibilityLabel={g.muted ? t("guruh.notifyOn") : t("guruh.notifyOff")}
                      style={({ pressed }) => [s.leaveBtn, pressed && { opacity: 0.6 }]}
                    >
                      <Text style={s.leaveText}>{g.muted ? "🔕" : "🔔"}</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => joinGroup(g, false)}
                      disabled={busyKey === g.key}
                      accessibilityRole="button"
                      style={({ pressed }) => [s.leaveBtn, pressed && { opacity: 0.6 }]}
                    >
                      <Text style={s.leaveText}>{t("guruh.leaveMain")}</Text>
                    </Pressable>
                    <Pressable
                      onPress={() =>
                        router.push({ pathname: "/suhbat/[id]", params: { id: g.chatId!, title: groupTitle(g.key, g.title) } })
                      }
                      accessibilityRole="button"
                      style={({ pressed }) => [s.openBtn, pressed && { opacity: 0.85 }]}
                    >
                      <Text style={s.openText}>{t("mob.chatList.open")}</Text>
                    </Pressable>
                  </View>
                ) : (
                  <Pressable
                    onPress={() => joinGroup(g, true)}
                    disabled={busyKey === g.key}
                    accessibilityRole="button"
                    style={({ pressed }) => [s.joinBtn, pressed && { opacity: 0.85 }]}
                  >
                    <Text style={s.joinText}>{t("mob.chatList.join")}</Text>
                  </Pressable>
                )}
              </View>
            </View>
          );
    };
    return (
      <View style={{ gap: space.sm, marginTop: space.sm }}>
        <Text style={s.katalog}>{t("guruh.katalog")}</Text>
        <Text style={s.groupsHint}>{t("guruh.katalogHint")}</Text>
        {BOLIMLAR.map((b) => {
          const ichi = list.filter((g) => (g.turi ?? "asosiy") === b);
          if (!ichi.length) return null;
          return (
            <View key={b} style={{ gap: space.sm }}>
              <Text style={s.bolim}>{bolimNomi(b)}</Text>
              {ichi.map(kartochka)}
            </View>
          );
        })}

        {/* Ochiq guruhlar qidiruvi (Q67) */}
        <TextInput
          value={gq}
          onChangeText={setGq}
          placeholder={t("guruh.searchGroupsPh")}
          placeholderTextColor={color.faintText}
          style={s.search}
        />
        {(ochiqlar.data?.guruhlar ?? []).map((g) => (
          <Pressable
            key={g.id}
            onPress={() => void ochiqqaQoshil(g)}
            style={({ pressed }) => [s.row, pressed && { opacity: 0.85 }]}
            accessibilityRole="button"
          >
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={s.name} numberOfLines={1}>{g.title}</Text>
              <Text style={s.members}>{t("mob.chatList.members", { n: g.members })}</Text>
            </View>
            <Text style={s.joinTextAlt}>{g.joined ? t("mob.chatList.open") : t("mob.chatList.join")}</Text>
          </Pressable>
        ))}
        {gq.trim().length >= 2 && ochiqlar.data?.guruhlar.length === 0 ? <Text style={s.groupsHint}>{t("guruh.notFound")}</Text> : null}

        <Text style={[s.groupsHint, { marginTop: space.sm }]}>{t("chatUi.myGroups")}</Text>
      </View>
    );
  };

  /* Arxivdagi yo'nalish guruhlari (Q66) — faqat o'qish uchun */
  const ArxivFooter = () => {
    if (tab !== "umumiy" || arxiv.length === 0) return null;
    return (
      <View style={{ marginTop: space.lg, gap: space.sm }}>
        <Pressable onPress={() => setArxivOchiq((v) => !v)} accessibilityRole="button" accessibilityState={{ expanded: arxivOchiq }}>
          <Text style={s.groupsHint}>
            🗄 {t("chatUi.archive")} ({arxiv.length}) {arxivOchiq ? "▲" : "▼"}
          </Text>
        </Pressable>
        {arxivOchiq
          ? arxiv.map((c) => (
              <Pressable key={c.id} onPress={() => openChat(c)} style={({ pressed }) => [s.row, pressed && { opacity: 0.85 }]}>
                <Text style={[s.name, s.nameRead]} numberOfLines={1}>{c.title}</Text>
              </Pressable>
            ))
          : null}
      </View>
    );
  };

  async function qongiroq(g: Group) {
    if (!g.chatId) return;
    setBusyKey(g.key);
    try {
      await api(`/api/chats/${g.chatId}/flags`, { method: "PATCH", body: { isMuted: !g.muted } });
      groups.reload();
    } catch (e) {
      setErr((e as FuramError).message ?? t("mob.msg.actionFailed"));
    } finally {
      setBusyKey(null);
    }
  }

  async function ochiqqaQoshil(g: { id: string; title: string; joined: boolean }) {
    try {
      if (!g.joined) {
        if (tariffBlocked("messenger")) return;
        await api("/api/chat/guruh/havola", { method: "POST", body: { chatId: g.id } });
      }
      router.push({ pathname: "/suhbat/[id]", params: { id: g.id, title: g.title } });
      setGq("");
      reload();
    } catch (e) {
      setErr((e as FuramError).message ?? t("mob.msg.actionFailed"));
    }
  }

  async function setFlag(c: Chat, patch: { isPinned?: boolean; isMuted?: boolean }) {
    setHeld(null);
    try {
      await api(`/api/chats/${c.id}/flags`, { method: "PATCH", body: patch });
      reload();
    } catch (e) {
      setErr((e as FuramError).message ?? t("mob.msg.actionFailed"));
    }
  }

  async function joinGroup(g: Group, join: boolean) {
    /* Qo'shilish tarif ortida; CHIQISH darvozadan oldin — tarifi
       tugagan odam guruhda qamalib qolmasin (server ham shunday) */
    if (join && tariffBlocked("messenger")) return;
    setBusyKey(g.key);
    setErr(null);
    try {
      const r = await api<{ chatId?: string }>("/api/chat/groups", { method: "POST", body: { routeKey: g.key, join } });
      if (join && r.chatId) {
        router.push({ pathname: "/suhbat/[id]", params: { id: r.chatId, title: groupTitle(g.key, g.title) } });
      }
      groups.reload();
      reload();
    } catch (e) {
      setErr((e as FuramError).message ?? t("mob.msg.actionFailed"));
    } finally {
      setBusyKey(null);
    }
  }

  useEffect(() => {
    if (err) {
      const id = setTimeout(() => setErr(null), 4000);
      return () => clearTimeout(id);
    }
  }, [err]);

  const Support = (
    <Pressable onPress={() => router.push("/yordam")} style={({ pressed }) => [s.support, pressed && { opacity: 0.85 }]}>
      <View style={s.supportIcon}>
        <Icon name="headset" size={22} stroke="#fff" />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Text style={s.supportTitle}>{t("mob.support.team")}</Text>
          <View style={s.supportTag}><Text style={s.supportTagText}>{t("mob.chat.support")}</Text></View>
        </View>
        <Text style={s.supportSub} numberOfLines={1}>{support?.lastText ?? t("mob.support.rowHint")}</Text>
      </View>
      {support && support.unread > 0 ? (
        <View style={s.badge}><Text style={s.badgeText}>{support.unread}</Text></View>
      ) : (
        <Icon name="chevron" size={18} stroke={color.brand} />
      )}
    </Pressable>
  );

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <View style={s.head}>
        <View style={s.headRow}>
          <Text style={s.title}>{t("mob.chat.title")}</Text>
          {(data?.unread ?? 0) > 0 ? (
            <View style={s.unreadPill}>
              <Text style={s.unreadPillText}>{data!.unread}</Text>
            </View>
          ) : null}
          <View style={{ flex: 1 }} />
          <Pressable onPress={() => router.push("/profil/messenger")} hitSlop={8} style={s.langBtn} accessibilityLabel={t("mob.chatLang.title")}>
            <Icon name="globe" size={19} stroke={color.foreground} />
          </Pressable>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tabs}>
          {tabs().map((tb) => {
            const on = tab === tb.key;
            /* Yorliqda SUHBAT soni emas, O'QILMAGAN xabar soni.
               «Umumiy 12» degan yozuv hech narsa aytmaydi — odam
               bo'limda 12 ta suhbat borligini biladi. «Umumiy 3»
               esa uchta yangi xabar borligini aytadi (web'da ham
               shu qaror). */
            const n = rest
              .filter((c) => sectionOf(c) === tb.key)
              .reduce((sum, c) => sum + c.unread, 0);
            return (
              <Pressable key={tb.key} onPress={() => setTab(tb.key)} accessibilityRole="tab" accessibilityState={{ selected: on }} style={[s.tab, on && s.tabOn]}>
                <Text style={[s.tabText, on && s.tabTextOn]}>{tb.label}</Text>
                {n > 0 ? (
                  <View style={[s.tabBadge, on && { backgroundColor: "#ffffff33" }]}>
                    <Text style={s.tabBadgeText}>{n}</Text>
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {tab === "umumiy" ? (
        <Pressable onPress={() => setYangiGuruh(true)} style={s.newGroup} accessibilityRole="button">
          <Icon name="plus" size={16} stroke={color.brand} />
          <Text style={s.newGroupText}>{t("guruh.newGroup")}</Text>
        </Pressable>
      ) : null}

      <YangiGuruhSheet
        open={yangiGuruh}
        onClose={() => setYangiGuruh(false)}
        onDone={(chatId, title) => {
          setYangiGuruh(false);
          router.push({ pathname: "/suhbat/[id]", params: { id: chatId, title } });
        }}
      />

      {err ? (
        <View style={s.errBar}>
          <Icon name="alert" size={15} stroke={color.danger} />
          <Text style={s.errText}>{err}</Text>
        </View>
      ) : null}

      <FlatList
          data={chats}
          keyExtractor={(c) => c.id}
          contentContainerStyle={[s.list, { paddingBottom: insets.bottom + space.xl }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={color.brand} />}
          showsVerticalScrollIndicator={false}
          /* Yordam chati HAR bo'limda tepada: odam muammo bilan
             kelganda uni bo'lim tanlab qidirmasin (web'da ham
             ro'yxatdan tashqarida, alohida qatorda turadi) */
          ListHeaderComponent={
            <>
              {Support}
              {AsosiyGuruhlar()}
            </>
          }
          ListFooterComponent={ArxivFooter}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => openChat(item)}
              onLongPress={() => setHeld(item)}
              delayLongPress={300}
              style={({ pressed }) => [s.row, item.unread > 0 && s.rowUnread, pressed && { opacity: 0.85 }]}
            >
              {/* Tur ko'rinishdan ajralsin (TZ 29-okt §4.1.3): shaxsiy — doira,
                  guruh — kvadrat, reys — to'q ko'k, shartnoma — brend rangi */}
              <View
                style={[
                  s.avatar,
                  item.type === "GROUP" && s.avatarGroup,
                  item.bucket === "trip" && s.avatarTrip,
                  item.bucket === "contract" && s.avatarContract,
                ]}
              >
                {item.avatarUrl ? (
                  /* Guruh rasmi (Q67) — faqat a'zoga, sarlavha bilan */
                  <Image source={guruhRasmi(item.id)} style={s.avatarImg} />
                ) : item.bucket === "trip" ? (
                  <Icon name="route" size={22} stroke="#fff" />
                ) : item.bucket === "contract" ? (
                  <Icon name="doc" size={22} stroke={color.brandText} />
                ) : item.type === "GROUP" ? (
                  <Icon name="users" size={22} stroke={color.blue} />
                ) : (
                  <Text style={s.avatarText}>{item.title.slice(0, 2).toUpperCase()}</Text>
                )}
              </View>

              <View style={{ flex: 1, minWidth: 0 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                  {item.pinned ? <Icon name="pin" size={13} stroke={color.brand} /> : null}
                  <Text style={[s.name, item.unread === 0 && s.nameRead]} numberOfLines={1}>{item.title}</Text>
                  {item.muted ? <Icon name="bell" size={13} stroke={color.iconFaint} /> : null}
                  {item.type === "GROUP" ? (
                    <Text style={s.turTag}>
                      {item.bucket === "trip" ? t("chatUi.tur_reys") : item.bucket === "contract" ? t("chatUi.tur_shartnoma") : t("chatUi.tur_guruh")}
                    </Text>
                  ) : null}
                </View>
                {item.lastText ? <Text style={s.last} numberOfLines={1}>{item.lastText}</Text> : null}
                {item.bucket === "trip" && item.subtitle ? (
                  <View style={s.tripTag}>
                    <Icon name="route" size={12} stroke={color.brandText} />
                    <Text style={s.tripText} numberOfLines={1}>{item.subtitle}</Text>
                  </View>
                ) : null}
              </View>

              <View style={{ alignItems: "flex-end", gap: 6 }}>
                <Text style={s.time}>{when(item.lastAt)}</Text>
                {item.unread > 0 ? (
                  <View style={s.badge}>
                    <Text style={s.badgeText}>{item.unread > 99 ? "99+" : item.unread}</Text>
                  </View>
                ) : null}
              </View>
            </Pressable>
          )}
          ListEmptyComponent={
            /* Umuman suhbat bo'lmasa — to'liq tushuntirish; bitta
               bo'lim bo'sh bo'lsa — qisqa satr. Ikkisi bir xil
               bo'lsa, yangi odam «ilova ishlamayapti» deb
               o'ylardi. */
            loading ? <Skeleton rows={2} /> : error ? <ErrorBox message={error} onRetry={reload} /> : rest.length > 0 ? (
              <Empty icon="chat" title={t("mob.chat.emptyTab")} />
            ) : (
              <Empty icon="chat" title={t("mob.chat.empty")} text={t("mob.ui.chatEmptyText")} />
            )
          }
        />

      {/* Uzoq bosish: muhim / ovozsiz */}
      <Sheet open={!!held} onClose={() => setHeld(null)} title={held?.title}>
        {held ? (
          <>
            <Row icon="pin" label={t(held.pinned ? "mob.msg.menu.unpinChat" : "mob.msg.menu.pinChat")} onPress={() => setFlag(held, { isPinned: !held.pinned })} />
            <Row icon="bell" label={t(held.muted ? "mob.msg.menu.unmute" : "mob.msg.menu.mute")} onPress={() => setFlag(held, { isMuted: !held.muted })} last />
          </>
        ) : null}
      </Sheet>
    </View>
  );
}

function Row({ icon, label, onPress, last }: { icon: IconName; label: string; onPress: () => void; last?: boolean }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [s.menuRow, !last && s.menuDivider, pressed && { opacity: 0.6 }]}>
      <Icon name={icon} size={19} stroke={color.icon} />
      <Text style={s.menuLabel}>{label}</Text>
    </Pressable>
  );
}

const s = themed(() => ({
  root: { flex: 1, backgroundColor: color.background },
  newGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    marginHorizontal: space.lg,
    marginTop: space.sm,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.brand,
    backgroundColor: color.brandSoft,
  },
  newGroupText: { fontSize: 13, fontFamily: "Manrope_700Bold", color: color.brand },
  head: { paddingTop: 4, paddingBottom: space.sm, gap: space.md },
  headRow: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: space.lg },
  title: { fontSize: 24, fontWeight: "800", color: color.foreground, letterSpacing: -0.5 },
  langBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: color.card, alignItems: "center", justifyContent: "center", ...shadow.card },
  unreadPill: { minWidth: 24, height: 24, paddingHorizontal: 8, borderRadius: 12, backgroundColor: color.brand, alignItems: "center", justifyContent: "center", marginLeft: 4 },
  unreadPillText: { fontSize: 12, fontWeight: "800", color: "#ffffff" },

  tabs: { alignItems: "center", flexDirection: "row", gap: 7, paddingHorizontal: space.lg },
  tab: { height: 34, paddingHorizontal: 14, borderRadius: radius.pill, backgroundColor: color.card, flexDirection: "row", alignItems: "center", gap: 6, ...shadow.card },
  tabOn: { backgroundColor: color.blue },
  tabText: { fontSize: 13, fontWeight: "600", color: color.mutedForeground },
  tabTextOn: { fontWeight: "700", color: "#fff" },
  tabBadge: { minWidth: 18, height: 18, paddingHorizontal: 5, borderRadius: 9, backgroundColor: color.brand, alignItems: "center", justifyContent: "center" },
  tabBadgeText: { fontSize: 10, fontWeight: "700", color: "#fff" },

  errBar: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: space.lg, paddingVertical: 8, backgroundColor: color.dangerSoft },
  errText: { fontSize: 12, color: color.danger, flex: 1 },

  list: { padding: space.lg, paddingTop: space.sm, gap: space.sm },
  support: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: color.brandSoft, borderRadius: radius.card, padding: space.md, marginBottom: 4 },
  supportIcon: { width: 46, height: 46, borderRadius: 15, backgroundColor: color.brand, alignItems: "center", justifyContent: "center" },
  supportTitle: { fontSize: font.body, fontWeight: "800", color: color.foreground, flexShrink: 1 },
  supportTag: { paddingHorizontal: 7, height: 18, borderRadius: 9, backgroundColor: color.brand, justifyContent: "center" },
  supportTagText: { fontSize: 9.5, fontWeight: "800", color: "#fff", letterSpacing: 0.3 },
  supportSub: { fontSize: font.caption, color: color.mutedForeground, marginTop: 2 },

  row: { flexDirection: "row", gap: space.md, alignItems: "center", backgroundColor: color.card, borderRadius: radius.card, padding: space.md, ...shadow.card },
  rowUnread: { backgroundColor: "#fff7f2" },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: color.muted, alignItems: "center", justifyContent: "center" },
  avatarGroup: { backgroundColor: color.blueSoft, borderRadius: 14 },
  avatarTrip: { backgroundColor: color.navy, borderRadius: 24 },
  avatarContract: { backgroundColor: color.brandSoft, borderRadius: 24 },
  turTag: { fontSize: 10, fontWeight: "800", color: color.mutedForeground, borderWidth: 1, borderColor: color.border, borderRadius: 8, paddingHorizontal: 5, paddingVertical: 1, overflow: "hidden" },
  katalog: { fontSize: font.body, fontWeight: "800", color: color.foreground },
  bolim: { fontSize: 11.5, fontWeight: "800", color: color.mutedForeground, textTransform: "uppercase", letterSpacing: 0.4, marginTop: space.xs },
  avatarText: { fontSize: 15, fontWeight: "700", color: color.mutedForeground },
  name: { fontSize: font.body, fontWeight: "700", color: color.foreground, flexShrink: 1 },
  nameRead: { fontWeight: "600", color: color.icon },
  last: { fontSize: font.caption, color: color.mutedForeground, marginTop: 2 },
  members: { fontSize: 11.5, color: color.mutedForeground, flexShrink: 1 },
  tripTag: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 5 },
  tripText: { fontSize: 11, fontWeight: "600", color: color.brandText, flexShrink: 1 },
  time: { fontSize: 11, color: color.mutedForeground },
  badge: { minWidth: 20, height: 20, paddingHorizontal: 6, borderRadius: 10, backgroundColor: color.brand, alignItems: "center", justifyContent: "center" },
  badgeText: { fontSize: 11, fontWeight: "700", color: "#fff" },

  groupsHint: { fontSize: 12.5, color: color.mutedForeground, lineHeight: 18 },
  mineTag: { fontSize: 11, fontWeight: "700", color: color.brand, marginTop: 2 },
  search: {
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.control,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: color.foreground,
    backgroundColor: color.card,
  },
  joinTextAlt: { fontSize: 13, fontWeight: "700", color: color.brand },
  avatarImg: { width: 48, height: 48, borderRadius: 24 },
  groupCard: { backgroundColor: color.card, borderRadius: radius.card, padding: space.md, gap: space.md, ...shadow.card },
  groupTop: { flexDirection: "row", gap: space.md, alignItems: "center" },
  groupBottom: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space.sm },
  groupActions: { flexDirection: "row", alignItems: "center", gap: space.sm },
  openBtn: { height: 34, paddingHorizontal: 16, borderRadius: 17, backgroundColor: color.blue, justifyContent: "center" },
  openText: { fontSize: 12.5, fontWeight: "700", color: "#fff" },
  leaveBtn: { height: 34, paddingHorizontal: 14, borderRadius: 17, borderWidth: 1, borderColor: color.border, justifyContent: "center" },
  leaveText: { fontSize: 12.5, fontWeight: "600", color: color.mutedForeground },
  joinBtn: { height: 34, paddingHorizontal: 16, borderRadius: 17, backgroundColor: color.brand, justifyContent: "center" },
  joinText: { fontSize: 13, fontWeight: "700", color: "#fff" },

  menuRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14, paddingHorizontal: 4 },
  menuDivider: { borderBottomWidth: 1, borderBottomColor: color.border },
  menuLabel: { fontSize: 15, fontWeight: "600", color: color.foreground },
}));
