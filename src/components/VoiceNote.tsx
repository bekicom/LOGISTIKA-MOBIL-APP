/**
 * Ovoz bilan aytish — matn maydoni yoniga.
 *
 * ── NEGA KERAK ──────────────────────────────────────────────────
 *
 * Usta chaqirishda nosozlikni terib emas, AYTIB tushuntirish
 * qulayroq: haydovchi yo'lda, qo'li moyda va «radiatordan suv
 * ketyapti, isitgich sovuq puflayapti» degan gapni telefon
 * klaviaturasida yozmaydi. Dizaynda ovoz yozish ko'rsatilgan edi
 * va faqat chatda qilingan.
 *
 * ── OVOZ EMAS, MATN SAQLANADI ───────────────────────────────────
 *
 * Ovozning O'ZINI buyurtmaga biriktirish yomon yechim bo'lardi:
 * ustaga pleyer kerak, matn qidiruvga tushmaydi, boshqa tildagi
 * usta esa umuman tushunmaydi. Shuning uchun ovoz serverda
 * matnga o'giriladi va odatdagi maydonga TUSHADI — odam uni
 * o'qib, kerak bo'lsa tuzatadi.
 *
 * ── USTIGA QO'SHILADI, O'CHIRMAYDI ──────────────────────────────
 *
 * Maydonda allaqachon matn bo'lsa, yangisi ostiga qo'shiladi.
 * Almashtirib yuborsak, odam yozganini bir bosishda yo'qotardi.
 */
import { useState } from "react";
import { View } from "react-native";
import { Text } from "@/components/Text";
import { MicButton, type VoiceFile } from "@/components/Recorder";
import { apiUpload, FuramError } from "@/lib/api";
import { tariffBlocked } from "@/lib/features";
import { color, space, themed } from "@/lib/theme";
import { t, tOr } from "@/lib/i18n";

export function VoiceNote({
  value,
  onText,
}: {
  /** Maydondagi joriy matn — yangisi shunga qo'shiladi */
  value: string;
  onText: (next: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function send(v: VoiceFile) {
    /* Qoida 5: to'siq OLDINDAN. Ovozni matnga o'girish — eng
       qimmat model chaqiruvi va `ai` tarifiga kiradi. Yozib
       bo'lgandan keyin aytish kech bo'lardi. */
    if (tariffBlocked("ai")) return;
    setErr(null);
    setMsg(null);
    setBusy(true);
    try {
      const r = await apiUpload<{ text: string }>(
        "/api/ai/voice-text",
        {},
        [{ field: "file", uri: v.uri, name: v.name, type: v.type }],
      );
      const text = (r.text ?? "").trim();
      if (!text) {
        setMsg(t("mob.voiceNote.empty"));
        return;
      }
      onText(value.trim() ? `${value.trim()}\n${text}` : text);
    } catch (e) {
      const fe = e as FuramError;
      setErr(tOr(`mob.aiErr.${fe.code}`, fe.message || t("mob.voiceNote.failed")));
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={s.wrap}>
      <View style={s.row}>
        <MicButton
          onDone={(v) => void send(v)}
          onError={(m) => setErr(m)}
          onHint={(m) => setMsg(m)}
          disabled={busy}
        />
        <Text style={s.hint}>{busy ? t("mob.voiceNote.working") : t("mob.voiceNote.hint")}</Text>
      </View>
      {msg ? <Text style={s.note}>{msg}</Text> : null}
      {err ? <Text style={s.err}>{err}</Text> : null}
    </View>
  );
}

const s = themed(() => ({
  wrap: { marginTop: space.sm },
  row: { flexDirection: "row", alignItems: "center", gap: 11 },
  hint: { flex: 1, fontSize: 12, color: color.mutedForeground, lineHeight: 17 },
  note: { fontSize: 12, color: color.mutedForeground, marginTop: 6 },
  err: { fontSize: 12, color: color.danger, marginTop: 6 },
}));
