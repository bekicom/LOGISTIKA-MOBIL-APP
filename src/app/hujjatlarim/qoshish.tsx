/**
 * H2 — hujjat qo'shish.
 *
 * SURAT BIRINCHI VA ENG KATTA. Hujjat — bu rasm, raqam emas:
 * chegarada asl nusxa so'raladi, ilovada nusxa turadi. Raqam va
 * muddat ixtiyoriy — majburiy qilinsa odam surat yuklab, qolganini
 * tashlab ketardi.
 *
 * «Muddatsiz» kaliti bor, chunki pasportning muddati bo'lmasligi
 * mumkin. Usiz odam bo'sh maydonni tashlab ketardi va eslatma
 * tizimi buni «kiritilmagan» deb hisoblardi.
 */
import { useState } from "react";
import {
  Image, KeyboardAvoidingView, Platform, Pressable,
  ScrollView, StyleSheet, Text, View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Button, Field, Header } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { apiUpload, FuramError } from "@/lib/api";
import { pickPhotos, takePhoto, toUpload, type Photo } from "@/lib/photo";
import { t } from "@/lib/i18n";
import { color, font, radius, space } from "@/lib/theme";

/** `personal-docs.ts` dagi PERSONAL_KINDS bilan bir xil to'plam */
const KINDS = ["LICENSE", "PASSPORT", "MEDICAL", "ADR", "VISA", "OTHER"] as const;
/** Prava toifalari — `driver-link.ts` dagi LICENSE_CLASSES */
const CLASSES = ["B", "C", "CE", "D", "DE"] as const;

