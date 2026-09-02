/**
 * E3 — holatni tasdiqlash.
 *
 * Bosqichni oldinga surishdan oldin so'raladi: surat, izoh. Joylashuv
 * serverda oxirgi GPS nuqtasidan olinadi — bu yerda so'ralmaydi.
 *
 * Ba'zi bosqichlarda surat MAJBURIY: «yuklandi» va «tushirildi» — keyin
 * nizo chiqsa dalil shu bo'ladi.
 */
import { useState } from "react";
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon } from "./Icon";
import { Button, Notice } from "./ui";
import { api, apiUpload, FuramError } from "@/lib/api";
import { pickPhotos, takePhoto, toUpload, type Photo } from "@/lib/photo";
import { color, font, radius, space } from "@/lib/theme";

/** Qaysi bosqichda surat majburiy */
const NEEDS_PHOTO = new Set(["LOADED", "UNLOADED"]);

const TITLES: Record<string, { title: string; note: string }> = {
  TO_LOADING: { title: "Yuklashga yo'l oldingizmi?", note: "Yuk egasi va dispetcher xabardor bo'ladi." },
  LOADED: { title: "Yuk yuklanganini tasdiqlang", note: "Surat majburiy — keyin nizo chiqsa dalil bo'ladi." },
  ON_ROAD: { title: "Yo'lga chiqdingizmi?", note: "Shu paytdan kuzatuv boshlanadi." },
  AT_BORDER: { title: "Chegaraga yetdingizmi?", note: "Navbat vaqti hisoblana boshlaydi." },
  NEAR_DESTINATION: { title: "Manzilga yaqinlashdingizmi?", note: "Qabul qiluvchi tayyorlanadi." },
  UNLOADED: { title: "Yuk tushirilganini tasdiqlang", note: "Surat majburiy — hisob-kitob shunga tayanadi." },
  CLOSING: { title: "Reysni yopishga o'tasizmi?", note: "Hujjat va xarajatlar tekshiriladi." },
};

