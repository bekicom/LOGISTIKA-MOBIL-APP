/**
 * K2 — AI bilan suhbat.
 *
 * Uchta qaror dizayndan:
 *
 *  1. RAQAMLAR JADVALDA. Model «- 01 A 123 AA — 4 200 USD» deb yozsa,
 *     bu telefonda bir uzun satr bo'lib ketadi. Shunday satrlar
 *     guruhini jadval qilib CHIZAMIZ. Diqqat: bu faqat JOYLASHTIRISH —
 *     raqam o'ylab topilmaydi, model nima yozgan bo'lsa o'sha turadi.
 *  2. «MANBA» QATORI MAJBURIY. Server qaysi funksiyalarni chaqirganini
 *     `tools` da qaytaradi. Modelning o'zi manbani yozishiga tashlab
 *     qo'yilmaydi — u ba'zan yozadi, ba'zan yo'q.
 *  3. JAVOBDAN AMALGA. `actions` — bu modelning TAKLIFI, o'zi
 *     bajarilmagan. Tugma bosilganda server bajaradi.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Clipboard from "expo-clipboard";
import { Icon } from "@/components/Icon";
import { api, FuramError } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { t, tOr } from "@/lib/i18n";
import { color, font, radius, space } from "@/lib/theme";
import { tariffBlocked } from "@/lib/features";

type Action = { id: string; kind: string; title: string; furamNo?: number; url?: string };
type Tool = { name: string; args?: Record<string, unknown> };

type Msg = {
  id: string;
  role: "me" | "ai";
  text: string;
  tools?: Tool[];
  actions?: Action[];
  /** Chegara tugadi — javob emas, ogohlantirish */
  warn?: boolean;
};

type Reply = { threadId: string; answer: string; actions?: Action[]; tools?: Tool[] };
type Usage = { ask: { hourLeft: number; dayLeft: number } };

/**
 * Funksiya nomi → manba turi.
 *
 * Xom nom («match_trucks_for_my_load») foydalanuvchiga hech nima
 * demaydi va uni sakkiz tilga o'girish ham ma'nosiz. Shuning uchun
 * funksiyalar bir nechta MANBAGA yig'iladi.
 */
const SOURCE: Record<string, string> = {
  analytics: "analytics",
  trip_profit: "analytics",
  monthly_business: "analytics",
  daily_brief: "analytics",
  market_price: "analytics",
  my_trips: "trips",
  trip_state: "trips",
  my_loads: "feed",
  find_loads: "feed",
  find_trucks: "feed",
  match_loads_for_my_truck: "feed",
  match_trucks_for_my_load: "feed",
  fleet_state: "fleet",
  pick_vehicle: "fleet",
  expiring_documents: "docs",
  money: "money",
  my_contracts: "contracts",
  contract_check: "contracts",
  platform_help: "guide",
  trust_of: "people",
  pick_driver: "people",
  my_driver_state: "people",
  risks: "people",
};

/** Serverdagi web manzili → ilovadagi ekran */
const GOTO: Record<string, string> = {
  "/trips": "/reyslar",
  "/loads": "/yuklar",
  "/trucks": "/yuklar",
  "/chats": "/chat",
  "/profile": "/profil",
  "/panel": "/bosh",
  "/deals": "/reyslar",
  "/jobs": "/yuklar",
  "/contracts": "/reyslar",
};

/**
 * Server xatosini foydalanuvchi tilida ko'rsatish.
 *
 * Server KOD ham, matn ham yuboradi. Kod tanish bo'lsa tarjima
 * ishlatiladi; notanish bo'lsa serverning matni qoladi — ilgari
 * ruscha interfeysda «Soatlik chegara tugadi» chiqardi.
 */
function aiError(e: FuramError): string {
  return tOr(`mob.aiErr.${e.code}`, e.message || t("mob.ai.failed"));
}

let seq = 0;
const nextId = () => `m${++seq}`;

