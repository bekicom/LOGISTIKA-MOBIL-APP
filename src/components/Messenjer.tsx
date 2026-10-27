/**
 * Messenjer qo'shimchalari — ✓✓, «yozmoqda», onlayn, reaksiya, uzatish,
 * firibgarlik ogohlantirishi (TZ v2 §5.1 va §3.4.4, 2026-10-27).
 *
 * Webdagi nusxasi: `furam/src/components/chat/messenjer-ui.tsx`. Ma'lumot
 * `/api/chat/[id]/messages` javobidagi `holat` bo'lagidan keladi — u HAR
 * so'rovda qaytadi, chunki reaksiya va «o'qildi» eski xabarda o'zgaradi.
 */
import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, TextInput, View } from "react-native";
import { Text } from "@/components/Text";
import { Icon } from "@/components/Icon";
import { Sheet } from "@/components/Sheet";
import { api, FuramError } from "@/lib/api";
import { color, radius, space, themed } from "@/lib/theme";
import { t } from "@/lib/i18n";

/** Server bilan BIR XIL ro'yxat (`furam/src/lib/messenjer-holat.ts`) */
export const REAKSIYALAR = ["👍", "❤️", "😂", "😮", "😢", "🙏"] as const;

export type ReaksiyaSoni = { e: string; n: number; men: boolean };
export type ChatHolati = {
  oqildi: string | null;
  yozmoqda: string[];
  onlayn: { hozir: boolean; oxirgi: string } | null;
  reaksiyalar: Record<string, ReaksiyaSoni[]>;
  jonli: { id: string; lat: number; lng: number; liveUntil: string }[];
};
export type Ogohlantirish = { tur: "prepay" | "card" | "code"; yangi: boolean };

/** Jonli joylashuv muddatlari, daqiqa — server `JONLI_MUDDAT` bilan bir xil */
export const JONLI_MUDDAT = [15, 60, 480] as const;