export function HolatSheet({
  open, tripId, next, onClose, onDone,
}: {
  open: boolean;
  tripId: string;
  /** Qaysi holatga o'tilyapti */
  next: string | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const insets = useSafeAreaInsets();

  const meta = next ? TITLES[next] : null;
  const mustPhoto = next ? NEEDS_PHOTO.has(next) : false;
  const ready = !mustPhoto || photos.length > 0;

  function reset() {
    setPhotos([]);
    setNote("");
    setErr(null);
  }

  async function add(from: "camera" | "gallery") {
    const got = from === "camera" ? await takePhoto() : await pickPhotos(4);
    if (got.length === 0) return;
    setPhotos((p) => [...p, ...got].slice(0, 4));
  }

  async function submit() {
    if (!next) return;
    setErr(null);
    setBusy(true);
    try {
      // Avval holat — asosiy ish shu, surat ikkinchi darajali
      await api(`/api/trips/${tripId}/status`, { method: "POST", body: { status: next } });

      /* Suratlar hujjat sifatida biriktiriladi. Bittasi yuborilmasa ham
         holat allaqachon o'zgargan — foydalanuvchi qaytadan bosmasin
         uchun xato ko'rsatilmaydi, faqat qolganlari yuboriladi. */
      for (const p of photos) {
        await apiUpload(`/api/trips/${tripId}/documents`, {
          kind: next === "UNLOADED" ? "UNLOAD_PHOTO" : "OTHER",
        }, [toUpload(p, "file")]).catch(() => null);
      }

      reset();
      onDone();
    } catch (e) {
      setErr((e as FuramError).message ?? "Holat o'zgartirilmadi");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal visible={open} animationType="slide" transparent onRequestClose={onClose}>
      <View style={s.backdrop}>
        <View style={s.sheet}>
          <View style={s.grabber} />

          <ScrollView contentContainerStyle={s.body} showsVerticalScrollIndicator={false}>
            <Text style={s.title}>{meta?.title ?? "Holatni o'zgartirish"}</Text>
            {meta?.note ? <Text style={s.sub}>{meta.note}</Text> : null}

            {/* Suratlar */}
            <View style={s.section}>
              <View style={s.sectionHead}>
                <Text style={s.label}>Surat</Text>
                <Text style={mustPhoto ? s.required : s.optional}>
                  {mustPhoto ? "Majburiy" : "Ixtiyoriy"}
                </Text>
              </View>

              <View style={s.photos}>
                {photos.map((p, i) => (
                  <View key={p.uri} style={s.thumb}>
                    <Image source={{ uri: p.uri }} style={s.thumbImg} />
                    <Pressable
                      style={s.remove}
                      hitSlop={8}
                      onPress={() => setPhotos((v) => v.filter((_, k) => k !== i))}
                    >
                      <Icon name="close" size={11} stroke="#fff" />
                    </Pressable>
                  </View>
                ))}

                {photos.length < 4 ? (
                  <>
                    <Pressable style={s.add} onPress={() => add("camera")}>
                      <Icon name="doc" size={20} />
                      <Text style={s.addText}>Suratga olish</Text>
                    </Pressable>
                    <Pressable style={s.add} onPress={() => add("gallery")}>
                      <Icon name="package" size={20} />
                      <Text style={s.addText}>Galereya</Text>
                    </Pressable>
                  </>
                ) : null}
              </View>
            </View>

            {/* Izoh */}
            <View style={s.section}>
              <Text style={s.label}>
                Izoh <Text style={s.optional}>— ixtiyoriy</Text>
              </Text>
              <TextInput
                value={note}
                onChangeText={setNote}
                placeholder="Masalan: 2 palet kam yuklandi, akt tuzildi"
                placeholderTextColor="#94a3b8"
                multiline
                style={s.note}
              />
            </View>

            {err ? (
              <View style={{ marginTop: space.lg }}>
                <Notice tone="danger">{err}</Notice>
              </View>
            ) : null}
          </ScrollView>

          <View style={[s.foot, { paddingBottom: insets.bottom + space.lg }]}>
            <Button title="Tasdiqlash" onPress={submit} loading={busy} disabled={!ready} />
            {!ready ? <Text style={s.hint}>Davom etish uchun surat oling</Text> : null}
            <Pressable
              onPress={() => {
                reset();
                onClose();
              }}
              style={s.cancel}
            >
              <Text style={s.cancelText}>Bekor qilish</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(15,23,42,0.45)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: color.card,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    maxHeight: "88%",
  },
  grabber: { width: 38, height: 4, borderRadius: 2, backgroundColor: "#cbd5e1", alignSelf: "center", marginTop: 10 },

  body: { padding: space.xl, paddingTop: space.lg },
  title: { fontSize: 20, fontWeight: "700", color: color.foreground, letterSpacing: -0.2 },
  sub: { fontSize: font.caption, color: color.mutedForeground, marginTop: 5, lineHeight: 20 },

  section: { marginTop: space.xl },
  sectionHead: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", marginBottom: 9 },
  label: { fontSize: font.caption, fontWeight: "600", color: color.foreground },
  required: { fontSize: 12, fontWeight: "500", color: color.danger },
  optional: { fontSize: 12, fontWeight: "400", color: color.mutedForeground },

  photos: { flexDirection: "row", flexWrap: "wrap", gap: 9 },
  thumb: { width: 78, height: 78, borderRadius: radius.control, overflow: "hidden", backgroundColor: color.muted },
  thumbImg: { width: "100%", height: "100%" },
  remove: {
    position: "absolute", right: 4, top: 4, width: 18, height: 18, borderRadius: 9,
    backgroundColor: "rgba(15,23,42,0.6)", alignItems: "center", justifyContent: "center",
  },
  add: {
    width: 78, height: 78, borderRadius: radius.control, borderWidth: 1.5,
    borderColor: "#cbd5e1", borderStyle: "dashed", alignItems: "center", justifyContent: "center", gap: 4,
  },
  addText: { fontSize: 10, fontWeight: "500", color: color.mutedForeground, textAlign: "center" },

  note: {
    minHeight: 78, borderWidth: 1, borderColor: color.border, borderRadius: radius.control,
    padding: 14, fontSize: font.body, color: color.foreground, textAlignVertical: "top",
  },

  foot: { paddingHorizontal: space.xl, paddingTop: 14, borderTopWidth: 1, borderTopColor: color.border, gap: 4 },
  hint: { fontSize: 12, color: color.mutedForeground, textAlign: "center", marginTop: 6 },
  cancel: { height: 48, alignItems: "center", justifyContent: "center" },
  cancelText: { fontSize: font.body, fontWeight: "600", color: color.mutedForeground },
});
