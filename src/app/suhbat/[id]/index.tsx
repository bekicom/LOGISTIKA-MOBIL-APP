/**
 * F2 — suhbat (A-qadam, 2026-09-06: web bilan to'liq moslik).
 *
 * Endi `/api/chat/[id]/messages` — web bilan bitta marshrut. Shu
 * bilan: tarjima (kelgan xabar o'quvchi tiliga), javob, pin,
 * tasdiq, ovozli xabar (yozish va tinglash), fayl/rasm/hujjat,
 * joylashuv, kontakt, ulashilgan e'lon, «ko'rdi» sanog'i, qidiruv.
 *
 * Yozishdan oldin ikkita AI yordami: matnni yaxshilash va boshqa
 * tilga o'girish — ikkalasi TAKLIF sifatida ko'rinadi, odam qaror
 * qiladi (webdagi qoida).
 *
 * Yangi xabar 6 soniyada bir so'raladi (`after=`), WebSocket yo'q —
 * web ham shunday.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import * as Location from "expo-location";
import { setAudioModeAsync } from "expo-audio";
import { Text } from "@/components/Text";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Icon, type IconName } from "@/components/Icon";
import { Sheet } from "@/components/Sheet";
import { Button } from "@/components/ui";
import { ErrorBox, Skeleton } from "@/components/state";
import { VoiceBubble } from "@/components/VoiceBubble";
import { MicButton, type VoiceFile } from "@/components/Recorder";
import { api, apiUpload, FuramError } from "@/lib/api";
import { pickDocument, pickPhotos, takePhoto, toUpload } from "@/lib/photo";
import { openRemoteFile } from "@/lib/files";
import { extOf, messageFile, messageFilePath, type ChatMsg } from "@/lib/chat";
import { useAuth } from "@/lib/auth-context";
import { tariffBlocked } from "@/lib/features";
import { color, font, radius, shadow, space } from "@/lib/theme";
import { P_SOON, sendOrQueue } from "@/lib/outbox";
import { composerPad, useKeyboardOpen } from "@/lib/keyboard";
import { LOCALES, LOCALE_INFO, t } from "@/lib/i18n";

const POLL_MS = 6000;

function hhmm(iso: string) {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

type Feed = { messages: ChatMsg[]; pinned: ChatMsg[]; readOnly: boolean; title: string | null };

export default function Suhbat() {
  const params = useLocalSearchParams<{ id: string; title?: string; pinned?: string; muted?: string }>();
  const id = String(params.id);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const meId = user?.id ?? null;

  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [pinnedList, setPinnedList] = useState<ChatMsg[]>([]);
  const [pending, setPending] = useState<ChatMsg[]>([]);
  const [readOnly, setReadOnly] = useState(false);
  const [title, setTitle] = useState<string | null>(params.title ?? null);
  const [loaded, setLoaded] = useState(false);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const lastTs = useRef<string | null>(null);

  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<ChatMsg | null>(null);
  const [improved, setImproved] = useState<{ kind: "style" | "translate"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [attach, setAttach] = useState(false);
  const [menu, setMenu] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [msgMenu, setMsgMenu] = useState<ChatMsg | null>(null);
  const [searchOn, setSearchOn] = useState(false);
  const [query, setQuery] = useState("");
  const [viewer, setViewer] = useState<ChatMsg | null>(null);
  const [orig, setOrig] = useState<Set<string>>(new Set());
  const [transcribing, setTranscribing] = useState<string | null>(null);
  const [chatPinned, setChatPinned] = useState(params.pinned === "1");
  const [chatMuted, setChatMuted] = useState(params.muted === "1");

  const listRef = useRef<FlatList<ChatMsg>>(null);
  const kbOpen = useKeyboardOpen();

  /* ── yuklash ─────────────────────────────────────────────── */
  const load = useCallback(
    async (initial: boolean) => {
      try {
        const q = !initial && lastTs.current ? `?after=${encodeURIComponent(lastTs.current)}` : "";
        const d = await api<Feed>(`/api/chat/${id}/messages${q}`);
        setReadOnly(!!d.readOnly);
        if (d.title) setTitle(d.title);
        if (initial || !lastTs.current) setPinnedList(d.pinned ?? []);
        const incoming = d.messages ?? [];
        if (incoming.length) {
          lastTs.current = incoming[incoming.length - 1].createdAt;
          setMessages((prev) => {
            if (initial || !q) return incoming;
            const seen = new Set(prev.map((m) => m.id));
            return [...prev, ...incoming.filter((m) => !seen.has(m.id))];
          });
        } else if (initial) {
          setMessages([]);
        }
        setLoadErr(null);
      } catch (e) {
        if (initial) setLoadErr((e as FuramError).message ?? t("mob.err.network"));
      } finally {
        if (initial) setLoaded(true);
      }
    },
    [id],
  );

  /* Kelgan xabarlar tarjimasi — fonda; tayyor bo'lsa ro'yxat
     qaytadan olinadi */
  const askTranslations = useCallback(async () => {
    try {
      const r = await api<{ done?: number }>(`/api/chat/${id}/translate`, {
        method: "POST",
        body: { mode: "incoming" },
      });
      if ((r.done ?? 0) > 0) {
        lastTs.current = null;
        await load(true);
      }
    } catch {
      /* AI yo'q yoki chegara — asl matn qoladi */
    }
  }, [id, load]);

  useEffect(() => {
    void setAudioModeAsync({ playsInSilentMode: true });
    void (async () => {
      await load(true);
      await askTranslations();
    })();
    const timer = setInterval(() => void load(false), POLL_MS);
    return () => clearInterval(timer);
  }, [load, askTranslations]);

  const full = useCallback(async () => {
    lastTs.current = null;
    await load(true);
  }, [load]);

  /* ── yuborish ────────────────────────────────────────────── */
  const sendText = useCallback(async () => {
    const body = text.trim();
    if (!body || busy) return;
    const temp: ChatMsg = {
      id: `tmp-${Date.now()}`, type: "TEXT", kind: null, refId: null, text: body, shown: body,
      translated: false, lang: null, hasAttachment: false, mimeType: null, durationSec: null,
      lat: null, lng: null, placeName: null, contact: null,
      replyTo: replyTo ? { id: replyTo.id, name: replyTo.senderName, text: replyTo.shown ?? replyTo.text ?? "" } : null,
      pinned: false, senderId: meId, senderName: "", createdAt: new Date().toISOString(),
      confirms: [], seenBy: 0, seenTotal: 0, pending: true,
    };
    setPending((p) => [...p, temp]);
    setText("");
    setImproved(null);
    const reply = replyTo;
    setReplyTo(null);
    setBusy(true);
    setErr(null);
    try {
      await sendOrQueue({
        kind: "message",
        path: `/api/chat/${id}/messages`,
        body: { text: body, ...(reply ? { replyToId: reply.id } : {}), clientKey: temp.id },
        files: [],
        priority: P_SOON,
      });
      setPending((p) => p.filter((m) => m.id !== temp.id));
      await load(false);
    } catch (e) {
      setPending((p) => p.filter((m) => m.id !== temp.id));
      setText(body);
      setErr((e as FuramError).message ?? t("mob.chat.sendFailed"));
    } finally {
      setBusy(false);
    }
  }, [text, busy, replyTo, meId, id, load]);

  async function sendFile(file: { uri: string; name: string; type: string }, extra: Record<string, string | number> = {}) {
    setBusy(true);
    setErr(null);
    try {
      await apiUpload(`/api/chat/${id}/messages`, { ...(replyTo ? { replyToId: replyTo.id } : {}), ...extra }, [
        toUpload(file, "file"),
      ]);
      setReplyTo(null);
      await load(false);
    } catch (e) {
      setErr((e as FuramError).message ?? t("mob.chat.sendFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function addAttachment(kind: "camera" | "gallery" | "doc") {
    setAttach(false);
    const got =
      kind === "camera" ? (await takePhoto())[0] : kind === "gallery" ? (await pickPhotos(1))[0] : await pickDocument();
    if (got) await sendFile(got);
  }

  async function sendLocation() {
    setAttach(false);
    const perm = await Location.requestForegroundPermissionsAsync();
    if (!perm.granted) {
      setErr(t("mob.msg.locDenied"));
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      await apiUpload(`/api/chat/${id}/messages`, { lat: pos.coords.latitude, lng: pos.coords.longitude });
      await load(false);
    } catch (e) {
      setErr((e as FuramError).message ?? t("mob.chat.sendFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function sendVoice(v: VoiceFile) {
    await sendFile({ uri: v.uri, name: v.name, type: v.type }, { durationSec: v.sec });
  }

  /* ── AI: yaxshilash va tarjima ───────────────────────────── */
  async function improve() {
    const src = text.trim();
    if (src.length < 3 || aiBusy) return;
    if (tariffBlocked("ai")) return;
    setAiBusy(true);
    setErr(null);
    try {
      const r = await api<{ text: string }>(`/api/chat/${id}/improve`, { method: "POST", body: { text: src } });
      setImproved({ kind: "style", text: r.text });
    } catch (e) {
      setErr((e as FuramError).message ?? t("mob.msg.actionFailed"));
    } finally {
      setAiBusy(false);
    }
  }

  async function translateTo(to: string) {
    const src = text.trim();
    setLangOpen(false);
    if (src.length < 2 || aiBusy) return;
    if (tariffBlocked("ai")) return;
    setAiBusy(true);
    setErr(null);
    try {
      const r = await api<{ text: string }>(`/api/chat/${id}/translate`, {
        method: "POST",
        body: { mode: "outgoing", text: src, to },
      });
      setImproved({ kind: "translate", text: r.text });
    } catch (e) {
      setErr((e as FuramError).message ?? t("mob.msg.actionFailed"));
    } finally {
      setAiBusy(false);
    }
  }

  /* ── xabar amallari ──────────────────────────────────────── */
  async function act(m: ChatMsg, body: object) {
    setMsgMenu(null);
    setErr(null);
    try {
      await api(`/api/chat/${id}/messages/${m.id}`, { method: "PATCH", body });
      await full();
    } catch (e) {
      setErr((e as FuramError).message ?? t("mob.msg.actionFailed"));
    }
  }

  function remove(m: ChatMsg) {
    setMsgMenu(null);
    Alert.alert(t("mob.msg.delete"), t("mob.msg.deleteAsk"), [
      { text: t("mob.common.cancel"), style: "cancel" },
      {
        text: t("mob.msg.delete"),
        style: "destructive",
        onPress: async () => {
          try {
            await api(`/api/chat/${id}/messages/${m.id}`, { method: "DELETE" });
            setMessages((p) => p.filter((x) => x.id !== m.id));
          } catch (e) {
            setErr((e as FuramError).message ?? t("mob.msg.actionFailed"));
          }
        },
      },
    ]);
  }

  async function transcribe(m: ChatMsg) {
    if (tariffBlocked("ai")) return;
    setTranscribing(m.id);
    setErr(null);
    try {
      await api(`/api/chat/${id}/voice`, { method: "POST", body: { messageId: m.id } });
      await full();
    } catch (e) {
      setErr((e as FuramError).message ?? t("mob.msg.actionFailed"));
    } finally {
      setTranscribing(null);
    }
  }

  async function openAttachment(m: ChatMsg) {
    try {
      await openRemoteFile(messageFilePath(id, m.id), `furam-${m.id}.${extOf(m.mimeType)}`);
    } catch (e) {
      setErr((e as FuramError).message ?? t("mob.err.network"));
    }
  }

  async function setFlag(patch: { isPinned?: boolean; isMuted?: boolean }) {
    setMenu(false);
    try {
      await api(`/api/chats/${id}/flags`, { method: "PATCH", body: patch });
      if (patch.isPinned !== undefined) setChatPinned(patch.isPinned);
      if (patch.isMuted !== undefined) setChatMuted(patch.isMuted);
    } catch (e) {
      setErr((e as FuramError).message ?? t("mob.msg.actionFailed"));
    }
  }

  async function askLocation() {
    setAttach(false);
    try {
      await api(`/api/chat/${id}/actions`, { method: "POST", body: { action: "ask_location" } });
      await load(false);
    } catch (e) {
      setErr((e as FuramError).message ?? t("mob.msg.actionFailed"));
    }
  }

  function toggleOrig(mid: string) {
    setOrig((s) => {
      const n = new Set(s);
      if (n.has(mid)) n.delete(mid);
      else n.add(mid);
      return n;
    });
  }

  /* ── ro'yxat ─────────────────────────────────────────────── */
  const all = useMemo(() => [...messages, ...pending], [messages, pending]);
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return all;
    return all.filter((m) =>
      [m.shown, m.text, m.senderName, m.placeName, m.contact?.name].filter(Boolean).some((v) => v!.toLowerCase().includes(q)),
    );
  }, [all, query]);

  const initials = (title ?? "?").slice(0, 2).toUpperCase();

  return (
    <KeyboardAvoidingView
      style={[s.root, { paddingTop: insets.top }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      /* `keyboardVerticalOffset` YO'Q: bu View ekranning eng
         tepasidan boshlanadi (`paddingTop` uni ichidan suradi,
         ramkasini emas). Offset berilsa klaviatura balandligiga
         o'sha son QO'SHILIB, qator bilan klaviatura orasida bo'sh
         chiziq qolardi (2026-09-06). */
    >
      {/* Sarlavha */}
      <View style={s.header}>
        <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace("/chat"))} hitSlop={10} style={s.hBtn}>
          <Icon name="back" size={22} stroke={color.foreground} />
        </Pressable>
        <View style={s.avatar}>
          <Text style={s.avatarText}>{initials}</Text>
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={s.title} numberOfLines={1}>{title ?? t("mob.chat.conversation")}</Text>
          <Text style={[s.sub, readOnly && { color: color.warning }]} numberOfLines={1}>
            {readOnly ? t("mob.msg.readOnly") : chatMuted ? t("mob.msg.menu.mute") : t("mob.chat.msgCount", { n: all.length })}
          </Text>
        </View>
        <Pressable onPress={() => { setSearchOn((v) => !v); setQuery(""); }} hitSlop={10} style={s.hBtn}>
          <Icon name="search" size={21} stroke={searchOn ? color.brand : color.foreground} />
        </Pressable>
        <Pressable onPress={() => setMenu(true)} hitSlop={10} style={s.hBtn}>
          <Icon name="more" size={22} stroke={color.foreground} />
        </Pressable>
      </View>

      {searchOn ? (
        <View style={s.searchBar}>
          <Icon name="search" size={17} stroke={color.mutedForeground} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={t("mob.msg.search")}
            placeholderTextColor="#94a3b8"
            style={s.searchInput}
            autoFocus
          />
          {query ? (
            <Pressable onPress={() => setQuery("")} hitSlop={8}>
              <Icon name="close" size={16} stroke={color.mutedForeground} />
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {/* Qadalgan xabarlar */}
      {pinnedList.length > 0 && !query ? (
        <View style={s.pinned}>
          {pinnedList.slice(0, 2).map((p) => (
            <View key={p.id} style={s.pinRow}>
              <Icon name="pin" size={15} stroke={color.brand} />
              <Text style={s.pinText} numberOfLines={1}>{p.shown ?? p.text}</Text>
              {!readOnly ? (
                <Pressable onPress={() => act(p, { action: "pin", on: false })} hitSlop={8}>
                  <Icon name="close" size={14} stroke={color.mutedForeground} />
                </Pressable>
              ) : null}
            </View>
          ))}
        </View>
      ) : null}

      {!loaded ? (
        <View style={{ padding: space.lg }}><Skeleton rows={2} /></View>
      ) : loadErr && all.length === 0 ? (
        <View style={{ padding: space.lg }}><ErrorBox message={loadErr} onRetry={full} /></View>
      ) : null}

      <FlatList
        ref={listRef}
        data={shown}
        keyExtractor={(m) => m.id}
        contentContainerStyle={s.list}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => !query && listRef.current?.scrollToEnd({ animated: false })}
        ListEmptyComponent={
          loaded && !loadErr ? (
            <Text style={s.empty}>{query ? t("mob.msg.notFound") : t("mob.msg.noMessages")}</Text>
          ) : null
        }
        renderItem={({ item }) => (
          <Bubble
            msg={item}
            chatId={id}
            meId={meId}
            readOnly={readOnly}
            showOrig={orig.has(item.id)}
            transcribing={transcribing === item.id}
            onLongPress={() => !item.pending && setMsgMenu(item)}
            onToggleOrig={() => toggleOrig(item.id)}
            onConfirm={() => act(item, { action: "confirm" })}
            onTranscribe={() => transcribe(item)}
            onOpenFile={() => openAttachment(item)}
            onOpenImage={() => setViewer(item)}
          />
        )}
      />

      {err ? (
        <Pressable style={s.errBar} onPress={() => setErr(null)}>
          <Icon name="alert" size={15} stroke={color.danger} />
          <Text style={s.errText}>{err}</Text>
        </Pressable>
      ) : null}

      {/* Yozish */}
      {readOnly ? (
        <View style={[s.readOnly, { paddingBottom: composerPad(insets.bottom, kbOpen, 12) }]}>
          <Icon name="lock" size={16} stroke={color.mutedForeground} />
          <Text style={s.readOnlyText}>{t("mob.msg.readOnly")}</Text>
        </View>
      ) : (
        <View style={[s.composer, { paddingBottom: composerPad(insets.bottom, kbOpen) }]}>
          {replyTo ? (
            <View style={s.replyBar}>
              <Icon name="reply" size={15} stroke={color.brand} />
              <Text style={s.replyText} numberOfLines={1}>
                <Text style={{ fontWeight: "700" }}>{replyTo.senderName}: </Text>
                {replyTo.shown ?? replyTo.text ?? t("mob.chat.file")}
              </Text>
              <Pressable onPress={() => setReplyTo(null)} hitSlop={8}>
                <Icon name="close" size={16} stroke={color.mutedForeground} />
              </Pressable>
            </View>
          ) : null}

          {improved ? (
            <View style={s.aiCard}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Icon name={improved.kind === "translate" ? "globe" : "sparkle"} size={15} stroke={color.brand} />
                <Text style={s.aiTitle}>{t(improved.kind === "translate" ? "mob.msg.aiTranslate" : "mob.msg.aiSuggest")}</Text>
              </View>
              <Text style={s.aiText}>{improved.text}</Text>
              <View style={{ flexDirection: "row", gap: 14, marginTop: 8 }}>
                <Pressable onPress={() => { setText(improved.text); setImproved(null); }} style={s.aiApply}>
                  <Text style={s.aiApplyText}>{t("mob.msg.apply")}</Text>
                </Pressable>
                <Pressable onPress={() => setImproved(null)} hitSlop={8} style={{ justifyContent: "center" }}>
                  <Text style={s.aiDismiss}>{t("mob.msg.dismiss")}</Text>
                </Pressable>
              </View>
            </View>
          ) : null}

          <View style={s.inputRow}>
            <Pressable style={s.roundBtn} onPress={() => setAttach(true)} accessibilityLabel={t("mob.chat.whatSend")}>
              <Icon name="paperclip" size={20} stroke="#475569" />
            </Pressable>
            <View style={s.field}>
              <TextInput
                value={text}
                onChangeText={setText}
                placeholder={t("mob.ui.writeMessage")}
                placeholderTextColor="#94a3b8"
                style={s.input}
                multiline
                maxLength={4000}
              />
              {text.trim().length >= 2 ? (
                <View style={s.aiRow}>
                  <Pressable onPress={improve} disabled={aiBusy} hitSlop={6} style={s.aiBtn} accessibilityLabel={t("mob.msg.improve")}>
                    {aiBusy ? <ActivityIndicator size="small" color={color.brand} /> : <Icon name="sparkle" size={17} stroke={color.brand} />}
                  </Pressable>
                  <Pressable onPress={() => setLangOpen(true)} disabled={aiBusy} hitSlop={6} style={s.aiBtn} accessibilityLabel={t("mob.msg.translateTo")}>
                    <Icon name="globe" size={17} stroke={color.blue} />
                  </Pressable>
                </View>
              ) : null}
            </View>
            {text.trim() ? (
              <Pressable style={s.sendBtn} onPress={sendText} disabled={busy} accessibilityLabel={t("mob.tripDocs.send")}>
                {busy ? <ActivityIndicator color="#fff" size="small" /> : <Icon name="send" size={19} stroke="#fff" />}
              </Pressable>
            ) : (
              <MicButton onDone={sendVoice} onError={setErr} disabled={busy} />
            )}
          </View>
        </View>
      )}

      {/* Biriktirish + amallar */}
      <Sheet open={attach} onClose={() => setAttach(false)} title={t("mob.chat.whatSend")}>
        <View style={s.grid}>
          <Att icon="image" tint={color.brand} bg={color.brandSoft} label={t("mob.chat.camera")} onPress={() => addAttachment("camera")} />
          <Att icon="image" tint={color.blue} bg={color.blueSoft} label={t("mob.chat.gallery")} onPress={() => addAttachment("gallery")} />
          <Att icon="file" tint={color.purple} bg={color.purpleSoft} label={t("mob.chat.document")} onPress={() => addAttachment("doc")} />
          <Att icon="map-pin" tint={color.success} bg={color.successSoft} label={t("mob.chat.location")} onPress={sendLocation} />
        </View>
        <Text style={s.sheetGroup}>{t("mob.chatAct.title")}</Text>
        <View style={s.grid}>
          <Att icon="handshake" tint={color.brand} bg={color.brandSoft} label={t("mob.chatAct.agreement")} onPress={() => { setAttach(false); router.push({ pathname: "/suhbat/[id]/amal", params: { id, kind: "agreement" } }); }} />
          <Att icon="wallet" tint={color.success} bg={color.successSoft} label={t("mob.chatAct.pay")} onPress={() => { setAttach(false); router.push({ pathname: "/suhbat/[id]/amal", params: { id, kind: "pay" } }); }} />
          <Att icon="check" tint={color.warning} bg={color.warningSoft} label={t("mob.chatAct.confirm")} onPress={() => { setAttach(false); router.push({ pathname: "/suhbat/[id]/amal", params: { id, kind: "confirm" } }); }} />
          <Att icon="map-pin" tint={color.blue} bg={color.blueSoft} label={t("mob.chatAct.askLocation")} onPress={askLocation} />
          <Att icon="alert" tint={color.danger} bg={color.dangerSoft} label={t("mob.chatAct.incident")} onPress={() => { setAttach(false); router.push({ pathname: "/suhbat/[id]/amal", params: { id, kind: "incident" } }); }} />
        </View>
      </Sheet>

      {/* Menyu */}
      <Sheet open={menu} onClose={() => setMenu(false)}>
        <MenuRow icon="pin" label={t(chatPinned ? "mob.msg.menu.unpinChat" : "mob.msg.menu.pinChat")} onPress={() => setFlag({ isPinned: !chatPinned })} />
        <MenuRow icon="bell" label={t(chatMuted ? "mob.msg.menu.unmute" : "mob.msg.menu.mute")} onPress={() => setFlag({ isMuted: !chatMuted })} />
        <MenuRow icon="doc" label={t("mob.msg.menu.docs")} onPress={() => { setMenu(false); router.push({ pathname: "/suhbat/[id]/hujjatlar", params: { id } }); }} />
        <MenuRow icon="alert" label={t("mob.msg.menu.incidents")} onPress={() => { setMenu(false); router.push({ pathname: "/suhbat/[id]/hodisalar", params: { id } }); }} />
        <MenuRow icon="globe" label={t("mob.msg.menu.lang")} onPress={() => { setMenu(false); router.push("/profil/messenger"); }} />
        <MenuRow icon="alert" label={t("mob.chat.report")} danger last onPress={() => { setMenu(false); router.push("/yordam"); }} />
      </Sheet>

      {/* Tilga o'girish */}
      <Sheet open={langOpen} onClose={() => setLangOpen(false)} title={t("mob.msg.translateTo")}>
        <View style={s.langGrid}>
          {LOCALES.map((code) => (
            <Pressable key={code} onPress={() => translateTo(code)} style={s.langItem}>
              <Text style={{ fontSize: 18 }}>{LOCALE_INFO[code].flag}</Text>
              <Text style={s.langText}>{LOCALE_INFO[code].native}</Text>
            </Pressable>
          ))}
        </View>
      </Sheet>

      {/* Xabar menyusi */}
      <Sheet open={!!msgMenu} onClose={() => setMsgMenu(null)}>
        {msgMenu ? (
          <>
            <Text style={s.msgPreview} numberOfLines={2}>{msgMenu.shown ?? msgMenu.text ?? t("mob.chat.file")}</Text>
            {!readOnly ? <MenuRow icon="reply" label={t("mob.msg.reply")} onPress={() => { setReplyTo(msgMenu); setMsgMenu(null); }} /> : null}
            {!readOnly ? <MenuRow icon="pin" label={t(msgMenu.pinned ? "mob.msg.unpin" : "mob.msg.pin")} onPress={() => act(msgMenu, { action: "pin", on: !msgMenu.pinned })} /> : null}
            {msgMenu.text || msgMenu.shown ? (
              <MenuRow icon="copy" label={t("mob.msg.copy")} onPress={async () => { await Clipboard.setStringAsync(msgMenu.shown ?? msgMenu.text ?? ""); setMsgMenu(null); }} />
            ) : null}
            {msgMenu.senderId === meId && !readOnly ? <MenuRow icon="trash" label={t("mob.msg.delete")} danger last onPress={() => remove(msgMenu)} /> : null}
          </>
        ) : null}
      </Sheet>

      {/* Rasm ko'rish */}
      <Modal visible={!!viewer} transparent animationType="fade" onRequestClose={() => setViewer(null)}>
        <Pressable style={s.viewer} onPress={() => setViewer(null)}>
          {viewer ? <Image source={messageFile(id, viewer.id)} style={s.viewerImg} resizeMode="contain" /> : null}
          <View style={[s.viewerClose, { top: insets.top + 8 }]}>
            <Icon name="close" size={22} stroke="#ffffff" />
          </View>
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
  );
}

/* ─────────────────────────────────────────────── pufakcha */

function Bubble({
  msg, chatId, meId, readOnly, showOrig, transcribing,
  onLongPress, onToggleOrig, onConfirm, onTranscribe, onOpenFile, onOpenImage,
}: {
  msg: ChatMsg; chatId: string; meId: string | null; readOnly: boolean; showOrig: boolean; transcribing: boolean;
  onLongPress: () => void; onToggleOrig: () => void; onConfirm: () => void; onTranscribe: () => void;
  onOpenFile: () => void; onOpenImage: () => void;
}) {
  if (msg.type === "SYSTEM" || (msg.senderId === null && !msg.kind)) {
    return (
      <View style={s.system}>
        <Text style={s.systemText}>{msg.shown ?? msg.text}</Text>
        <Text style={s.systemTime}>{hhmm(msg.createdAt)}</Text>
      </View>
    );
  }

  const mine = msg.pending || (!!meId && msg.senderId === meId);
  const special = !!msg.kind && msg.kind !== "LISTING";
  const fg = mine && !special ? "#ffffff" : color.foreground;
  const dim = mine && !special ? "#ffffffcc" : color.mutedForeground;
  const body = showOrig ? msg.text : (msg.shown ?? msg.text);
  const kindIcon: Record<string, IconName> = { AGREEMENT: "handshake", PAY_REQUEST: "wallet", EVIDENCE: "paperclip", INCIDENT: "alert", CONFIRM: "check" };

  return (
    <Pressable
      onLongPress={onLongPress}
      delayLongPress={280}
      style={[s.bubble, mine ? s.out : s.in, special && s.special, msg.pending && { opacity: 0.6 }]}
    >
      {special ? (
        <View style={s.kindRow}>
          <Icon name={kindIcon[msg.kind!] ?? "alert"} size={14} stroke={color.brand} />
          <Text style={s.kindText}>{t(`mob.msg.kind.${msg.kind}`)}</Text>
        </View>
      ) : null}
      {!mine && msg.senderName ? <Text style={s.sender}>{msg.senderName}</Text> : null}

      {msg.replyTo ? (
        <View style={[s.quote, { borderLeftColor: mine && !special ? "#ffffff88" : color.brand }]}>
          <Text style={[s.quoteName, { color: dim }]} numberOfLines={1}>{msg.replyTo.name}</Text>
          <Text style={[s.quoteText, { color: fg }]} numberOfLines={2}>{msg.replyTo.text}</Text>
        </View>
      ) : null}

      {msg.type === "LOCATION" && msg.lat != null && msg.lng != null ? (
        <Pressable onPress={() => Linking.openURL(`https://www.google.com/maps?q=${msg.lat},${msg.lng}`)} style={s.inline}>
          <Icon name="map-pin" size={18} stroke={mine ? "#ffffff" : color.brand} />
          <Text style={[s.inlineText, { color: fg }]}>
            {msg.placeName ?? `${msg.lat.toFixed(4)}, ${msg.lng.toFixed(4)}`}
          </Text>
          <Text style={[s.inlineLink, { color: dim }]}>{t("mob.msg.openMap")}</Text>
        </Pressable>
      ) : null}

      {msg.type === "CONTACT" && msg.contact ? (
        <Pressable onPress={() => Linking.openURL(`tel:${msg.contact!.phone}`)} style={s.inline}>
          <Icon name="phone" size={18} stroke={mine ? "#ffffff" : color.brand} />
          <View>
            <Text style={[s.inlineText, { color: fg }]}>{msg.contact.name}</Text>
            <Text style={[s.inlineSub, { color: dim }]}>{msg.contact.phone} · ID {msg.contact.furamId}</Text>
          </View>
        </Pressable>
      ) : null}

      {msg.type === "VOICE" && msg.hasAttachment ? (
        <View>
          <VoiceBubble source={messageFile(chatId, msg.id)} durationSec={msg.durationSec} mine={mine && !special} />
          {!msg.text ? (
            <Pressable onPress={onTranscribe} disabled={transcribing} hitSlop={6} style={{ marginTop: 6 }}>
              <Text style={[s.inlineLink, { color: mine ? "#ffffff" : color.brand }]}>
                {transcribing ? t("mob.msg.voiceBusy") : t("mob.msg.voiceToText")}
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {msg.type === "IMAGE" && msg.hasAttachment ? (
        <Pressable onPress={onOpenImage}>
          <Image source={messageFile(chatId, msg.id)} style={s.image} resizeMode="cover" />
        </Pressable>
      ) : null}

      {(msg.type === "FILE" || msg.type === "VIDEO") && msg.hasAttachment ? (
        <Pressable onPress={onOpenFile} style={s.inline}>
          <Icon name={msg.type === "VIDEO" ? "play" : "file"} size={18} stroke={mine ? "#ffffff" : color.brand} />
          <Text style={[s.inlineText, { color: fg }]}>{msg.type === "VIDEO" ? "Video" : t("mob.chat.file")}</Text>
          <Text style={[s.inlineLink, { color: dim }]}>{t("mob.msg.openFile")}</Text>
        </Pressable>
      ) : null}

      {body && !(msg.kind === "LISTING" && msg.refCard) ? (
        <Text style={[s.text, { color: fg }]}>{body}</Text>
      ) : null}

      {msg.translated ? (
        <Pressable onPress={onToggleOrig} hitSlop={6} style={s.trRow}>
          <Icon name="globe" size={12} stroke={dim} />
          <Text style={[s.trText, { color: dim }]}>{t(showOrig ? "mob.msg.showTranslation" : "mob.msg.showOriginal")}</Text>
        </Pressable>
      ) : null}

      {msg.kind === "LISTING" && msg.refCard ? (
        <View style={s.refCard}>
          <Text style={s.refKind}>{t(`mob.msg.listing.${msg.refKind ?? "load"}`)}</Text>
          <Text style={s.refTitle}>{msg.refCard.title}</Text>
          {msg.refCard.subtitle ? <Text style={s.refSub}>{msg.refCard.subtitle}</Text> : null}
          {msg.refCard.meta ? <Text style={s.refMeta}>{msg.refCard.meta}</Text> : null}
        </View>
      ) : null}

      {msg.kind === "CONFIRM" ? (
        <View style={s.confirmBox}>
          {msg.confirms.length > 0 ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
              <Icon name="check-check" size={14} stroke={color.success} />
              <Text style={s.confirmed}>{t("mob.msg.confirmedBy", { names: msg.confirms.map((c) => c.name).join(", ") })}</Text>
            </View>
          ) : null}
          {!mine && !readOnly && !msg.confirms.some((c) => c.userId === meId) ? (
            <View style={{ marginTop: 8 }}>
              <Button title={t("mob.msg.confirmBtn")} onPress={onConfirm} />
            </View>
          ) : null}
        </View>
      ) : null}

      <View style={s.metaRow}>
        {msg.pinned ? <Icon name="pin" size={11} stroke={dim} /> : null}
        {mine && !msg.pending && msg.seenTotal > 0 ? (
          <>
            <Icon name="check-check" size={12} stroke={msg.seenBy > 0 ? (special ? color.success : "#ffffff") : dim} />
            <Text style={[s.time, { color: dim }]}>{msg.seenBy}/{msg.seenTotal}</Text>
          </>
        ) : null}
        {msg.pending ? (
          <>
            <Icon name="clock" size={11} stroke={dim} />
            <Text style={[s.time, { color: dim }]}>{t("mob.chat.sending")}</Text>
          </>
        ) : (
          <Text style={[s.time, { color: dim }]}>{hhmm(msg.createdAt)}</Text>
        )}
      </View>
    </Pressable>
  );
}

/* ─────────────────────────────────────────────── bo'laklar */

function Att({ icon, tint, bg, label, onPress }: { icon: IconName; tint: string; bg: string; label: string; onPress?: () => void }) {
  return (
    <Pressable style={s.att} onPress={onPress}>
      <View style={[s.attIcon, { backgroundColor: bg }]}>
        <Icon name={icon} size={23} stroke={tint} />
      </View>
      <Text style={s.attLabel} numberOfLines={2}>{label}</Text>
    </Pressable>
  );
}

function MenuRow({ icon, label, danger, last, onPress }: { icon: IconName; label: string; danger?: boolean; last?: boolean; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [s.menuRow, !last && s.menuDivider, pressed && { opacity: 0.6 }]}>
      <Icon name={icon} size={19} stroke={danger ? color.danger : "#475569"} />
      <Text style={[s.menuLabel, danger && { color: color.danger }]}>{label}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.background },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 8, paddingVertical: 6, gap: 6 },
  hBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: color.blueSoft, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 14, fontWeight: "800", color: color.blue },
  title: { fontSize: font.bodyLg, fontWeight: "800", color: color.foreground, letterSpacing: -0.2 },
  sub: { fontSize: 12, color: color.mutedForeground, marginTop: 1 },

  searchBar: {
    flexDirection: "row", alignItems: "center", gap: 8, marginHorizontal: space.lg, marginBottom: 6,
    height: 42, paddingHorizontal: 12, borderRadius: radius.control, backgroundColor: color.card, ...shadow.card,
  },
  searchInput: { flex: 1, fontSize: font.body, color: color.foreground, fontFamily: "Manrope_500Medium" },

  pinned: { marginHorizontal: space.lg, marginBottom: 6, gap: 4 },
  pinRow: {
    flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: radius.control, backgroundColor: color.brandSoft,
  },
  pinText: { flex: 1, fontSize: 13, fontWeight: "600", color: color.foreground },

  list: { padding: space.lg, gap: 8 },
  empty: { textAlign: "center", color: color.mutedForeground, fontSize: 14, paddingVertical: 30 },

  bubble: { maxWidth: "82%", padding: 11, borderRadius: 18 },
  in: { alignSelf: "flex-start", backgroundColor: color.card, borderBottomLeftRadius: 5, ...shadow.card },
  out: { alignSelf: "flex-end", backgroundColor: color.brand, borderBottomRightRadius: 5 },
  special: { alignSelf: "stretch", maxWidth: "100%", backgroundColor: color.card, borderLeftWidth: 3, borderLeftColor: color.brand, ...shadow.card },
  kindRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 5 },
  kindText: { fontSize: 11.5, fontWeight: "800", color: color.brand, letterSpacing: 0.2 },
  sender: { fontSize: 11.5, fontWeight: "700", color: color.blue, marginBottom: 3 },
  quote: { borderLeftWidth: 2, paddingLeft: 8, marginBottom: 6 },
  quoteName: { fontSize: 11, fontWeight: "700" },
  quoteText: { fontSize: 12.5, opacity: 0.85 },
  text: { fontSize: 14.5, lineHeight: 21 },
  inline: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 2 },
  inlineText: { fontSize: 14, fontWeight: "700" },
  inlineSub: { fontSize: 12 },
  inlineLink: { fontSize: 12, fontWeight: "600", textDecorationLine: "underline" },
  image: { width: 220, height: 220, borderRadius: 12, backgroundColor: color.muted, marginBottom: 4 },
  trRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  trText: { fontSize: 11, textDecorationLine: "underline" },

  refCard: { marginTop: 6, padding: 10, borderRadius: 12, backgroundColor: color.background },
  refKind: { fontSize: 10.5, fontWeight: "800", color: color.mutedForeground, letterSpacing: 0.4 },
  refTitle: { fontSize: 14, fontWeight: "700", color: color.foreground, marginTop: 2 },
  refSub: { fontSize: 12, color: color.mutedForeground },
  refMeta: { fontSize: 14, fontWeight: "800", color: color.brand, marginTop: 2 },

  confirmBox: { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: color.border },
  confirmed: { fontSize: 12, fontWeight: "600", color: color.success },

  metaRow: { flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 4, marginTop: 4 },
  time: { fontSize: 10.5, fontVariant: ["tabular-nums"] },

  system: { alignSelf: "center", backgroundColor: color.muted, borderRadius: 12, paddingVertical: 7, paddingHorizontal: 13, maxWidth: "90%" },
  systemText: { fontSize: 12, color: "#475569", textAlign: "center" },
  systemTime: { fontSize: 10, color: "#94a3b8", textAlign: "center", marginTop: 2 },

  errBar: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: space.lg, paddingVertical: 8, backgroundColor: color.dangerSoft },
  errText: { fontSize: 12, color: color.danger, flex: 1 },

  readOnly: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingTop: 12, backgroundColor: color.card, ...shadow.bar },
  readOnlyText: { fontSize: 13, color: color.mutedForeground },

  composer: { backgroundColor: color.card, paddingHorizontal: 10, paddingTop: 8, gap: 8, ...shadow.bar },
  replyBar: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.control, backgroundColor: color.brandSoft },
  replyText: { flex: 1, fontSize: 12.5, color: color.foreground },
  aiCard: { padding: 12, borderRadius: radius.control + 2, backgroundColor: color.blueSoft },
  aiTitle: { fontSize: 11.5, fontWeight: "800", color: color.brand, letterSpacing: 0.2 },
  aiText: { fontSize: 14, color: color.foreground, marginTop: 6, lineHeight: 20 },
  aiApply: { height: 32, paddingHorizontal: 14, borderRadius: 16, backgroundColor: color.brand, justifyContent: "center" },
  aiApplyText: { fontSize: 13, fontWeight: "700", color: "#fff" },
  aiDismiss: { fontSize: 13, fontWeight: "600", color: color.mutedForeground },

  inputRow: { flexDirection: "row", alignItems: "flex-end", gap: 8 },
  roundBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: color.muted, alignItems: "center", justifyContent: "center" },
  field: { flex: 1, minHeight: 42, maxHeight: 140, borderRadius: 21, backgroundColor: color.background, paddingLeft: 14, paddingRight: 6, flexDirection: "row", alignItems: "flex-end" },
  input: { flex: 1, fontSize: font.body, color: color.foreground, paddingVertical: 10, fontFamily: "Manrope_500Medium" },
  aiRow: { flexDirection: "row", paddingBottom: 5 },
  aiBtn: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  sendBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: color.brand, alignItems: "center", justifyContent: "center" },

  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 6 },
  att: { width: "22%", alignItems: "center", gap: 7 },
  attIcon: { width: 56, height: 56, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  attLabel: { fontSize: 11.5, fontWeight: "600", color: color.foreground, textAlign: "center" },
  sheetGroup: { fontSize: 12, fontWeight: "700", color: color.mutedForeground, letterSpacing: 0.4, marginTop: 10, marginBottom: 10 },

  langGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  langItem: { width: "48%", flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderRadius: radius.control, backgroundColor: color.background },
  langText: { fontSize: 14, fontWeight: "600", color: color.foreground },

  msgPreview: { fontSize: 13, color: color.mutedForeground, marginBottom: 6, paddingHorizontal: 4 },
  menuRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14, paddingHorizontal: 4 },
  menuDivider: { borderBottomWidth: 1, borderBottomColor: color.border },
  menuLabel: { fontSize: 15, fontWeight: "600", color: color.foreground },

  viewer: { flex: 1, backgroundColor: "#000000ee", alignItems: "center", justifyContent: "center" },
  viewerImg: { width: "100%", height: "80%" },
  viewerClose: { position: "absolute", right: 16, width: 40, height: 40, borderRadius: 20, backgroundColor: "#ffffff22", alignItems: "center", justifyContent: "center" },
});