export function hhmm(iso: string) {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function oxirgiVaqt(iso: string) {
  const d = new Date(iso);
  return d.toDateString() === new Date().toDateString()
    ? hhmm(iso)
    : `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")} ${hhmm(iso)}`;
}

/** Sarlavha ostidagi matn: «yozmoqda…», «onlayn» yoki «oxirgi marta» — yo'q bo'lsa null */
export function holatMatni(h: ChatHolati | null): { matn: string; faol: boolean } | null {
  if (!h) return null;
  if (h.yozmoqda.length) {
    return {
      matn: h.yozmoqda.length === 1 ? t("msgr.typing", { name: h.yozmoqda[0] }) : t("msgr.typingMany", { n: h.yozmoqda.length }),
      faol: true,
    };
  }
  if (!h.onlayn) return null;
  return h.onlayn.hozir
    ? { matn: t("msgr.online"), faol: true }
    : { matn: t("msgr.lastSeen", { time: oxirgiVaqt(h.onlayn.oxirgi) }), faol: false };
}

export function HolatQatori({ holat, fallback }: { holat: ChatHolati | null; fallback: string }) {
  const h = holatMatni(holat);
  return (
    <Text style={[s.sub, h?.faol && { color: color.success }]} numberOfLines={1}>
      {h?.matn ?? fallback}
    </Text>
  );
}

/** ✓ yuborildi / ✓✓ o'qildi */
export function oqildimi(createdAt: string, oqildi: string | null | undefined) {
  return !!oqildi && oqildi >= createdAt;
}

/** Pufakcha ostidagi reaksiyalar */
export function Reaksiyalar({ list, onBos }: { list?: ReaksiyaSoni[]; onBos: (e: string) => void }) {
  if (!list?.length) return null;
  return (
    <View style={s.rRow}>
      {list.map((r) => (
        <Pressable
          key={r.e}
          onPress={() => onBos(r.e)}
          hitSlop={4}
          style={[s.rChip, r.men && s.rChipOn]}
          accessibilityRole="button"
          accessibilityLabel={`${r.e} ${r.n}`}
        >
          <Text style={{ fontSize: 13 }}>{r.e}</Text>
          <Text style={s.rN}>{r.n}</Text>
        </Pressable>
      ))}
    </View>
  );
}

/** Xabar menyusining tepasidagi reaksiya qatori */
export function ReaksiyaTanlash({ onTanla }: { onTanla: (e: string) => void }) {
  return (
    <View style={s.pick} accessibilityLabel={t("msgr.react")}>
      {REAKSIYALAR.map((e) => (
        <Pressable key={e} onPress={() => onTanla(e)} hitSlop={6} style={s.pickBtn} accessibilityRole="button" accessibilityLabel={e}>
          <Text style={{ fontSize: 26 }}>{e}</Text>
        </Pressable>
      ))}
    </View>
  );
}

/** Firibgarlik ogohlantirishi — XABARDAGI FAKT, odamga baho emas */
export function FiribgarOgoh({ o, onShikoyat }: { o: Ogohlantirish; onShikoyat?: () => void }) {
  return (
    <View style={s.fraud} accessibilityRole="alert">
      <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
        <Icon name="alert" size={14} stroke={color.warning} />
        <Text style={s.fraudTitle}>{t("fraud.title")}</Text>
      </View>
      <Text style={s.fraudText}>
        {o.yangi ? `${t("fraud.yangi")} ` : ""}
        {t(`fraud.${o.tur}`)}
      </Text>
      {onShikoyat ? (
        <Pressable onPress={onShikoyat} hitSlop={6}>
          <Text style={s.fraudLink}>{t("fraud.report")}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

type ChatQator = { id: string; title: string; readOnly?: boolean };

/** «Uzatish» — qaysi suhbatga */
export function UzatishSheet({
  chatId,
  messageId,
  onClose,
  onDone,
}: {
  chatId: string;
  messageId: string | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const [chats, setChats] = useState<ChatQator[] | null>(null);
  const [q, setQ] = useState("");
  const [band, setBand] = useState<string | null>(null);
  const [xato, setXato] = useState<string | null>(null);

  useEffect(() => {
    if (!messageId) return;
    let tirik = true;
    void api<{ chats?: ChatQator[] }>("/api/chats")
      .then((d) => tirik && setChats((d.chats ?? []).filter((c) => !c.readOnly)))
      .catch(() => tirik && setChats([]));
    return () => {
      tirik = false;
    };
  }, [messageId]);

  async function yubor(toChatId: string) {
    if (!messageId) return;
    setBand(toChatId);
    setXato(null);
    try {
      await api(`/api/chat/${chatId}/messages/${messageId}/forward`, { method: "POST", body: { toChatId } });
      onDone();
    } catch (e) {
      setXato((e as FuramError).message ?? t("mob.msg.actionFailed"));
    } finally {
      setBand(null);
    }
  }

  const royxat = (chats ?? []).filter((c) => !q.trim() || c.title.toLowerCase().includes(q.trim().toLowerCase()));

  return (
    <Sheet open={!!messageId} onClose={onClose} title={t("msgr.forwardTo")}>
      <TextInput
        value={q}
        onChangeText={setQ}
        placeholder={t("mob.msg.search")}
        placeholderTextColor={color.faintText}
        style={s.search}
      />
      {chats === null ? <ActivityIndicator color={color.brand} style={{ marginVertical: space.md }} /> : null}
      <FlatList
        data={royxat}
        keyExtractor={(c) => c.id}
        style={{ maxHeight: 360 }}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => (
          <Pressable onPress={() => void yubor(item.id)} disabled={!!band} style={s.chatRow} accessibilityRole="button">
            <Icon name="chat" size={18} stroke={color.brand} />
            <Text style={s.chatTitle} numberOfLines={1}>{item.title}</Text>
            {band === item.id ? <ActivityIndicator size="small" color={color.brand} /> : <Icon name="forward" size={16} stroke={color.mutedForeground} />}
          </Pressable>
        )}
      />
      {xato ? <Text style={s.err}>{xato}</Text> : null}
    </Sheet>
  );
}

const s = themed(() => ({
  sub: { fontSize: 12, color: color.mutedForeground },
  rRow: { flexDirection: "row" as const, flexWrap: "wrap" as const, gap: 4, marginTop: 6 },
  rChip: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: color.card,
    borderWidth: 1,
    borderColor: color.border,
  },
  rChipOn: { borderColor: color.brand, backgroundColor: color.brandSoft },
  rN: { fontSize: 11, color: color.mutedForeground, fontVariant: ["tabular-nums" as const] },
  pick: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    paddingHorizontal: space.sm,
    paddingBottom: space.sm,
  },
  pickBtn: { padding: 4 },
  fraud: {
    marginTop: 8,
    padding: 8,
    borderRadius: radius.control,
    backgroundColor: color.warningSoft,
    gap: 3,
  },
  fraudTitle: { fontSize: 12, fontFamily: "Manrope_700Bold", color: color.warning },
  fraudText: { fontSize: 12, color: color.foreground, lineHeight: 17 },
  fraudLink: { fontSize: 12, fontFamily: "Manrope_700Bold", color: color.warning, textDecorationLine: "underline" as const },
  search: {
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.control,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: color.foreground,
    marginBottom: space.sm,
  },
  chatRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 10,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: color.border,
  },
  chatTitle: { flex: 1, fontSize: 15, color: color.foreground },
  err: { marginTop: 8, fontSize: 13, color: color.danger },
}));
