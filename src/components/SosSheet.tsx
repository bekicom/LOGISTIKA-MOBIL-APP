/**
 * 🆘 SOS — sabab, izoh va avto-joylashuv.
 *
 * ── IKKI YO'L, IKKALASI HAM KERAK ───────────────────────────────
 *
 * Oddiy: tugma bosiladi, varaq ochiladi, sabab tanlanadi.
 * Jim: tugma 2 soniya ushlab turiladi — varaq OCHILMAYDI, signal
 * darrov ketadi va ekranda hech narsa o'zgarmaydi. Bu haydovchi
 * gapira olmaydigan vaziyat uchun (TZ 02, 32-band): kabinada
 * begona odam bo'lsa, ekrandagi qizil oyna uni ogohlantiradi.
 *
 * ── JOYLASHUV SO'RALMAYDI, OLINADI ──────────────────────────────
 *
 * Ruxsat BERILGAN bo'lsa koordinata qo'shiladi, bo'lmasa SOS
 * baribir ketadi. SOS paytida tizim oynasini chiqarish — eng
 * yomon vaqtda odamni to'xtatish degani.
 */
import { useRef, useState } from "react";
import { Pressable, View } from "react-native";
import * as Location from "expo-location";
import { Text } from "@/components/Text";
import { Icon } from "@/components/Icon";
import { Sheet } from "@/components/Sheet";
import { Button, Field, Notice } from "@/components/ui";
import { api, FuramError } from "@/lib/api";
import { color, radius, space, themed } from "@/lib/theme";
import { t } from "@/lib/i18n";

const REASONS = ["BREAKDOWN", "ACCIDENT", "HEALTH", "DOCUMENTS", "OTHER"] as const;

export type ActiveSos = {
  reason: string;
  note: string | null;
  placeName: string | null;
  at: string;
} | null;

/** Ruxsat bo'lsa koordinata, bo'lmasa `null` — hech qachon so'ramaydi */
async function whereAmI(): Promise<{ lat: number; lng: number } | null> {
  try {
    const p = await Location.getForegroundPermissionsAsync();
    if (!p.granted) return null;
    const pos = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    return { lat: pos.coords.latitude, lng: pos.coords.longitude };
  } catch {
    return null;
  }
}

/* ─────────────────────────────────────────────── ochiq SOS kartasi */

