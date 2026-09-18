/**
 * Shikoyat va bloklash varaqasi (2026-09-18, do'kon auditi A12).
 *
 * ── NEGA BITTA KOMPONENT ────────────────────────────────────────
 *
 * Apple 1.2 va Google Play talabi kontentning HAR TURIGA tegishli:
 * chat xabari, odam, yuk, transport, bozor, zapchast, ustaxona.
 * Har ekranga o'z oynasi yozilsa, biri o'zgarganda qolgani eskirib
 * qolardi va do'kon tekshiruvchisi ayni o'sha ekranni ochardi.
 *
 * ── BLOKLASH SHU YERDA ──────────────────────────────────────────
 *
 * «Shikoyat qilish» va «bloklash» ikki alohida oyna bo'lsa, odam
 * shikoyat yozib, keyin yana bloklashni qidirib yurardi. Shuning
 * uchun belgi shu varaqda: nishon odamga tegishli bo'lsa
 * (`blockUserId` berilgan) ko'rinadi.
 *
 * Server ikkalasini bitta so'rovda bajaradi (`/api/abuse`) — ikki
 * so'rov ilovada ikki xil xato holatini yasardi.
 */
import { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { Text } from "@/components/Text";
import { Sheet } from "@/components/Sheet";
import { Button, Field } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { api, FuramError } from "@/lib/api";
import { color, font, space, themed } from "@/lib/theme";
import { t } from "@/lib/i18n";

/** Server bilan BIR XIL ro'yxat — `furam/src/lib/abuse.ts` */
export const ABUSE_KINDS = ["SPAM", "INSULT", "FRAUD", "SEXUAL", "VIOLENCE", "FAKE", "OTHER"] as const;
export type AbuseTarget = "message" | "user" | "load" | "vehicle" | "sale" | "part" | "service";

export function ReportSheet({
  open,
  onClose,
  target,
  targetId,
  /** Nishon egasi — belgi qo'yilsa shu odam bloklanadi */
  blockUserId,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  target: AbuseTarget;
  targetId: string;
  blockUserId?: string | null;
  /** `blocked` — bloklash ham bajarildimi (ekran ro'yxatini yangilashi uchun) */
  onDone?: (blocked: boolean) => void;
}) {
  const [kind, setKind] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [block, setBlock] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function yop() {
    setKind(null);
    setText("");
    setBlock(false);
    setErr(null);
    onClose();
  }

  async function yubor() {
    if (!kind) return;
    setBusy(true);
    setErr(null);
    try {
      const r = await api<{ ok?: boolean; blocked?: boolean }>("/api/abuse", {
        method: "POST",
        body: {
          target,
          targetId,
          kind,
          text: text.trim() || null,
          block: block && !!blockUserId,
          blockUserId: blockUserId ?? null,
        },
      });
      onDone?.(!!r.blocked);
      yop();
    } catch (e) {
      const fe = e as FuramError;
      /* Takror shikoyat — XATO EMAS: odam allaqachon yozgan va
         buni bilishi kerak, lekin qizil xato ko'rsatish o'rniga
         varaq yopiladi (bloklash ham baribir bajarilgan) */
      if (fe.code === "ALREADY") {
        onDone?.(!!(fe.data?.blocked ?? false));
        yop();
        return;
      }
      setErr(fe.message ?? t("mob.abuse.failed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet open={open} onClose={yop} title={t("mob.abuse.title")}>
      <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: 460 }}>
        <Text style={s.hint}>{t("mob.abuse.hint")}</Text>

        <View style={s.list}>
          {ABUSE_KINDS.map((k) => (
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
              <Text style={s.rowText}>{t(`mob.abuse.k_${k}`)}</Text>
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
            placeholder={t("mob.abuse.notePh")}
          />
        </View>

        {blockUserId ? (
          <Pressable
            onPress={() => setBlock(!block)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: block }}
            style={s.check}
          >
            <View style={[s.box, block && s.boxOn]}>
              {block ? <Icon name="check" size={13} stroke="#ffffff" /> : null}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.checkText}>{t("mob.block.alsoBlock")}</Text>
              <Text style={s.checkHint}>{t("mob.block.alsoBlockHint")}</Text>
            </View>
          </Pressable>
        ) : null}

        {err ? <Text style={s.err}>{err}</Text> : null}

        <View style={{ gap: space.sm, marginTop: space.lg }}>
          <Button title={t("mob.abuse.send")} onPress={yubor} loading={busy} disabled={!kind} />
          <Button title={t("mob.common.cancel")} variant="secondary" onPress={yop} />
        </View>
      </ScrollView>
    </Sheet>
  );
}

const s = themed(() => ({
  hint: { fontSize: font.caption, color: color.mutedForeground, lineHeight: 19 },
  list: { marginTop: space.md },
  row: { flexDirection: "row", alignItems: "center", gap: space.md, paddingVertical: 11 },
  dot: {
    width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: color.border,
    alignItems: "center", justifyContent: "center",
  },
  dotOn: { borderColor: color.brand },
  dotIn: { width: 11, height: 11, borderRadius: 6, backgroundColor: color.brand },
  rowText: { flex: 1, fontSize: font.body, color: color.foreground },

  check: { flexDirection: "row", gap: space.md, alignItems: "flex-start", marginTop: space.md },
  box: {
    width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: color.border,
    alignItems: "center", justifyContent: "center", marginTop: 1,
  },
  boxOn: { backgroundColor: color.danger, borderColor: color.danger },
  checkText: { fontSize: font.body, fontWeight: "600", color: color.foreground },
  checkHint: { fontSize: 12, color: color.mutedForeground, lineHeight: 17, marginTop: 2 },

  err: { fontSize: font.caption, color: color.danger, marginTop: space.md },
}));

/** Ro'yxat qatoridagi «⋯» menyusi uchun kichik yordamchi tugma */
export function ReportRow({ onPress, label }: { onPress: () => void; label?: string }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [r.row, pressed && { opacity: 0.6 }]}>
      <Icon name="alert" size={17} stroke={color.danger} />
      <Text style={r.text}>{label ?? t("mob.abuse.title")}</Text>
    </Pressable>
  );
}

const r = themed(() => ({
  row: { flexDirection: "row", alignItems: "center", gap: space.sm, paddingVertical: 10, paddingHorizontal: space.xs },
  text: { fontSize: font.caption, fontWeight: "600", color: color.danger },
}));
