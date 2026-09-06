/**
 * FURAM yordam — foydalanuvchi bilan jamoa suhbati.
 *
 * Alohida ekran, umumiy suhbat emas (web `support-thread.tsx` dagi
 * uch sabab): admin ismi ko'rinmaydi, yozish `POST /api/support`
 * orqali (cheklov va «javob kutmoqda» belgisi shu yerda), birinchi
 * xabargacha suhbat yo'q. Tarif to'sig'i yo'q — hammaga bepul.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Text } from "@/components/Text";
import { Icon } from "@/components/Icon";
import { api, FuramError } from "@/lib/api";
import { color, font, shadow, space } from "@/lib/theme";
import { t } from "@/lib/i18n";

type Msg = { id: string; from: string; text: string | null; shown: string | null; createdAt: string; senderName: string; pending?: boolean };
type Thread = { chatId: string | null; messages: Msg[]; closed: boolean; waiting: boolean };

function hhmm(iso: string) {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export default function Yordam() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [thread, setThread] = useState<Thread>({ chatId: null, messages: [], closed: false, waiting: false });
  const [loaded, setLoaded] = useState(false);
  const [pending, setPending] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const list = useRef<FlatList<Msg>>(null);

  const load = useCallback(async () => {
    try {
      setThread(await api<Thread>("/api/support"));
    } catch {
      /* keyingi so'rovda */
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    void load();
    const timer = setInterval(() => void load(), 10_000);
    return () => clearInterval(timer);
  }, [load]);

  async function send() {
    const clean = text.trim();
    if (!clean || busy) return;
    const temp: Msg = { id: `p${Date.now()}`, from: "user", text: clean, shown: clean, createdAt: new Date().toISOString(), senderName: "", pending: true };
    setPending((p) => [...p, temp]);
    setText("");
    setBusy(true);
    setErr(null);
    try {
      await api("/api/support", { method: "POST", body: { text: clean } });
      await load();
    } catch (e) {
      setErr((e as FuramError).message ?? t("mob.err.network"));
      setText(clean);
    } finally {
      setPending((p) => p.filter((x) => x.id !== temp.id));
      setBusy(false);
    }
  }

  const rows = [...thread.messages, ...pending];

  return (
    <KeyboardAvoidingView style={[s.root, { paddingTop: insets.top }]} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={insets.top}>
      <View style={s.header}>
        <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace("/chat"))} hitSlop={10} style={s.hBtn}>
          <Icon name="back" size={22} stroke={color.foreground} />
        </Pressable>
        <View style={s.logo}>
          <Icon name="headset" size={20} stroke="#fff" />
          <View style={s.online} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>{t("mob.support.team")}</Text>
          <Text style={[s.sub, thread.waiting && { color: color.warning }]}>
            {thread.closed ? t("mob.support.closed") : thread.waiting ? t("mob.support.waiting") : t("mob.support.hint")}
          </Text>
        </View>
      </View>

      <FlatList
        ref={list}
        data={rows}
        keyExtractor={(m) => m.id}
        contentContainerStyle={s.list}
        onContentSizeChange={() => list.current?.scrollToEnd({ animated: false })}
        ListEmptyComponent={
          loaded ? (
            <View style={s.lead}>
              <View style={s.leadIcon}>
                <Icon name="headset" size={28} stroke={color.brand} />
              </View>
              <Text style={s.leadText}>{t("mob.support.lead")}</Text>
            </View>
          ) : (
            <ActivityIndicator color={color.brand} style={{ marginTop: 30 }} />
          )
        }
        renderItem={({ item }) => {
          const mine = item.from === "user";
          return (
            <View style={[s.bubble, mine ? s.out : s.in, item.pending && { opacity: 0.6 }]}>
              {!mine ? <Text style={s.sender}>{t("mob.support.team")}</Text> : null}
              <Text style={[s.text, mine && { color: "#fff" }]}>{item.shown ?? item.text}</Text>
              <Text style={[s.time, mine && { color: "#ffffffcc" }]}>{item.pending ? t("mob.chat.sending") : hhmm(item.createdAt)}</Text>
            </View>
          );
        }}
      />

      {err ? (
        <View style={s.errBar}>
          <Icon name="alert" size={15} stroke={color.danger} />
          <Text style={s.errText}>{err}</Text>
        </View>
      ) : null}

      <View style={[s.composer, { paddingBottom: insets.bottom + 8 }]}>
        <View style={s.field}>
          <TextInput value={text} onChangeText={setText} placeholder={t("mob.support.placeholder")} placeholderTextColor="#94a3b8" style={s.input} multiline maxLength={2000} />
        </View>
        <Pressable style={[s.sendBtn, !text.trim() && { backgroundColor: color.border }]} onPress={send} disabled={!text.trim() || busy}>
          {busy ? <ActivityIndicator color="#fff" size="small" /> : <Icon name="send" size={19} stroke="#fff" />}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.background },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 8, paddingVertical: 6, gap: 8 },
  hBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  logo: { width: 42, height: 42, borderRadius: 14, backgroundColor: color.brand, alignItems: "center", justifyContent: "center" },
  online: { position: "absolute", right: -2, bottom: -2, width: 12, height: 12, borderRadius: 6, backgroundColor: color.success, borderWidth: 2, borderColor: color.background },
  title: { fontSize: font.body, fontWeight: "800", color: color.foreground },
  sub: { fontSize: 12, color: color.mutedForeground, marginTop: 1 },
  list: { padding: space.lg, gap: 8, flexGrow: 1 },
  lead: { alignItems: "center", paddingVertical: 40, gap: 12 },
  leadIcon: { width: 64, height: 64, borderRadius: 22, backgroundColor: color.brandSoft, alignItems: "center", justifyContent: "center" },
  leadText: { fontSize: 14, color: color.mutedForeground, textAlign: "center", lineHeight: 20, paddingHorizontal: 24 },
  bubble: { maxWidth: "82%", padding: 11, borderRadius: 18 },
  in: { alignSelf: "flex-start", backgroundColor: color.card, borderBottomLeftRadius: 5, ...shadow.card },
  out: { alignSelf: "flex-end", backgroundColor: color.brand, borderBottomRightRadius: 5 },
  sender: { fontSize: 11, fontWeight: "700", color: color.brand, marginBottom: 3 },
  text: { fontSize: 14.5, lineHeight: 21, color: color.foreground },
  time: { fontSize: 10.5, color: "#94a3b8", textAlign: "right", marginTop: 4 },
  errBar: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: space.lg, paddingVertical: 8, backgroundColor: color.dangerSoft },
  errText: { fontSize: 12, color: color.danger, flex: 1 },
  composer: { backgroundColor: color.card, flexDirection: "row", alignItems: "flex-end", gap: 8, paddingHorizontal: 12, paddingTop: 8, ...shadow.bar },
  field: { flex: 1, minHeight: 42, maxHeight: 140, borderRadius: 21, backgroundColor: color.background, paddingHorizontal: 14, justifyContent: "center" },
  input: { fontSize: font.body, color: color.foreground, paddingVertical: 10, fontFamily: "Manrope_500Medium" },
  sendBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: color.brand, alignItems: "center", justifyContent: "center" },
});
