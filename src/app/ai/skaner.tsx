/**
 * K3 — hujjatni skanerlash.
 *
 * Uchta qaror dizayndan:
 *
 *  1. ROZILIK OCHIQ SO'RALADI. Surat chet el serveriga (OpenAI) ketadi.
 *     Buni yashirib qo'ysak, keyin bilib qolgan odam ilovaga umuman
 *     ishonmay qoladi. Server ham `consent` maydonini alohida
 *     tekshiradi — himoya faqat interfeysga tayanmaydi.
 *  2. NATIJA BAZAGA O'ZI YOZILMAYDI. Maydonlar formaga to'ldiriladi,
 *     odam ko'rib tasdiqlaydi. AI xato o'qishi mumkin, pasport raqami
 *     esa keyin chegarada ishlatiladi.
 *  3. ISHONCHI PAST MAYDON AJRATIB KO'RSATILADI. Hammasini bir xil
 *     chizsak, odam hech nimani tekshirmasdan «Saqlash» bosadi.
 */
import { useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Button, Header } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { apiUpload, FuramError } from "@/lib/api";
import { pickPhotos, takePhoto, toUpload, type Photo } from "@/lib/photo";
import { t } from "@/lib/i18n";
import { color, font, radius, space } from "@/lib/theme";

/** Skaner qo'llab-quvvatlaydigan shaxsiy hujjatlar */
const KINDS = [
  { scan: "passport", doc: "PASSPORT" },
  { scan: "license", doc: "LICENSE" },
] as const;

/** `driver-link.ts` dagi LICENSE_CLASSES */
const CLASSES = ["B", "C", "CE", "D", "DE"] as const;

type Fields = {
  surname?: string | null;
  givenNames?: string | null;
  documentNo?: string | null;
  birthDate?: string | null;
  expiryDate?: string | null;
  nationality?: string | null;
  classes?: string[];
};

type Scan = {
  verified: boolean;
  source: string;
  noteCode?: string;
  fields: Fields;
  issues?: { code: string; params?: Record<string, number | string>; level: string }[];
};

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const str = (v: unknown) => (typeof v === "string" ? v : "");