export default function HujjatQoshish() {
  const router = useRouter();
  const params = useLocalSearchParams<{ kind?: string }>();

  const [photo, setPhoto] = useState<Photo | null>(null);
  // Ro'yxatdagi bo'sh o'rindan kelinsa tur oldindan tanlangan bo'ladi
  const [kind, setKind] = useState<string>(
    params.kind && (KINDS as readonly string[]).includes(params.kind) ? params.kind : "LICENSE",
  );
  const [number, setNumber] = useState("");
  const [expires, setExpires] = useState("");
  const [forever, setForever] = useState(false);
  const [classes, setClasses] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const ready = !!photo;

  async function camera() {
    const list = await takePhoto();
    if (list[0]) setPhoto(list[0]);
  }
  async function gallery() {
    const list = await pickPhotos(1);
    if (list[0]) setPhoto(list[0]);
  }

  function toggleClass(c: string) {
    setClasses((v) => (v.includes(c) ? v.filter((x) => x !== c) : [...v, c]));
  }

  async function save() {
    if (!photo) {
      setErr(t("mob.pdoc.needPhoto"));
      return;
    }
    setBusy(true);
    setErr("");
    try {
      await apiUpload(
        "/api/documents",
        {
          kind,
          number: number.trim() || undefined,
          // «Muddatsiz» yoqilsa sana YUBORILMAYDI — eslatma ham bo'lmaydi
          expiresAt: forever ? undefined : expires.trim() || undefined,
          /* Toifa hujjat nomiga qo'shiladi: `Document` da alohida
             maydon yo'q va uni faqat shu yerda ishlatish uchun
             sxemani o'zgartirish ortiqcha bo'lardi. */
          name:
            kind === "LICENSE" && classes.length
              ? `${t(`mob.pdocKind.${kind}`)} · ${classes.join(", ")}`
              : t(`mob.pdocKind.${kind}`),
        },
        [toUpload(photo, "file")],
      );
      router.back();
    } catch (e) {
      setErr((e as FuramError).message ?? t("mob.pdoc.uploadFailed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Header
        title={t("mob.pdoc.addTitle")}
        right={
          <Text
            onPress={busy || !ready ? undefined : save}
            style={[s.save, (busy || !ready) && { color: color.mutedForeground }]}
          >
            {busy ? "..." : t("mob.common.save")}
          </Text>
        }
      />

      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        {/* Surat — birinchi va eng katta */}
        <View>
          <Text style={s.label}>{t("mob.pdoc.photo")}</Text>
          {photo ? (
            <Pressable onPress={camera} style={s.preview}>
              <Image source={{ uri: photo.uri }} style={s.previewImg} resizeMode="cover" />
            </Pressable>
          ) : (
            <View style={s.drop}>
              <View style={s.dropIcon}>
                <Icon name="doc" size={26} stroke={color.brand} />
              </View>
              <Text style={s.dropTitle}>{t("mob.pdoc.takePhoto")}</Text>
              <Text style={s.dropText}>{t("mob.pdoc.photoHint")}</Text>
            </View>
          )}
          <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
            <Pressable onPress={camera} style={({ pressed }) => [s.camBtn, pressed && { opacity: 0.8 }]}>
              <Icon name="doc" size={17} stroke="#fff" />
              <Text style={s.camText}>{t("mob.chat.camera")}</Text>
            </Pressable>
            <Pressable onPress={gallery} style={({ pressed }) => [s.galBtn, pressed && { backgroundColor: color.muted }]}>
              <Icon name="package" size={17} stroke="#475569" />
              <Text style={s.galText}>{t("mob.chat.gallery")}</Text>
            </Pressable>
          </View>
        </View>

        {/* Turi */}
        <View>
          <Text style={s.label}>{t("mob.pdoc.whichKind")}</Text>
          <View style={s.kinds}>
            {KINDS.map((k) => {
              const on = kind === k;
              return (
                <Pressable
                  key={k}
                  onPress={() => setKind(k)}
                  style={({ pressed }) => [s.kind, on && s.kindOn, pressed && !on && { backgroundColor: color.muted }]}
                >
                  <Icon name="doc" size={20} stroke={on ? color.brand : "#475569"} />
                  <Text style={[s.kindText, on && { color: color.brand }]} numberOfLines={1}>
                    {t(`mob.pdocShort.${k}`)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <Field
          label={t("mob.pdoc.docNumber")}
          hint={t("mob.common.optional")}
          value={number}
          onChangeText={setNumber}
          placeholder="AB 1234567"
          autoCapitalize="characters"
        />

        {/* Muddat */}
        <View>
          <Text style={s.label}>{t("mob.pdoc.validUntil")}</Text>
          <Field
            value={forever ? "" : expires}
            onChangeText={setExpires}
            placeholder="2029-04-18"
            keyboardType="numbers-and-punctuation"
            maxLength={10}
            editable={!forever}
            style={forever ? { color: color.mutedForeground } : undefined}
            left={<Icon name="clock" size={17} stroke="#94a3b8" />}
          />
          <Pressable
            onPress={() => setForever((v) => !v)}
            style={({ pressed }) => [s.foreverRow, pressed && { backgroundColor: color.muted }]}
          >
            <Text style={s.foreverText}>{t("mob.pdoc.noExpiry")}</Text>
            <View style={[s.sw, forever && { backgroundColor: color.brand }]}>
              <View style={[s.swDot, forever && { marginLeft: "auto" }]} />
            </View>
          </Pressable>
          <Text style={s.hint}>{t("mob.pdoc.expiryHint")}</Text>
        </View>

        {/* Toifalar — faqat pravada */}
        {kind === "LICENSE" ? (
          <View>
            <Text style={s.label}>{t("mob.pdoc.classes")}</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 7 }}>
              {CLASSES.map((c) => {
                const on = classes.includes(c);
                return (
                  <Pressable
                    key={c}
                    onPress={() => toggleClass(c)}
                    style={({ pressed }) => [s.cls, on && s.clsOn, pressed && { opacity: 0.7 }]}
                  >
                    <Text style={[s.clsText, on && { color: "#fff", fontWeight: "700" }]}>{c}</Text>
                  </Pressable>
                );
              })}
            </View>
            <Text style={s.hint}>{t("mob.pdoc.classesHint")}</Text>
          </View>
        ) : null}

        {/* Maxfiylik — yashirilmaydi */}
        <View style={s.privacy}>
          <Icon name="check" size={18} stroke="#475569" />
          <Text style={s.privacyText}>{t("mob.pdoc.privacyNote")}</Text>
        </View>

        {err ? <Text style={s.err}>{err}</Text> : null}

        <View>
          <Button title={t("mob.common.save")} onPress={save} loading={busy} disabled={!ready} />
          {!ready ? <Text style={s.foot}>{t("mob.pdoc.photoFirst")}</Text> : null}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.card },
  scroll: { padding: space.xl, gap: space.xl, paddingBottom: space.xxl * 2 },
  save: { fontSize: font.bodyLg, fontWeight: "600", color: color.brand },
  label: { fontSize: font.caption, fontWeight: "500", color: color.foreground, marginBottom: 6 },
  hint: { fontSize: 12, color: color.mutedForeground, marginTop: 8, lineHeight: 18 },
  err: { fontSize: font.caption, color: color.danger },
  foot: { textAlign: "center", fontSize: 12, color: "#94a3b8", marginTop: 10 },

  drop: {
    height: 200, borderRadius: 12, borderWidth: 1, borderStyle: "dashed",
    borderColor: "#cbd5e1", backgroundColor: "#f8fafc",
    alignItems: "center", justifyContent: "center", gap: 12, paddingHorizontal: 24,
  },
  dropIcon: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: color.brand + "1f",
    alignItems: "center", justifyContent: "center",
  },
  dropTitle: { fontSize: 14, fontWeight: "600", color: color.foreground },
  dropText: { fontSize: 12, color: color.mutedForeground, textAlign: "center", lineHeight: 18 },

  preview: { height: 200, borderRadius: 12, overflow: "hidden", backgroundColor: color.muted },
  previewImg: { width: "100%", height: "100%" },

  camBtn: {
    flex: 1, height: 44, borderRadius: radius.control, backgroundColor: color.brand,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7,
  },
  camText: { fontSize: 14, fontWeight: "600", color: "#fff" },
  galBtn: {
    flex: 1, height: 44, borderRadius: radius.control, borderWidth: 1, borderColor: color.border,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7,
  },
  galText: { fontSize: 14, fontWeight: "600", color: "#475569" },

  kinds: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  kind: {
    width: "31.5%", height: 76, borderRadius: 10, borderWidth: 1, borderColor: color.border,
    backgroundColor: color.card, alignItems: "center", justifyContent: "center", gap: 6, paddingHorizontal: 4,
  },
  kindOn: { borderColor: color.brand, borderWidth: 2, backgroundColor: color.brand + "0d" },
  kindText: { fontSize: 11, fontWeight: "600", color: "#475569", textAlign: "center" },

  foreverRow: {
    flexDirection: "row", alignItems: "center", gap: 10, marginTop: 12,
    padding: 13, borderRadius: radius.control, borderWidth: 1, borderColor: color.border,
    backgroundColor: "#f8fafc",
  },
  foreverText: { flex: 1, fontSize: font.caption, color: color.foreground },
  sw: { width: 42, height: 25, borderRadius: 13, backgroundColor: color.border, padding: 3 },
  swDot: { width: 19, height: 19, borderRadius: 10, backgroundColor: "#fff" },

  cls: {
    height: 36, minWidth: 46, paddingHorizontal: 14, borderRadius: radius.control,
    borderWidth: 1, borderColor: color.border, alignItems: "center", justifyContent: "center",
  },
  clsOn: { backgroundColor: color.navy, borderColor: color.navy },
  clsText: { fontSize: 14, fontWeight: "600", color: color.mutedForeground },

  privacy: {
    flexDirection: "row", gap: 11, padding: 14,
    borderWidth: 1, borderColor: "#cbd5e1", backgroundColor: "#f8fafc", borderRadius: radius.card,
  },
  privacyText: { flex: 1, fontSize: 12, color: "#475569", lineHeight: 19 },
});
