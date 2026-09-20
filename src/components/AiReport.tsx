/**
 * AI javobi ustidan shikoyat (2026-09-18, do'kon auditi A13).
 *
 * Google Play «AI yaratgan kontent» qoidasi: ilova AI yaratgan
 * haqoratli yoki XATO javobni ILOVA ICHIDA belgilash imkonini
 * berishi shart. FURAM'da AI to'rt joyda javob beradi — suhbat,
 * diagnostika, narx tahlili, skaner — va hech birida bunday yo'l
 * yo'q edi.
 *
 * ── JAVOBNING O'ZI YUBORILADI ───────────────────────────────────
 *
 * Shikoyat bilan birga javob matni ham ketadi: AI javobi ko'p joyda
 * bazada saqlanmaydi (diagnostika, narx tahlili) va moderator
 * keyin nimani ko'rib qaror qilishini bilmasdi.
 *
 * Tugma KICHIK va javobning ostida turadi: har javobda katta qizil
 * tugma bo'lsa, odam AI ga ishonmay qolardi.
 */
import { useState } from "react";
import { Pressable, View } from "react-native";
import { Text } from "@/components/Text";
import { Sheet } from "@/components/Sheet";
import { Button, Field } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { api, FuramError } from "@/lib/api";
import { color, font, space, themed } from "@/lib/theme";
import { t } from "@/lib/i18n";

/** Server bilan BIR XIL ro'yxat — `furam/src/lib/abuse.ts` */
const KINDS = ["WRONG", "OFFENSIVE", "DANGEROUS", "PRIVACY", "OTHER"] as const;

export type AiPlace = "chat" | "diagnose" | "price" | "scan";

export function AiReportButton({
  place,
  answer,
  question,
}: {
  place: AiPlace;
  /** Javob matni — dalil. Bo'sh bo'lsa tugma ko'rsatilmaydi */
  answer: string | null | undefined;
  question?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  if (!answer || !answer.trim()) return null;

  function yop() {
    setOpen(false);
    setKind(null);
    setText("");
    setErr(null);
  }

  async function yubor() {
    if (!kind) return;
    setBusy(true);
    setErr(null);
    try {
      await api("/api/abuse/ai", {
        method: "POST",
        body: { place, kind, text: text.trim() || null, answer, question: question ?? null },
      });
      setSent(true);
      yop();
    } catch (e) {
      setErr((e as FuramError).message ?? t("mob.aiRep.failed"));
    } finally {
      setBusy(false);
    }
  }

  /* Yuborilgach tugma o'rniga qisqa tasdiq qoladi: ikkinchi marta
     yuborishning ma'nosi yo'q va «ketdimi?» degan savol ham
     qolmasligi kerak */
  if (sent) {
    return (
      <View style={s.doneRow}>
        <Icon name="check" size={13} stroke={color.success} />
        <Text style={s.done}>{t("mob.aiRep.sent")}</Text>
      </View>
    );
  }

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={t("mob.aiRep.title")}
        style={({ pressed }) => [s.btn, pressed && { opacity: 0.6 }]}
      >
        <Icon name="alert" size={12} stroke={color.mutedForeground} />
        <Text style={s.btnText}>{t("mob.aiRep.btn")}</Text>
      </Pressable>

      <Sheet open={open} onClose={yop} title={t("mob.aiRep.title")}>
        <Text style={s.hint}>{t("mob.aiRep.hint")}</Text>

        <View style={{ marginTop: space.md }}>
          {KINDS.map((k) => (
            <Pressable
              key={k}
              onPress={() => {
                setKind(k);
                setErr(null);
              }}
              accessibilityRole="radio"
              accessibilityState={{ selected: kind === k }}
              style={({ pressed }) => [s.row, pressed && { opacity: 0.6 }]}
            >
              <View style={[s.dot, kind === k && s.dotOn]}>
                {kind === k ? <View style={s.dotIn} /> : null}
              </View>
              <Text style={s.rowText}>{t(`mob.aiRep.k_${k}`)}</Text>
            </Pressable>
          ))}
        </View>

        <View style={{ marginTop: space.md }}>
          <Field
            label={t("mob.abuse.note")}
            hint={t("mob.common.optional")}
            value={text}
            onChangeText={setText}
            multiline
            numberOfLines={3}
            maxLength={1000}
            placeholder={t("mob.aiRep.notePh")}
          />
        </View>

        {err ? <Text style={s.err}>{err}</Text> : null}

        <View style={{ gap: space.sm, marginTop: space.lg }}>
          <Button title={t("mob.abuse.send")} onPress={yubor} loading={busy} disabled={!kind} />
          <Button title={t("mob.common.cancel")} variant="secondary" onPress={yop} />
        </View>
      </Sheet>
    </>
  );
}

const s = themed(() => ({
  btn: { flexDirection: "row", alignItems: "center", gap: 5, paddingVertical: 6, alignSelf: "flex-start" },
  btnText: { fontSize: 12, fontWeight: "600", color: color.mutedForeground },

  doneRow: { flexDirection: "row", alignItems: "center", gap: 5, paddingVertical: 6 },
  done: { fontSize: 12, fontWeight: "600", color: color.successText },

  hint: { fontSize: font.caption, color: color.mutedForeground, lineHeight: 19 },
  row: { flexDirection: "row", alignItems: "center", gap: space.md, paddingVertical: 11 },
  dot: {
    width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: color.border,
    alignItems: "center", justifyContent: "center",
  },
  dotOn: { borderColor: color.brand },
  dotIn: { width: 11, height: 11, borderRadius: 6, backgroundColor: color.brand },
  rowText: { flex: 1, fontSize: font.body, color: color.foreground },

  err: { fontSize: font.caption, color: color.danger, marginTop: space.md },
}));
