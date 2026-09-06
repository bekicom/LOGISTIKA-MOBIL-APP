/**
 * D5 — texnik nosozlik qayd etish.
 *
 * ── IKKI JOYDAN OCHILADI, EKRAN BITTA ───────────────────────────
 *
 * Reys ekranidan (yo'lda buzildi) va mashina kartasidan (garajda
 * ko'rindi). Nosozlik yo'lda bilinadi, shuning uchun reysdan ham
 * ochilishi SHART: haydovchi «Parkim» ni ochib mashinani izlashi
 * kerak bo'lsa, hech kim yozmaydi.
 *
 * Marshrutda mashina turadi (`/parkim/[id]/nosozlik`), reys esa
 * ixtiyoriy `trip` parametri bilan qo'shiladi — yozuv `VehicleIssue`
 * bo'lib parkga tushadi va `tripId` bilan o'sha reysga bog'lanadi.
 * Keyin «qaysi reysda buzildi» degan savolga javob bor.
 */
import { useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Text } from "@/components/Text";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Icon } from "@/components/Icon";
import { Button, Field, Header, Notice } from "@/components/ui";
import { apiUpload, FuramError } from "@/lib/api";
import { pickPhotos, takePhoto, toUpload, type Photo } from "@/lib/photo";
import { color, radius, shadow, space } from "@/lib/theme";
import { t } from "@/lib/i18n";

const PRESETS = ["p1", "p2", "p3", "p4", "p5", "p6", "p7", "p8"];

export default function Nosozlik() {
  /* `id` — MASHINA (marshrutdan), `trip` — ixtiyoriy reys */
  const { id, trip, plate } = useLocalSearchParams<{
    id: string;
    trip?: string;
    plate?: string;
  }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function send() {
    setBusy(true);
    setErr(null);
    try {
      await apiUpload(
        `/api/fleet/vehicles/${id}/tech`,
        { kind: "issue", title: title.trim(), tripId: trip, note: note.trim() || undefined },
        photo ? [toUpload(photo, "photo")] : [],
      );
      setDone(true);
    } catch (e) {
      setErr((e as FuramError).message ?? t("mob.common.failed"));
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <View style={s.root}>
        <Header title={t("mob.tech.title")} />
        <View style={s.doneWrap}>
          <View style={s.doneIcon}>
            <Icon name="check" size={30} stroke={color.success} />
          </View>
          <Text style={s.doneTitle}>{t("mob.tech.sent")}</Text>
          <Text style={s.doneText}>{t("mob.trip.techHint")}</Text>
          <View style={{ alignSelf: "stretch", marginTop: space.xl, gap: 9 }}>
            <Button
              title={t("mob.tech.again")}
              variant="secondary"
              onPress={() => {
                setTitle("");
                setNote("");
                setPhoto(null);
                setDone(false);
              }}
            />
            <Button title={t("mob.common.back")} onPress={() => router.back()} />
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={s.root}>
      <Header title={plate ? `${t("mob.tech.title")} · ${plate}` : t("mob.tech.title")} />
      <ScrollView
        contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + space.xxl }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={s.lead}>{t("mob.tech.lead")}</Text>

        <View style={s.chips}>
          {PRESETS.map((p) => {
            const label = t(`mob.tech.${p}`);
            const on = title === label;
            return (
              <Pressable key={p} onPress={() => setTitle(label)} style={[s.chip, on && s.chipOn]}>
                <Text style={[s.chipText, on && { color: "#fff" }]}>{label}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={s.card}>
          <Field
            label={t("mob.tech.what")}
            placeholder={t("mob.tech.whatPh")}
            value={title}
            onChangeText={setTitle}
            maxLength={120}
          />
          <Field
            placeholder={t("mob.tech.notePh")}
            value={note}
            onChangeText={setNote}
            maxLength={500}
            multiline
          />
        </View>

        {photo ? (
          <View style={s.photoBox}>
            <Image source={{ uri: photo.uri }} style={s.photo} resizeMode="cover" />
            <Pressable style={s.photoDrop} onPress={() => setPhoto(null)} hitSlop={8}>
              <Icon name="close" size={15} stroke="#fff" />
            </Pressable>
          </View>
        ) : (
          <View style={{ flexDirection: "row", gap: 9 }}>
            <Pressable
              style={s.pick}
              onPress={async () => {
                const r = await takePhoto();
                if (r[0]) setPhoto(r[0]);
              }}
            >
              <Icon name="image" size={18} stroke={color.mutedForeground} />
              <Text style={s.pickText}>{t("mob.tech.photo")}</Text>
            </Pressable>
            <Pressable
              style={s.pick}
              onPress={async () => {
                const r = await pickPhotos(1);
                if (r[0]) setPhoto(r[0]);
              }}
            >
              <Icon name="paperclip" size={18} stroke={color.mutedForeground} />
              <Text style={s.pickText}>{t("mob.common.add")}</Text>
            </Pressable>
          </View>
        )}

        {err ? <Notice tone="danger">{err}</Notice> : null}

        <Button
          title={t("mob.tech.send")}
          onPress={send}
          loading={busy}
          disabled={title.trim().length === 0}
        />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.background },
  scroll: { padding: space.lg, gap: space.md },
  lead: { fontSize: 13, color: color.mutedForeground, lineHeight: 19 },

  chips: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: color.muted,
  },
  chipOn: { backgroundColor: color.warning },
  chipText: { fontSize: 12.5, fontWeight: "700", color: color.mutedForeground },

  card: {
    backgroundColor: color.card,
    borderRadius: radius.card,
    padding: space.lg,
    gap: space.md,
    ...shadow.card,
  },

  pick: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 48,
    borderRadius: radius.control,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: color.border,
    backgroundColor: color.card,
  },
  pickText: { fontSize: 13, fontWeight: "700", color: color.mutedForeground },

  photoBox: { borderRadius: radius.card, overflow: "hidden", backgroundColor: color.muted },
  photo: { width: "100%", height: 190 },
  photoDrop: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#0f172acc",
    alignItems: "center",
    justifyContent: "center",
  },

  doneWrap: { alignItems: "center", paddingHorizontal: space.xl, paddingTop: space.xxl },
  doneIcon: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: color.successSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  doneTitle: { fontSize: 20, fontWeight: "800", color: color.foreground, marginTop: 18 },
  doneText: {
    fontSize: 14,
    color: color.mutedForeground,
    marginTop: 8,
    textAlign: "center",
    lineHeight: 20,
  },
});