export default function Suhbat() {
  const { q } = useLocalSearchParams<{ q?: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [thread, setThread] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [ask, setAsk] = useState<Action | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const listRef = useRef<FlatList<Msg>>(null);
  const { data: usage, refresh } = useApi<Usage>("/api/ai/usage");

  const send = useCallback(
    async (question: string) => {
      const clean = question.trim();
      if (!clean || busy) return;
      /* Savol YOZILGANDAN keyin emas, YUBORISHDAN oldin: matn
         `setText("")` bilan tozalanmasin, odam uni yo'qotmasin. */
      if (tariffBlocked("ai")) return;

      setText("");
      setMsgs((m) => [...m, { id: nextId(), role: "me", text: clean }]);
      setBusy(true);
      try {
        const r = await api<Reply>("/api/ai/chat", {
          method: "POST",
          body: { question: clean, threadId: thread },
        });
        setThread(r.threadId);
        setMsgs((m) => [
          ...m,
          {
            id: nextId(),
            role: "ai",
            text: r.answer,
            tools: r.tools,
            actions: r.actions,
          },
        ]);
      } catch (e) {
        const err = e as FuramError;
        setMsgs((m) => [
          ...m,
          {
            id: nextId(),
            role: "ai",
            warn: true,
            text: aiError(err),
          },
        ]);
      } finally {
        setBusy(false);
        refresh();
      }
    },
    [busy, thread, refresh],
  );

  /* Tayyor savol bilan ochilgan bo'lsa — darrov yuboriladi. Odam
     savolni ko'chirib yozib o'tirmaydi. */
  const started = useRef(false);
  useEffect(() => {
    if (q && !started.current) {
      started.current = true;
      void send(q);
    }
  }, [q, send]);

  /** Taklifni tasdiqlash yoki rad etish */
  async function decide(a: Action, confirm: boolean) {
    setAsk(null);
    try {
      const r = await api<{ message?: string; goto?: string }>(`/api/ai/actions/${a.id}`, {
        method: "PATCH",
        body: { confirm },
      });
      setToast(confirm ? (r.message ?? t("mob.ai.actDone")) : t("mob.ai.actRejected"));
      const to = r.goto ? GOTO[r.goto] : null;
      if (to) router.push(to as never);
    } catch (e) {
      setToast(aiError(e as FuramError));
    }
  }

  const left = usage?.ask.hourLeft ?? null;

  return (
    <KeyboardAvoidingView
      style={[s.root, { paddingTop: insets.top }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={insets.top}
    >
      <View style={s.header}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={s.back}>
          <Icon name="back" size={22} stroke={color.foreground} />
        </Pressable>
        <View style={s.avatar}>
          <Icon name="sparkle" size={18} stroke={color.brand} />
        </View>
        <View style={s.grow}>
          <Text style={s.title} numberOfLines={1}>
            {t("mob.ai.title")}
          </Text>
          {left !== null ? (
            <Text style={[s.sub, left === 0 ? s.subOver : null]}>
              {left === 0 ? t("mob.ai.limitOver") : t("mob.ai.left", { n: left })}
            </Text>
          ) : null}
        </View>
      </View>

      <FlatList
        ref={listRef}
        data={msgs}
        keyExtractor={(m) => m.id}
        contentContainerStyle={s.list}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        ListEmptyComponent={
          <View style={s.hello}>
            <Text style={s.helloText}>{t("mob.ai.helloText")}</Text>
          </View>
        }
        renderItem={({ item }) => (
          <Bubble
            msg={item}
            onAction={setAsk}
            onCopy={() => {
              void Clipboard.setStringAsync(item.text);
              setToast(t("mob.ai.copied"));
            }}
          />
        )}
        ListFooterComponent={busy ? <Typing /> : null}
      />

      {toast ? (
        <Pressable style={s.toast} onPress={() => setToast(null)}>
          <Icon name="check" size={15} stroke={color.success} />
          <Text style={s.toastText}>{toast}</Text>
        </Pressable>
      ) : null}

      {/* Yozish */}
      <View style={[s.bar, { paddingBottom: insets.bottom + 10 }]}>
        <View style={s.field}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder={t("mob.ai.askPh")}
            placeholderTextColor="#94a3b8"
            style={s.input}
            multiline
            editable={!busy}
          />
        </View>
        <Pressable
          style={[s.sendBtn, !text.trim() || busy ? s.sendOff : null]}
          onPress={() => void send(text)}
          disabled={!text.trim() || busy}
          accessibilityRole="button"
        >
          {busy ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Icon name="arrow-right" size={19} stroke="#fff" />
          )}
        </Pressable>
      </View>

      {/* Taklif — AI o'zi bajarmaydi, odam qaror qiladi */}
      <Modal visible={!!ask} animationType="slide" transparent onRequestClose={() => setAsk(null)}>
        <Pressable style={s.backdrop} onPress={() => setAsk(null)}>
          <View style={[s.sheet, { paddingBottom: insets.bottom + space.lg }]}>
            <View style={s.grabber} />
            <Text style={s.sheetTitle}>{t("mob.ai.confirmTitle")}</Text>
            <Text style={s.sheetText}>{ask ? actionLabel(ask) : ""}</Text>
            <Text style={s.sheetNote}>{t("mob.ai.confirmNote")}</Text>

            <Pressable
              style={s.primary}
              onPress={() => ask && void decide(ask, true)}
              accessibilityRole="button"
            >
              <Text style={s.primaryText}>{t("mob.ai.confirm")}</Text>
            </Pressable>
            <Pressable
              style={s.ghost}
              onPress={() => ask && void decide(ask, false)}
              accessibilityRole="button"
            >
              <Text style={s.ghostText}>{t("mob.ai.reject")}</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
  );
}

/* ─────────────────────────────────────────────── bo'laklar */

function Bubble({
  msg,
  onAction,
  onCopy,
}: {
  msg: Msg;
  onAction: (a: Action) => void;
  onCopy: () => void;
}) {
  if (msg.role === "me") {
    return (
      <View style={s.me}>
        <Text style={s.meText}>{msg.text}</Text>
      </View>
    );
  }

  const src = sources(msg.tools);

  return (
    <View style={[s.ai, msg.warn ? s.aiWarn : null]}>
      {blocks(msg.text).map((b, i) =>
        b.kind === "table" ? (
          <View key={i} style={s.tbl}>
            {b.rows.map((r, j) => (
              <View key={j} style={[s.tr, j > 0 ? s.trLine : null]}>
                <Text style={s.tk}>{r.k}</Text>
                <Text style={[s.tv, r.neg ? s.tvNeg : null]}>{r.v}</Text>
              </View>
            ))}
          </View>
        ) : b.kind === "bullets" ? (
          <View key={i} style={s.bullets}>
            {b.items.map((it, j) => (
              <View key={j} style={s.bullet}>
                <Text style={s.dot}>•</Text>
                <Text style={s.txt}>{it}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text key={i} style={[s.txt, i > 0 ? s.txtGap : null]}>
            {b.text}
          </Text>
        ),
      )}

      {/* Qaysi ma'lumotga tayandi */}
      {src.length ? (
        <View style={s.srcRow}>
          <Icon name="route" size={13} stroke="#64748b" />
          <Text style={s.srcText}>
            {t("mob.ai.source")}: {src.map((k) => t(`mob.aiSrc.${k}`)).join(" · ")}
          </Text>
        </View>
      ) : null}

      {/* Javobdan amalga */}
      {!msg.warn ? (
        <View style={s.acts}>
          {(msg.actions ?? []).map((a) => (
            <Pressable key={a.id} style={s.act} onPress={() => onAction(a)} accessibilityRole="button">
              <Text style={s.actText} numberOfLines={1}>
                {actionLabel(a)}
              </Text>
            </Pressable>
          ))}
          <Pressable style={s.act} onPress={onCopy} accessibilityRole="button">
            <Text style={s.actText}>{t("mob.ai.copy")}</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

function Typing() {
  return (
    <View style={[s.ai, s.typing]}>
      <View style={s.dots}>
        <View style={[s.tdot, { backgroundColor: "#cbd5e1" }]} />
        <View style={[s.tdot, { backgroundColor: "#94a3b8" }]} />
        <View style={[s.tdot, { backgroundColor: "#cbd5e1" }]} />
      </View>
      <Text style={s.typingText}>{t("mob.ai.thinking")}</Text>
    </View>
  );
}

/* ─────────────────────────────────────────────── matnni bo'laklash */

type Block =
  | { kind: "text"; text: string }
  | { kind: "bullets"; items: string[] }
  | { kind: "table"; rows: { k: string; v: string; neg: boolean }[] };

/** «- Kalit — qiymat» ko'rinishidagi satr */
const PAIR = /^[-•*]\s*(.{1,40}?)\s*(?:—|–|:)\s*(.{1,24})$/;
const ITEM = /^[-•*]\s*(.+)$/;

/**
 * Javob matnini ko'rinadigan bo'laklarga ajratadi.
 *
 * HECH NIMA O'YLAB TOPILMAYDI: bu faqat joylashtirish. Ketma-ket
 * kelgan «- kalit — qiymat» satrlari jadval bo'ladi, oddiy «- ...»
 * satrlari ro'yxat, qolgani matn.
 */
export function blocks(answer: string): Block[] {
  const out: Block[] = [];
  const lines = answer.split("\n").map((l) => l.trim());

  let para: string[] = [];
  let group: string[] = [];

  const flushPara = () => {
    if (para.length) out.push({ kind: "text", text: para.join(" ") });
    para = [];
  };
  const flushGroup = () => {
    if (!group.length) return;
    const pairs = group.map((l) => l.match(PAIR));
    // Jadval faqat HAMMA satr juft bo'lsa va kamida ikkitasi bo'lsa
    if (group.length >= 2 && pairs.every(Boolean)) {
      out.push({
        kind: "table",
        rows: pairs.map((m) => ({
          k: m![1],
          v: m![2],
          neg: /^[−–-]/.test(m![2]),
        })),
      });
    } else {
      out.push({ kind: "bullets", items: group.map((l) => l.replace(ITEM, "$1")) });
    }
    group = [];
  };

  for (const line of lines) {
    if (!line) {
      flushGroup();
      flushPara();
      continue;
    }
    if (ITEM.test(line)) {
      flushPara();
      group.push(line);
    } else {
      flushGroup();
      para.push(line);
    }
  }
  flushGroup();
  flushPara();

  return out.length ? out : [{ kind: "text", text: answer }];
}

/** Chaqirilgan funksiyalardan manba turlari — takrorlanmagan holda */
function sources(tools?: Tool[]): string[] {
  const out: string[] = [];
  for (const tool of tools ?? []) {
    if (tool.name.startsWith("propose_")) continue;
    const key = SOURCE[tool.name] ?? "data";
    if (!out.includes(key)) out.push(key);
  }
  return out;
}

/**
 * Taklif yozuvi — SERVERNIKI EMAS.
 *
 * Server `title` ni o'zbekcha yozadi («#412 reysida lokatsiya
 * so'rash»). Bu yerda `kind` va reys raqamidan foydalanib yozuv
 * foydalanuvchi tilida tuziladi. Noma'lum tur bo'lsa serverniki
 * ishlatiladi — bo'sh tugmadan ko'ra shu yaxshi.
 */
function actionLabel(a: Action): string {
  const no = a.furamNo;
  if (a.kind === "open_page") return t("mob.aiAct.open_page");
  if (!no) return a.title;
  if (a.kind === "request_location") return t("mob.aiAct.request_location", { n: no });
  if (a.kind === "send_message") return t("mob.aiAct.send_message", { n: no });
  if (a.kind === "create_incident") return t("mob.aiAct.create_incident", { n: no });
  return a.title;
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.background },
  grow: { flex: 1 },

  header: {
    backgroundColor: color.card,
    paddingLeft: 4,
    paddingRight: space.lg,
    paddingTop: 4,
    paddingBottom: space.md,
    borderBottomWidth: 1,
    borderBottomColor: color.border,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  back: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: color.brand + "24",
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: font.bodyLg, fontWeight: "700", color: color.foreground },
  sub: { fontSize: 12, color: color.success },
  subOver: { color: color.danger },

  list: { padding: space.lg, gap: space.md },
  hello: { paddingVertical: space.xxl, paddingHorizontal: space.sm },
  helloText: {
    fontSize: font.caption,
    color: color.mutedForeground,
    textAlign: "center",
    lineHeight: 20,
  },

  me: {
    alignSelf: "flex-end",
    maxWidth: "85%",
    backgroundColor: color.navy,
    borderRadius: radius.card,
    borderBottomRightRadius: 4,
    paddingHorizontal: 15,
    paddingVertical: 11,
  },
  meText: { fontSize: font.body, color: "#fff", lineHeight: 21 },

  ai: {
    alignSelf: "flex-start",
    maxWidth: "94%",
    backgroundColor: color.card,
    borderRadius: radius.card,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: color.border,
    padding: 15,
  },
  aiWarn: { borderColor: color.warning + "66", backgroundColor: "#fffdf7" },

  txt: { fontSize: font.body, color: color.foreground, lineHeight: 23 },
  txtGap: { marginTop: 12 },

  bullets: { marginTop: 10, gap: 6 },
  bullet: { flexDirection: "row", gap: 8 },
  dot: { fontSize: font.body, color: color.mutedForeground, lineHeight: 23 },

  tbl: {
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: 10,
    overflow: "hidden",
    marginTop: 12,
  },
  tr: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 9, gap: 10 },
  trLine: { borderTopWidth: 1, borderTopColor: color.border },
  tk: { flex: 1, fontSize: font.caption, color: color.foreground },
  tv: { fontSize: font.caption, fontWeight: "700", color: color.foreground },
  tvNeg: { color: color.danger },

  srcRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: color.border,
  },
  srcText: { flex: 1, fontSize: font.micro, color: "#64748b" },

  acts: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  act: {
    height: 34,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: color.border,
    justifyContent: "center",
    maxWidth: "100%",
  },
  actText: { fontSize: font.caption, fontWeight: "600", color: "#475569" },

  typing: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 12 },
  dots: { flexDirection: "row", gap: 4 },
  tdot: { width: 7, height: 7, borderRadius: 4 },
  typingText: { fontSize: font.caption, color: color.mutedForeground },

  toast: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    marginHorizontal: space.lg,
    marginBottom: space.sm,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 10,
    backgroundColor: color.success + "14",
    borderWidth: 1,
    borderColor: color.success + "4d",
  },
  toastText: { flex: 1, fontSize: font.caption, color: "#15803d" },

  bar: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    backgroundColor: color.card,
    borderTopWidth: 1,
    borderTopColor: color.border,
    paddingHorizontal: 12,
    paddingTop: 10,
  },
  field: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.border,
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  input: { fontSize: font.body, color: color.foreground, paddingVertical: 11 },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: color.brand,
    alignItems: "center",
    justifyContent: "center",
  },
  sendOff: { backgroundColor: "#cbd5e1" },

  backdrop: { flex: 1, backgroundColor: "rgba(15,23,42,0.45)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: color.card,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    paddingHorizontal: space.xl,
    paddingTop: space.md,
  },
  grabber: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#cbd5e1",
    alignSelf: "center",
    marginBottom: 18,
  },
  sheetTitle: { fontSize: font.title, fontWeight: "700", color: color.foreground },
  sheetText: { fontSize: font.body, color: color.foreground, marginTop: 10, lineHeight: 22 },
  sheetNote: { fontSize: 12, color: color.mutedForeground, marginTop: 10, lineHeight: 19 },
  primary: {
    height: 52,
    borderRadius: radius.control,
    backgroundColor: color.brand,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
  },
  primaryText: { fontSize: font.body, fontWeight: "600", color: "#fff" },
  ghost: {
    height: 52,
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: color.border,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
  },
  ghostText: { fontSize: font.body, fontWeight: "600", color: "#475569" },
});
