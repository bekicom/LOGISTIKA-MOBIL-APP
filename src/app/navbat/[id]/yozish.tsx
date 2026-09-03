/**
 * J3 — navbatni yozib qo'yish.
 *
 * FAQAT SANA VA VAQT MAJBURIY. Haydovchi buni chegara oldida,
 * tirbandlikda yozadi — maydon ko'p bo'lsa umuman yozmay qo'yadi.
 * Server ham shu tartibda: `slotAt` siz `NO_SLOT` beradi, qolgani
 * ixtiyoriy.
 *
 * VAQT MINTAQAGA O'GIRILMAYDI. Baza `timeText` maydonida yozilganini
 * o'zini saqlaydi: «09:00» chegarada ham «09:00» bo'lishi kerak,
 * UTC ga o'girilib sakramasligi.
 */
import { useState } from "react";
import {
  Alert, KeyboardAvoidingView, Platform, Pressable,
  ScrollView, StyleSheet, Text, View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Button, Field, Header } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { api, FuramError } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { t } from "@/lib/i18n";
import { color, font, radius, space } from "@/lib/theme";

type Detail = {
  queue: {
    id: string; border: string; plate: string; leadDays: number;
    slotAt: string | null; timeText: string | null;
    queueNo: string | null; ticketNo: string | null; note: string | null;
    trip: { furamNo: number } | null;
  };
};

/** `2026-09-05` — sanani kalendarsiz, matn bilan olamiz */
function isoDay(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function NavbatYozish() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data } = useApi<Detail>(id ? `/api/queues/${id}` : null, [id]);
  const q = data?.queue;

  const [day, setDay] = useState("");
  const [time, setTime] = useState("");
  const [queueNo, setQueueNo] = useState("");
  const [ticketNo, setTicketNo] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  // Mavjud qiymatlar bir marta to'ldiriladi — tahrirlashda yo'qolmasin
  const [seeded, setSeeded] = useState(false);
  if (q && !seeded) {
    setSeeded(true);
    if (q.slotAt) setDay(isoDay(new Date(q.slotAt)));
    if (q.timeText) setTime(q.timeText);
    if (q.queueNo) setQueueNo(q.queueNo);
    if (q.ticketNo) setTicketNo(q.ticketNo);
    if (q.note) setNote(q.note);
  }

  const ready = /^\d{4}-\d{2}-\d{2}$/.test(day.trim()) && time.trim().length >= 4;

  async function save() {
    setBusy(true);
    setErr("");
    try {
      await api(`/api/queues/${id}`, {
        method: "PATCH",
        body: {
          action: "update",
          /* Sana serverga ISO bo'lib ketadi, VAQT esa matn bo'lib —
             ikkalasi alohida maydon. Vaqtni sanaga qo'shib yuborsak
             mintaqa o'girishi uni sakratib yuborardi. */
          slotAt: new Date(`${day.trim()}T00:00:00`).toISOString(),
          timeText: time.trim(),
          queueNo: queueNo.trim() || null,
          ticketNo: ticketNo.trim() || null,
          note: note.trim() || null,
        },
      });
      router.back();
    } catch (e) {
      const error = e as FuramError;
      setErr(error.code === "NO_SLOT" ? t("mob.queue.noSlot") : (error.message ?? t("mob.common.tryAgain")));
    } finally {
      setBusy(false);
    }
  }

  async function notNeeded() {
    Alert.alert(t("mob.queue.notNeededHere"), t("mob.queue.condHint"), [
      { text: t("mob.common.cancel"), style: "cancel" },
      {
        text: t("mob.queue.notNeeded"),
        style: "destructive",
        onPress: async () => {
          setBusy(true);
          try {
            await api(`/api/queues/${id}`, {
              method: "PATCH",
              body: { action: "answer", answer: "NOT_NEEDED" },
            });
            router.back();
          } catch (e) {
            Alert.alert(t("mob.queue.saveFailed"), (e as FuramError).message ?? t("mob.common.tryAgain"));
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  }

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Header title={t("mob.queue.recordTitle")} subtitle={q?.border} />

      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        {/* Sana va vaqt — yonma-yon, ikkalasi majburiy */}
        <View>
          <Text style={s.label}>{t("mob.queue.whenSlot")}</Text>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <View style={{ flex: 1.5 }}>
              <Field
                value={day}
                onChangeText={setDay}
                placeholder="2026-09-05"
                keyboardType="numbers-and-punctuation"
                maxLength={10}
                left={<Icon name="clock" size={17} stroke="#94a3b8" />}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Field
                value={time}
                onChangeText={setTime}
                placeholder="09:00"
                keyboardType="numbers-and-punctuation"
                maxLength={5}
              />
            </View>
          </View>
          <Text style={s.hint}>{t("mob.queue.timeHint")}</Text>
        </View>

        <Field
          label={t("mob.queue.queueNo")}
          value={queueNo}
          onChangeText={setQueueNo}
          placeholder="TM-1180"
          autoCapitalize="characters"
        />

        <Field
          label={t("mob.queue.ticketNo")}
          hint={t("mob.common.optional")}
          value={ticketNo}
          onChangeText={setTicketNo}
          placeholder="88-201934"
          autoCapitalize="characters"
        />

        <Field
          label={t("mob.exp.note")}
          hint={t("mob.common.optional")}
          value={note}
          onChangeText={setNote}
          placeholder={t("mob.queue.notePh")}
          multiline
          style={{ minHeight: 72, textAlignVertical: "top", paddingTop: 4 }}
        />

        {/* Reysga ta'siri — yashirilmaydi */}
        {q?.trip ? (
          <View style={s.warn}>
            <Icon name="alert" size={17} stroke={color.warning} />
            <Text style={s.warnText}>{t("mob.queue.tripWarn")}</Text>
          </View>
        ) : null}

        {err ? <Text style={s.err}>{err}</Text> : null}

        <View style={{ gap: space.md }}>
          <Button title={t("mob.common.save")} onPress={save} loading={busy} disabled={!ready} />
          <Pressable
            onPress={busy ? undefined : notNeeded}
            style={({ pressed }) => [s.deny, pressed && { backgroundColor: color.danger + "0d" }]}
          >
            <Text style={s.denyText}>{t("mob.queue.notNeededHere")}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.card },
  scroll: { padding: space.xl, gap: space.xl, paddingBottom: space.xxl * 2 },

  label: { fontSize: font.caption, fontWeight: "500", color: color.foreground, marginBottom: 6 },
  hint: { fontSize: 12, color: color.mutedForeground, marginTop: 6, lineHeight: 18 },
  err: { fontSize: font.caption, color: color.danger },

  warn: {
    flexDirection: "row", gap: 10, padding: 13,
    borderWidth: 1, borderColor: color.warning + "59", backgroundColor: color.warning + "0f",
    borderRadius: radius.card,
  },
  warnText: { flex: 1, fontSize: 12, color: "#92400e", lineHeight: 18 },

  deny: {
    height: 52, borderRadius: radius.control, borderWidth: 1,
    borderColor: color.danger + "59", alignItems: "center", justifyContent: "center",
  },
  denyText: { fontSize: font.body, fontWeight: "600", color: color.danger },
});