export default function Skaner() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [kind, setKind] = useState<string>("PASSPORT");
  const [consent, setConsent] = useState(false);
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [scan, setScan] = useState<Scan | null>(null);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  // Tahrirlanadigan nusxa — skaner o'qigani boshlang'ich qiymat
  const [name, setName] = useState("");
  const [docNo, setDocNo] = useState("");
  const [birth, setBirth] = useState("");
  const [expiry, setExpiry] = useState("");
  const [classes, setClasses] = useState<string[]>([]);

  const scanKind = KINDS.find((k) => k.doc === kind)?.scan ?? "passport";

  /** Rozilik olingandan keyin: surat → server → maydonlar */
  async function run(from: "camera" | "gallery") {
    setConsent(false);
    const list = from === "camera" ? await takePhoto() : await pickPhotos(1);
    const p = list[0];
    if (!p) return;

    setPhoto(p);
    setScan(null);
    setErr("");
    setBusy(true);
    try {
      const r = await apiUpload<Scan>(
        "/api/ai/scan-document",
        // Rozilik shu yerda ham yuboriladi — server ikkinchi marta tekshiradi
        { kind: scanKind, consent: "true" },
        [toUpload(p, "photo")],
      );
      setScan(r);
      // MRZ familiya va ismni alohida beradi — ekranda bitta qator
      setName([str(r.fields.surname), str(r.fields.givenNames)].filter(Boolean).join(" "));
      setDocNo(str(r.fields.documentNo));
      setBirth(str(r.fields.birthDate));
      setExpiry(str(r.fields.expiryDate));
      setClasses(Array.isArray(r.fields.classes) ? r.fields.classes : []);
    } catch (e) {
      setErr((e as FuramError).message || t("mob.ai.scanFailed"));
    } finally {
      setBusy(false);
    }
  }

  /** Tekshirilgandan keyin — odatdagi hujjat sifatida saqlanadi */
  async function save() {
    if (!photo) return;
    setSaving(true);
    setErr("");
    try {
      await apiUpload(
        "/api/documents",
        {
          kind,
          number: docNo || undefined,
          expiresAt: DATE.test(expiry) ? expiry : undefined,
          name:
            kind === "LICENSE" && classes.length
              ? `${t(`mob.pdocKind.${kind}`)} · ${classes.join(", ")}`
              : t(`mob.pdocKind.${kind}`),
        },
        [toUpload(photo, "file")],
      );
      router.replace("/hujjatlarim");
    } catch (e) {
      setErr((e as FuramError).message || t("mob.ai.scanFailed"));
      setSaving(false);
    }
  }

  /* Ishonchi past maydon — QOIDA ASOSIDA, taxmin bilan emas:
     bo'sh qolgan, sanasi o'qilmagan yoki muddati o'tgan maydon. */
  const flag = {
    name: !name.trim(),
    docNo: !docNo.trim(),
    birth: !!birth && !DATE.test(birth),
    expiry: !expiry.trim() || !DATE.test(expiry) || new Date(expiry) < new Date(),
  };


  return (
    <KeyboardAvoidingView
      style={s.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Header
        title={t("mob.ai.scanTitle")}
        subtitle={
          scan
            ? `${t(`mob.pdocKind.${kind}`)} · ${t("mob.ai.step2")}`
            : t(`mob.pdocKind.${kind}`)
        }
      />

      <ScrollView contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 40 }]}>
        {!scan ? (
          <>
            {/* Qaysi hujjat */}
            <View>
              <Text style={s.label}>{t("mob.ai.scanWhich")}</Text>
              <View style={s.kinds}>
                {KINDS.map((k) => {
                  const on = kind === k.doc;
                  return (
                    <Pressable
                      key={k.doc}
                      onPress={() => setKind(k.doc)}
                      accessibilityRole="button"
                      style={({ pressed }) => [
                        s.kind,
                        on ? s.kindOn : null,
                        pressed && !on ? { backgroundColor: color.muted } : null,
                      ]}
                    >
                      <Text style={[s.kindText, on ? { color: color.brand } : null]}>
                        {t(`mob.pdocKind.${k.doc}`)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {photo ? (
              <Image source={{ uri: photo.uri }} style={s.shot} resizeMode="cover" />
            ) : null}

            {err ? (
              <View style={s.err}>
                <Icon name="alert" size={16} stroke={color.danger} />
                <Text style={s.errText}>{err}</Text>
              </View>
            ) : null}

            <Button
              title={busy ? t("mob.ai.scanning") : t("mob.ai.scanStart")}
              loading={busy}
              onPress={() => setConsent(true)}
            />
            <Pressable onPress={() => router.replace("/hujjatlarim/qoshish")}>
              <Text style={s.manual}>{t("mob.ai.fillManually")}</Text>
            </Pressable>

            <View style={s.info}>
              <Icon name="alert" size={17} stroke="#475569" />
              <Text style={s.infoText}>{t("mob.ai.scanIntro")}</Text>
            </View>
          </>
        ) : (
          <>
            {/* Surat — solishtirish uchun ko'z oldida turadi */}
            {photo ? (
              <View>
                <Image source={{ uri: photo.uri }} style={s.shot} resizeMode="cover" />
                <Pressable style={s.again} onPress={() => setConsent(true)}>
                  <Text style={s.againText}>{t("mob.ai.retake")}</Text>
                </Pressable>
              </View>
            ) : null}

            {scan.verified ? (
              <View style={[s.banner, s.bannerOk]}>
                <Icon name="check" size={19} stroke={color.success} />
                <View style={s.grow}>
                  <Text style={s.bannerTitleOk}>{t("mob.ai.verified")}</Text>
                  <Text style={s.bannerTextOk}>{t("mob.ai.verifiedText")}</Text>
                </View>
              </View>
            ) : (
              <View style={[s.banner, s.bannerWarn]}>
                <Icon name="alert" size={19} stroke={color.warning} />
                <View style={s.grow}>
                  <Text style={s.bannerTitleWarn}>{t("mob.ai.unverified")}</Text>
                  <Text style={s.bannerTextWarn}>
                    {t(`mob.scanNote.${scan.noteCode ?? "UNVERIFIED"}`)}
                  </Text>
                </View>
              </View>
            )}

            {/* O'qilgan ma'lumot — TAHRIRLANADI */}
            <View style={s.card}>
              <Text style={s.cardTitle}>{t("mob.ai.readFields")}</Text>

              <Line
                label={t("mob.ai.fullName")}
                value={name}
                onChange={setName}
                warn={flag.name}
                autoCapitalize="characters"
              />
              <Line
                label={t("mob.ai.fDocNo")}
                value={docNo}
                onChange={setDocNo}
                warn={flag.docNo}
                autoCapitalize="characters"
              />
              <Line
                label={t("mob.ai.birthDate")}
                value={birth}
                onChange={setBirth}
                warn={flag.birth}
                placeholder="YYYY-MM-DD"
                keyboardType="numbers-and-punctuation"
              />
              <Line
                label={t("mob.ai.fExpiry")}
                value={expiry}
                onChange={setExpiry}
                warn={flag.expiry}
                placeholder="YYYY-MM-DD"
                keyboardType="numbers-and-punctuation"
              />

              {kind === "LICENSE" ? (
                <View>
                  <Text style={s.fLabel}>{t("mob.ai.fClasses")}</Text>
                  <View style={s.chips}>
                    {CLASSES.map((c) => {
                      const on = classes.includes(c);
                      return (
                        <Pressable
                          key={c}
                          onPress={() =>
                            setClasses((old) =>
                              on ? old.filter((x) => x !== c) : [...old, c],
                            )
                          }
                          accessibilityRole="button"
                          style={[s.chip, on ? s.chipOn : null]}
                        >
                          <Text style={[s.chipText, on ? { color: "#fff" } : null]}>{c}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              ) : null}
            </View>

            {/* Qoida asosidagi kamchiliklar (server) */}
            {scan.issues?.length ? (
              <View style={s.card}>
                <Text style={s.cardTitle}>{t("mob.ai.issues")}</Text>
                {scan.issues.map((it, i) => (
                  <View key={i} style={s.issue}>
                    <Icon
                      name="alert"
                      size={15}
                      stroke={it.level === "warn" ? color.warning : "#475569"}
                    />
                    <Text style={s.issueText}>
                      {t(`mob.scanIssue.${it.code}`, it.params ?? {})}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}

            <View style={s.info}>
              <Icon name="alert" size={17} stroke="#475569" />
              <Text style={s.infoText}>{t("mob.ai.notSaved")}</Text>
            </View>

            {err ? (
              <View style={s.err}>
                <Icon name="alert" size={16} stroke={color.danger} />
                <Text style={s.errText}>{err}</Text>
              </View>
            ) : null}

            <Button title={t("mob.ai.saveOk")} loading={saving} onPress={save} />
            <Pressable onPress={() => router.replace("/hujjatlarim/qoshish")}>
              <Text style={s.manual}>{t("mob.ai.fillManually")}</Text>
            </Pressable>
          </>
        )}
      </ScrollView>

      {/* Rozilik — skanerlashdan oldin */}
      <Modal visible={consent} animationType="slide" transparent onRequestClose={() => setConsent(false)}>
        <Pressable style={s.backdrop} onPress={() => setConsent(false)}>
          <View style={[s.sheet, { paddingBottom: insets.bottom + space.lg }]}>
            <View style={s.grabber} />
            <View style={s.lock}>
              <Icon name="alert" size={24} stroke={color.brand} />
            </View>
            <Text style={s.sheetTitle}>{t("mob.ai.consentTitle")}</Text>
            <Text style={s.sheetText}>{t("mob.ai.consentText")}</Text>

            <View style={s.points}>
              <Point text={t("mob.ai.consent1")} />
              <Point text={t("mob.ai.consent2")} />
              <Point text={t("mob.ai.consent3")} last />
            </View>

            <Button title={t("mob.ai.consentYes")} onPress={() => void run("camera")} />
            <View style={{ height: 10 }} />
            <Button
              title={t("mob.ai.consentGallery")}
              variant="secondary"
              onPress={() => void run("gallery")}
            />
            <Pressable onPress={() => setConsent(false)}>
              <Text style={s.manual}>{t("mob.ai.consentNo")}</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
  );
}

/* ─────────────────────────────────────────────── bo'laklar */

function Line({
  label,
  value,
  onChange,
  warn,
  placeholder,
  autoCapitalize,
  keyboardType,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  warn?: boolean;
  placeholder?: string;
  autoCapitalize?: "none" | "characters";
  keyboardType?: "default" | "numbers-and-punctuation";
}) {
  return (
    <View>
      <Text style={[s.fLabel, warn ? { color: color.warning } : null]}>
        {label}
        {warn ? <Text style={s.fLabel}> — {t("mob.ai.checkField")}</Text> : null}
      </Text>
      <View style={[s.fBox, warn ? s.fBoxWarn : null]}>
        <TextInput
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor="#94a3b8"
          autoCapitalize={autoCapitalize}
          keyboardType={keyboardType}
          style={s.fInput}
        />
        {warn ? <Icon name="alert" size={17} stroke={color.warning} /> : null}
      </View>
    </View>
  );
}

function Point({ text, last }: { text: string; last?: boolean }) {
  return (
    <View style={[s.point, last ? null : s.pointLine]}>
      <Icon name="check" size={16} stroke={color.success} />
      <Text style={s.pointText}>{text}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.background },
  grow: { flex: 1 },
  scroll: { padding: space.lg, gap: space.md },

  label: { fontSize: font.caption, fontWeight: "600", color: color.foreground, marginBottom: 8 },
  kinds: { flexDirection: "row", gap: 8 },
  kind: {
    flex: 1,
    height: 46,
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.card,
    alignItems: "center",
    justifyContent: "center",
  },
  kindOn: { borderColor: color.brand, borderWidth: 2, backgroundColor: color.brand + "0d" },
  kindText: { fontSize: font.caption, fontWeight: "600", color: "#475569" },

  shot: { height: 170, borderRadius: radius.card, backgroundColor: color.navy },
  again: {
    position: "absolute",
    right: 12,
    bottom: 10,
    height: 28,
    paddingHorizontal: 12,
    borderRadius: radius.pill,
    backgroundColor: "rgba(255,255,255,0.16)",
    justifyContent: "center",
  },
  againText: { fontSize: font.micro, color: "rgba(255,255,255,0.92)" },

  banner: {
    flexDirection: "row",
    gap: 11,
    borderWidth: 1,
    borderRadius: radius.card,
    padding: 14,
  },
  bannerOk: { borderColor: color.success + "66", backgroundColor: color.success + "0d" },
  bannerWarn: { borderColor: color.warning + "66", backgroundColor: color.warning + "0d" },
  bannerTitleOk: { fontSize: font.caption, fontWeight: "700", color: "#15803d" },
  bannerTextOk: { fontSize: 12, color: "#15803d", marginTop: 3, lineHeight: 18 },
  bannerTitleWarn: { fontSize: font.caption, fontWeight: "700", color: color.warning },
  bannerTextWarn: { fontSize: 12, color: color.warning, marginTop: 3, lineHeight: 18 },

  card: {
    backgroundColor: color.card,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.card,
    padding: space.lg,
    gap: 14,
  },
  cardTitle: { fontSize: font.caption, fontWeight: "700", color: color.foreground },

  fLabel: { fontSize: 12, color: color.mutedForeground, marginBottom: 5 },
  fBox: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.control,
    backgroundColor: color.card,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    gap: 10,
  },
  fBoxWarn: { borderColor: color.warning + "80", borderWidth: 1.5, backgroundColor: color.warning + "0a" },
  fInput: { flex: 1, fontSize: font.bodyLg, color: color.foreground, paddingVertical: 12 },

  chips: { flexDirection: "row", gap: 7 },
  chip: {
    height: 34,
    minWidth: 44,
    paddingHorizontal: 13,
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: color.border,
    alignItems: "center",
    justifyContent: "center",
  },
  chipOn: { backgroundColor: color.navy, borderColor: color.navy },
  chipText: { fontSize: font.caption, fontWeight: "700", color: "#64748b" },

  issue: { flexDirection: "row", gap: 9, alignItems: "flex-start" },
  issueText: { flex: 1, fontSize: 12, color: "#475569", lineHeight: 18 },

  info: {
    flexDirection: "row",
    gap: 11,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    backgroundColor: "#f8fafc",
    borderRadius: radius.card,
    padding: 14,
  },
  infoText: { flex: 1, fontSize: 12, color: "#475569", lineHeight: 19 },

  err: {
    flexDirection: "row",
    gap: 9,
    alignItems: "center",
    borderWidth: 1,
    borderColor: color.danger + "4d",
    backgroundColor: color.danger + "0d",
    borderRadius: radius.control,
    padding: 12,
  },
  errText: { flex: 1, fontSize: font.caption, color: color.danger },

  manual: {
    fontSize: font.body,
    fontWeight: "600",
    color: "#475569",
    textAlign: "center",
    paddingVertical: 14,
  },

  backdrop: { flex: 1, backgroundColor: "rgba(15,23,42,0.45)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: color.card,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    paddingHorizontal: space.xl,
    paddingTop: space.md,
  },
  grabber: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#cbd5e1",
    alignSelf: "center",
    marginBottom: 18,
  },
  lock: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: color.brand + "1f",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  sheetTitle: { fontSize: 20, fontWeight: "700", color: color.foreground, letterSpacing: -0.3 },
  sheetText: { fontSize: 14, color: "#475569", marginTop: 10, lineHeight: 22 },
  points: {
    marginTop: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.control + 4,
    overflow: "hidden",
  },
  point: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingVertical: 12 },
  pointLine: { borderBottomWidth: 1, borderBottomColor: color.border },
  pointText: { flex: 1, fontSize: font.caption, color: color.foreground },
});