export function SosCard({
  tripId,
  sos,
  onDone,
}: {
  tripId: string;
  sos: NonNullable<ActiveSos>;
  onDone: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function resolve() {
    setBusy(true);
    setErr(null);
    try {
      await api(`/api/trips/${tripId}/sos`, {
        method: "POST",
        body: { reason: "OTHER", resolve: true },
      });
      onDone();
    } catch (e) {
      setErr((e as FuramError).message ?? t("mob.common.failed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={s.active}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <View style={s.pulse} />
        <Text style={s.activeTitle}>{t("mob.sos.active")}</Text>
      </View>
      <Text style={s.activeReason}>{t(`sosReason.${sos.reason}`)}</Text>
      {sos.note ? <Text style={s.activeNote}>{sos.note}</Text> : null}
      {sos.placeName ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 5, marginTop: 4 }}>
          <Icon name="map-pin" size={13} stroke={color.danger} />
          <Text style={s.activePlace}>{sos.placeName}</Text>
        </View>
      ) : null}
      {err ? <Text style={s.err}>{err}</Text> : null}
      <Pressable onPress={resolve} disabled={busy} style={s.resolve}>
        <Icon name="check" size={16} stroke={color.success} />
        <Text style={s.resolveText}>{busy ? t("mob.common.saving") : t("mob.sos.resolve")}</Text>
      </Pressable>
    </View>
  );
}

/* ─────────────────────────────────────────────── tugma + varaq */

export function SosButton({ tripId, onSent }: { tripId: string; onSent: () => void }) {
  const [open, setOpen] = useState(false);
  const [holding, setHolding] = useState(false);
  const [silent, setSilent] = useState(false);
  const [reason, setReason] = useState<string>("BREAKDOWN");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const hold = useRef<ReturnType<typeof setTimeout> | null>(null);
  /* Uzoq bosish ishlagach `onPress` ham keladi — varaq ochilib
     ketmasligi uchun belgi qo'yiladi */
  const fired = useRef(false);

  async function send(body: Record<string, unknown>) {
    setBusy(true);
    setErr(null);
    try {
      const at = await whereAmI();
      await api(`/api/trips/${tripId}/sos`, {
        method: "POST",
        body: at ? { ...body, ...at } : body,
      });
      setOpen(false);
      setNote("");
      onSent();
      return true;
    } catch (e) {
      setErr((e as FuramError).message ?? t("mob.common.failed"));
      return false;
    } finally {
      setBusy(false);
    }
  }

  function startHold() {
    fired.current = false;
    setHolding(true);
    hold.current = setTimeout(() => {
      setHolding(false);
      fired.current = true;
      setSilent(true);
      void send({ reason: "OTHER", note: t("mob.sos.silent") });
    }, 2000);
  }

  function cancelHold() {
    if (hold.current) clearTimeout(hold.current);
    hold.current = null;
    setHolding(false);
  }

  return (
    <>
      <Pressable
        onPressIn={startHold}
        onPressOut={cancelHold}
        onPress={() => {
          if (!fired.current) setOpen(true);
        }}
        style={({ pressed }) => [s.btn, (pressed || holding) && { backgroundColor: color.danger + "1a" }]}
      >
        <Icon name="alert" size={18} stroke={color.danger} />
        <Text style={s.btnText}>{t("mob.sos.btn")}</Text>
      </Pressable>
      <Text style={s.hint}>
        {holding ? t("mob.sos.holding") : silent ? t("mob.sos.silentSent") : t("mob.sos.holdHint")}
      </Text>

      <Sheet open={open} onClose={() => setOpen(false)} title={t("mob.sos.title")}>
        <Text style={s.lead}>{t("mob.sos.lead")}</Text>

        <Text style={s.label}>{t("mob.sos.reason")}</Text>
        <View style={{ gap: 7 }}>
          {REASONS.map((r) => (
            <Pressable
              key={r}
              onPress={() => setReason(r)}
              style={[s.reason, reason === r && s.reasonOn]}
            >
              <Text style={[s.reasonText, reason === r && { color: color.danger, fontWeight: "700" }]}>
                {t(`sosReason.${r}`)}
              </Text>
              {reason === r ? <Icon name="check" size={16} stroke={color.danger} /> : null}
            </Pressable>
          ))}
        </View>

        <View style={{ marginTop: space.md }}>
          <Field
            placeholder={t("mob.sos.notePh")}
            value={note}
            onChangeText={setNote}
            maxLength={300}
          />
        </View>

        {err ? <Notice tone="danger">{err}</Notice> : null}

        <View style={{ marginTop: space.md, gap: 8 }}>
          <Pressable
            onPress={() => void send({ reason, note: note.trim() || undefined })}
            disabled={busy}
            style={({ pressed }) => [s.send, pressed && { opacity: 0.9 }, busy && { opacity: 0.6 }]}
          >
            <Text style={s.sendText}>{busy ? t("mob.common.saving") : t("mob.sos.send")}</Text>
          </Pressable>
          <Button title={t("mob.common.cancel")} variant="ghost" onPress={() => setOpen(false)} />
        </View>
      </Sheet>
    </>
  );
}

const s = themed(() => ({
  btn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 13,
    borderRadius: radius.card,
    borderWidth: 1.5,
    borderColor: color.danger + "55",
    backgroundColor: color.dangerSoft,
  },
  btnText: { fontSize: 14.5, fontWeight: "800", color: color.danger },
  hint: { fontSize: 11, color: color.mutedForeground, textAlign: "center", marginTop: 6, lineHeight: 16 },

  lead: { fontSize: 13, color: color.mutedForeground, lineHeight: 19, marginBottom: space.md },
  label: { fontSize: 12, fontWeight: "700", color: color.mutedForeground, marginBottom: 8 },
  reason: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.card,
  },
  reasonOn: { borderColor: color.danger, backgroundColor: color.dangerSoft },
  reasonText: { fontSize: 14, fontWeight: "600", color: color.foreground },

  send: {
    height: 50,
    borderRadius: radius.control,
    backgroundColor: color.danger,
    alignItems: "center",
    justifyContent: "center",
  },
  sendText: { fontSize: 15, fontWeight: "800", color: "#fff" },

  active: {
    borderRadius: radius.card,
    borderWidth: 1.5,
    borderColor: color.danger,
    backgroundColor: color.dangerSoft,
    padding: space.md,
  },
  pulse: { width: 9, height: 9, borderRadius: 5, backgroundColor: color.danger },
  activeTitle: { fontSize: 12, fontWeight: "800", color: color.danger, letterSpacing: 0.3 },
  activeReason: { fontSize: 15.5, fontWeight: "700", color: color.foreground, marginTop: 6 },
  activeNote: { fontSize: 13, color: color.foreground, marginTop: 3, lineHeight: 19 },
  activePlace: { fontSize: 12, color: color.danger, fontWeight: "600" },
  err: { fontSize: 12.5, color: color.danger, marginTop: 8 },
  resolve: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    alignSelf: "flex-start",
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: color.card,
  },
  resolveText: { fontSize: 13, fontWeight: "700", color: color.success },
}));
