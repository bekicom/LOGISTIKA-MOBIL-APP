/**
 * F2 — suhbat.
 *
 * Yangi xabar 8 soniyada bir marta so'raladi. WebSocket yo'q — web ham
 * shunday ishlaydi; push qo'shilganda bu interval kattalashtiriladi
 * (hozircha batareyaga sezilarli ta'sir qilmaydi, ekran ochiq turganda).
 */
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator, FlatList, KeyboardAvoidingView, Modal, Platform,
  Pressable, StyleSheet, Text, TextInput, View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Icon, type IconName } from "@/components/Icon";
import { ErrorBox, Skeleton } from "@/components/state";
import { apiUpload, FuramError } from "@/lib/api";
import { pickPhotos, takePhoto, toUpload } from "@/lib/photo";
import { useAuth } from "@/lib/auth-context";
import { useApi } from "@/lib/use-api";
import { color, font, radius, space } from "@/lib/theme";
import { t } from "@/lib/i18n";

type Msg = {
  id: string;
  type: string;
  text: string | null;
  hasAttachment: boolean;
  senderId: string | null;
  senderName: string;
  createdAt: string;
  /** Faqat ilova ichida — hali yuborilmagan xabar */
  pending?: boolean;
};

const POLL_MS = 8000;

function hhmm(iso: string) {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export default function Suhbat() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [text, setText] = useState("");
  const [pending, setPending] = useState<Msg[]>([]);
  const [sending, setSending] = useState(false);
  const [attach, setAttach] = useState(false);
  const [menu, setMenu] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const listRef = useRef<FlatList<Msg>>(null);

  const { data, loading, error, reload } = useApi<{ messages: Msg[]; me?: string }>(
    id ? `/api/chats/${id}` : null,
    [id],
  );

  // Yangi xabarlarni so'rab turish
  useEffect(() => {
    if (!id) return;
    const timer = setInterval(() => reload(), POLL_MS);
    return () => clearInterval(timer);
  }, [id, reload]);

  const send = useCallback(
    async (att?: { file?: { uri: string; name: string; type: string } }) => {
      const body = text.trim();
      if (!body && !att?.file) return;

      /* Xabar darhol ko'rinadi — «yuborilmoqda» belgisi bilan. Sekin
         internetda javob kutib turish ilovani muzlab qolgandek qiladi. */
      const temp: Msg = {
        id: `tmp-${Date.now()}`,
        type: "TEXT",
        text: body || null,
        hasAttachment: !!att?.file,
        senderId: "me",
        senderName: "",
        createdAt: new Date().toISOString(),
        pending: true,
      };
      setPending((p) => [...p, temp]);
      setText("");
      setSending(true);
      setErr(null);

      try {
        await apiUpload(
          `/api/chats/${id}`,
          { text: body },
          att?.file ? [toUpload(att.file, "file")] : [],
        );
        setPending((p) => p.filter((m) => m.id !== temp.id));
        reload();
      } catch (e) {
        setPending((p) => p.filter((m) => m.id !== temp.id));
        setText(body);
        setErr((e as FuramError).message ?? t("mob.chat.sendFailed"));
      } finally {
        setSending(false);
      }
    },
    [text, id, reload],
  );

  async function addPhoto(from: "camera" | "gallery") {
    setAttach(false);
    const got = from === "camera" ? await takePhoto() : await pickPhotos(1);
    if (got[0]) void send({ file: got[0] });
  }

  const messages = [...(data?.messages ?? []), ...pending];

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
          <Icon name="user" size={20} stroke={color.mutedForeground} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.title} numberOfLines={1}>{t("mob.chat.conversation")}</Text>
          <Text style={s.sub}>{messages.length} ta xabar</Text>
        </View>
        <Pressable onPress={() => setMenu(true)} hitSlop={10} style={s.back}>
          <Text style={s.dots}>⋯</Text>
        </Pressable>
      </View>

      {loading && messages.length === 0 ? (
        <View style={{ padding: space.lg }}><Skeleton rows={2} /></View>
      ) : null}
      {error && messages.length === 0 ? (
        <View style={{ padding: space.lg }}><ErrorBox message={error} onRetry={reload} /></View>
      ) : null}

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.id}
        contentContainerStyle={s.list}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
        renderItem={({ item }) => <Bubble msg={item} meId={user?.id ?? null} />}
      />

      {err ? (
        <View style={s.errBar}>
          <Icon name="alert" size={15} stroke={color.danger} />
          <Text style={s.errText}>{err}</Text>
        </View>
      ) : null}

      {/* Kiritish */}
      <View style={[s.inputBar, { paddingBottom: insets.bottom + 10 }]}>
        <Pressable style={s.plus} onPress={() => setAttach(true)}>
          <Icon name="plus" size={21} stroke="#475569" />
        </Pressable>
        <View style={s.field}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder={t("mob.ui.writeMessage")}
            placeholderTextColor="#94a3b8"
            style={s.input}
            multiline
          />
        </View>
        <Pressable
          style={[s.sendBtn, !text.trim() && s.sendOff]}
          onPress={() => send()}
          disabled={!text.trim() || sending}
        >
          {sending ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Icon name="arrow-right" size={20} stroke="#fff" />
          )}
        </Pressable>
      </View>

      {/* F3 — biriktirish */}
      <Modal visible={attach} animationType="slide" transparent onRequestClose={() => setAttach(false)}>
        <Pressable style={s.backdrop} onPress={() => setAttach(false)}>
          <View style={[s.sheet, { paddingBottom: insets.bottom + space.lg }]}>
            <View style={s.grabber} />
            <Text style={s.sheetTitle}>{t("mob.chat.whatSend")}</Text>
            <View style={s.grid}>
              <Att icon="doc" tint={color.brand} label={t("mob.chat.camera")} onPress={() => addPhoto("camera")} />
              <Att icon="package" tint={color.info} label={t("mob.chat.gallery")} onPress={() => addPhoto("gallery")} />
              <Att icon="doc" tint="#475569" label={t("mob.chat.document")} />
              <Att icon="route" tint={color.success} label={t("mob.chat.location")} />
            </View>
          </View>
        </Pressable>
      </Modal>

      {/* Menyu — shikoyat va bloklash App Store talabi */}
      <Modal visible={menu} animationType="slide" transparent onRequestClose={() => setMenu(false)}>
        <Pressable style={s.backdrop} onPress={() => setMenu(false)}>
          <View style={[s.sheet, { paddingBottom: insets.bottom + space.lg }]}>
            <View style={s.grabber} />
            <View style={{ paddingHorizontal: space.xl, paddingTop: space.md }}>
              <MenuRow icon="bell" label={t("mob.ui.mute")} />
              <MenuRow icon="alert" label={t("mob.chat.report")} danger />
              <MenuRow icon="close" label={t("mob.ui.blockUser")} danger last />
            </View>
          </View>
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
  );
}

/* ─────────────────────────────────────────────── bo'laklar */

function Bubble({ msg, meId }: { msg: Msg; meId: string | null }) {
  // Tizim xabari — o'rtada, kulrang
  if (msg.type === "SYSTEM" || msg.senderId === null) {
    return (
      <View style={s.system}>
        <Text style={s.systemText}>{msg.text}</Text>
        <Text style={s.systemTime}>{hhmm(msg.createdAt)}</Text>
      </View>
    );
  }

  const mine = msg.pending || (!!meId && msg.senderId === meId);

  return (
    <View style={[s.bubble, mine ? s.out : s.in, msg.pending && { opacity: 0.7 }]}>
      {!mine && msg.senderName ? <Text style={s.sender}>{msg.senderName}</Text> : null}

      {msg.hasAttachment ? (
        <View style={s.attach}>
          <Icon name="doc" size={16} stroke={mine ? "rgba(255,255,255,0.9)" : color.mutedForeground} />
          <Text style={[s.attachText, mine && { color: "rgba(255,255,255,0.9)" }]}>{t("mob.chat.file")}</Text>
        </View>
      ) : null}

      {msg.text ? <Text style={[s.text, mine && s.textOut]}>{msg.text}</Text> : null}

      <View style={s.metaRow}>
        {msg.pending ? (
          <>
            <Icon name="clock" size={11} stroke="rgba(255,255,255,0.75)" />
            <Text style={[s.time, s.timeOut]}>{t("mob.chat.sending")}</Text>
          </>
        ) : (
          <Text style={[s.time, mine && s.timeOut]}>{hhmm(msg.createdAt)}</Text>
        )}
      </View>
    </View>
  );
}

function Att({ icon, tint, label, onPress }: { icon: IconName; tint: string; label: string; onPress?: () => void }) {
  return (
    <Pressable style={s.att} onPress={onPress}>
      <View style={[s.attIcon, { backgroundColor: tint + "1f" }]}>
        <Icon name={icon} size={24} stroke={tint} />
      </View>
      <Text style={s.attLabel}>{label}</Text>
    </Pressable>
  );
}

function MenuRow({ icon, label, danger, last }: { icon: IconName; label: string; danger?: boolean; last?: boolean }) {
  return (
    <View style={[s.menuRow, !last && s.menuDivider]}>
      <Icon name={icon} size={18} stroke={danger ? color.danger : "#475569"} />
      <Text style={[s.menuLabel, danger && { color: color.danger }]}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.background },
  header: {
    backgroundColor: color.card, flexDirection: "row", alignItems: "center",
    paddingHorizontal: 8, paddingVertical: 6, gap: 8,
    borderBottomWidth: 1, borderBottomColor: color.border,
  },
  back: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  dots: { fontSize: 22, color: color.foreground, marginTop: -6 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: color.muted, alignItems: "center", justifyContent: "center" },
  title: { fontSize: font.body, fontWeight: "600", color: color.foreground },
  sub: { fontSize: 12, color: color.mutedForeground },

  list: { padding: space.lg, gap: 10 },

  bubble: { maxWidth: "80%", padding: 11, borderRadius: 14 },
  in: { alignSelf: "flex-start", backgroundColor: color.card, borderWidth: 1, borderColor: color.border, borderBottomLeftRadius: 4 },
  out: { alignSelf: "flex-end", backgroundColor: color.brand, borderBottomRightRadius: 4 },
  sender: { fontSize: 11, fontWeight: "700", color: color.brand, marginBottom: 3 },
  text: { fontSize: 14, lineHeight: 20, color: color.foreground },
  textOut: { color: "#fff" },
  attach: { flexDirection: "row", alignItems: "center", gap: 7, marginBottom: 6 },
  attachText: { fontSize: 13, fontWeight: "500", color: color.mutedForeground },
  metaRow: { flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 4, marginTop: 4 },
  time: { fontSize: 10, color: "#94a3b8" },
  timeOut: { color: "rgba(255,255,255,0.75)" },

  system: { alignSelf: "center", backgroundColor: color.muted, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 13, maxWidth: "90%" },
  systemText: { fontSize: 12, color: "#475569", textAlign: "center" },
  systemTime: { fontSize: 10, color: "#94a3b8", textAlign: "center", marginTop: 2 },

  errBar: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: space.lg, paddingVertical: 8, backgroundColor: "#dc26260f" },
  errText: { fontSize: 12, color: color.danger, flex: 1 },

  inputBar: {
    backgroundColor: color.card, borderTopWidth: 1, borderTopColor: color.border,
    flexDirection: "row", alignItems: "flex-end", gap: 9, paddingHorizontal: 12, paddingTop: 10,
  },
  plus: { width: 42, height: 42, borderRadius: 21, backgroundColor: color.muted, alignItems: "center", justifyContent: "center" },
  field: { flex: 1, minHeight: 42, maxHeight: 120, borderWidth: 1, borderColor: color.border, borderRadius: 21, justifyContent: "center", paddingHorizontal: 16 },
  input: { fontSize: font.body, color: color.foreground, paddingVertical: 10 },
  sendBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: color.brand, alignItems: "center", justifyContent: "center" },
  sendOff: { backgroundColor: color.border },

  backdrop: { flex: 1, backgroundColor: "rgba(15,23,42,0.45)", justifyContent: "flex-end" },
  sheet: { backgroundColor: color.card, borderTopLeftRadius: radius.sheet, borderTopRightRadius: radius.sheet, paddingTop: 10 },
  grabber: { width: 38, height: 4, borderRadius: 2, backgroundColor: "#cbd5e1", alignSelf: "center" },
  sheetTitle: { fontSize: 18, fontWeight: "700", color: color.foreground, paddingHorizontal: space.xl, paddingTop: 14 },
  grid: { flexDirection: "row", gap: 16, paddingHorizontal: space.xl, paddingTop: 22 },
  att: { flex: 1, alignItems: "center", gap: 9 },
  attIcon: { width: 60, height: 60, borderRadius: 30, alignItems: "center", justifyContent: "center" },
  attLabel: { fontSize: 12, fontWeight: "500", color: color.foreground, textAlign: "center" },

  menuRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14 },
  menuDivider: { borderBottomWidth: 1, borderBottomColor: color.border },
  menuLabel: { fontSize: 14, color: color.foreground },
});
