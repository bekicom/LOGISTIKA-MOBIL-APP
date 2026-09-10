/**
 * Mashinaga hujjat qo'shish — AI TEKSHIRUVI BILAN.
 *
 * ── NEGA SHU YERDA ──────────────────────────────────────────────
 *
 * Hujjatlar ekranidagi «Qo'shish» va «Yangilash» tugmalari
 * ISHLAMASDI: ro'yxatda yo'q hujjat ko'rinardi, lekin uni
 * qo'shadigan joy yo'q edi. Endi shu ekran o'sha ish uchun.
 *
 * ── AI DAN FARQI: SOLISHTIRADI ──────────────────────────────────
 *
 * `ai/skaner` shaxsiy hujjatni O'QIYDI. Bu yerda esa o'qilgan
 * hujjat MASHINA PROFILI bilan solishtiriladi: davlat raqami,
 * VIN, marka. «Raqam mos kelmaydi» degan gap modelning fikri
 * emas — u qoida asosida chiqadi (`compareDoc`), model faqat
 * o'qiydi.
 *
 * Shuning uchun bu yerda ikkita natija bor: o'qilgan maydonlar
 * (formaga qo'yish uchun) va farqlar — qizil bo'lsa hujjat
 * boshqa mashinaniki bo'lishi mumkin.
 *
 * ── HECH NARSA O'ZI SAQLANMAYDI ─────────────────────────────────
 *
 * Skaner natijasi maydonlarga tushadi, odam ko'rib tasdiqlaydi.
 * Muddat keyin chegarada ishlatiladi — noto'g'ri o'qilgan sana
 * mashinani to'xtatib qo'yishi mumkin.
 *
 * ── IKKI TARIF ──────────────────────────────────────────────────
 *
 * Tekshirish — `ai`, saqlash — `documents`. Ular alohida
 * tariflarda bo'lishi mumkin, shuning uchun to'siq ham alohida
 * (5-qoida).
 */
import { useState } from "react";
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from "react-native";
import { Text } from "@/components/Text";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Icon } from "@/components/Icon";
import { Button, Field, Header, Notice } from "@/components/ui";
import { TariffNotice } from "@/components/TariffNotice";
import { apiUpload, FuramError } from "@/lib/api";
import { pickPhotos, takePhoto, toUpload, type Photo } from "@/lib/photo";
import { tariffBlocked } from "@/lib/features";
import { color, radius, shadow, space, themed } from "@/lib/theme";
import { t, tOr } from "@/lib/i18n";

/** `lib/vehicle-docs.ts` dagi `DOC_KINDS` — tartibi ham o'sha */
const KINDS = [
  "TECH_PASSPORT",
  "INSURANCE",
  "INSURANCE_INTL",
  "INSPECTION",
  "LICENSE",
  "PERMIT",
  "POA",
  "BORDER",
  "RENT",
  "OTHER",
] as const;

const DATE = /^\d{4}-\d{2}-\d{2}$/;

type Mismatch = { field: string; inDoc: string; inProfile: string; level: "error" | "warn" };
type Issue = { code?: string; params?: Record<string, number | string>; text: string; level: string };
type Check = {
  fields: {
    docKind: string | null;
    docNo: string | null;
    plate: string | null;
    vin: string | null;
    brand: string | null;
    model: string | null;
    year: number | null;
    issueDate: string | null;
    expiryDate: string | null;
    countries: string[];
  };
  mismatches: Mismatch[];
  /** Qaysi belgilar ROSTDAN solishtirildi */
  compared: string[];
  issues: Issue[];
};

const str = (v: unknown) => (typeof v === "string" ? v : "");

/** Server xatosi — kod tanish bo'lsa foydalanuvchi tilida */
function scanError(e: FuramError): string {
  return tOr(`mob.aiErr.${e.code}`, e.message || t("mob.ai.scanFailed"));
}

export default function HujjatQoshish() {
  const { id, kind: preset } = useLocalSearchParams<{ id: string; kind?: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [kind, setKind] = useState<string>(
    preset && (KINDS as readonly string[]).includes(preset) ? preset : "TECH_PASSPORT",
  );
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [check, setCheck] = useState<Check | null>(null);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const [title, setTitle] = useState("");
  const [number, setNumber] = useState("");
  const [issued, setIssued] = useState("");
  const [expires, setExpires] = useState("");
  const [countries, setCountries] = useState("");

  async function choose(from: "camera" | "gallery") {
    const list = from === "camera" ? await takePhoto() : await pickPhotos(1);
    const p = list[0];
    if (!p) return;
    setPhoto(p);
    setCheck(null);
    setErr("");
  }

  /** Rasm → server → maydonlar. Rozilik ochiq so'raladi. */
  async function scan() {
    if (!photo) return;
    if (tariffBlocked("ai")) return;
    setErr("");
    setBusy(true);
    try {
      const r = await apiUpload<Check>(
        `/api/fleet/vehicles/${id}/scan-check`,
        /* Rozilik shu yerda ham yuboriladi — server ikkinchi marta
           tekshiradi va himoya faqat interfeysga tayanmaydi */
        { consent: "true" },
        [toUpload(photo, "photo")],
      );
      setCheck(r);
      setNumber(str(r.fields.docNo));
      setIssued(str(r.fields.issueDate));
      setExpires(str(r.fields.expiryDate));
      setCountries(r.fields.countries.join(", "));
    } catch (e) {
      setErr(scanError(e as FuramError));
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    if (tariffBlocked("documents")) return;
    setErr("");
    setSaving(true);
    try {
      await apiUpload(
        `/api/fleet/vehicles/${id}/documents`,
        {
          kind,
          title: title.trim() || undefined,
          number: number.trim() || undefined,
          issuedAt: DATE.test(issued) ? issued : undefined,
          expiresAt: DATE.test(expires) ? expires : undefined,
          countries: countries.trim() || undefined,
        },
        photo ? [toUpload(photo, "file")] : [],
      );
      router.back();
    } catch (e) {
      setErr(scanError(e as FuramError));
      setSaving(false);
    }
  }

  /* «Boshqa» hujjatga nom shart — server ham shuni talab qiladi.
     Tugmani oldindan o'chirib qo'yamiz (5-qoida). */
  const needTitle = kind === "OTHER" && !title.trim();
  const badDate =
    (!!issued && !DATE.test(issued)) || (!!expires && !DATE.test(expires));

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Header title={t("mob.vdoc.addTitle")} subtitle={t(`vehDocKind.${kind}`)} />

      <ScrollView
        contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + space.xxl }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Qaysi hujjat */}
        <Text style={s.label}>{t("mob.vdoc.which")}</Text>
        <View style={s.kinds}>
          {KINDS.map((k) => (
            <Pressable
              key={k}
              onPress={() => setKind(k)}
              style={[s.kind, kind === k && s.kindOn]}
              accessibilityRole="button"
            >
              <Text style={[s.kindText, kind === k && s.kindTextOn]}>{t(`vehDocKind.${k}`)}</Text>
            </Pressable>
          ))}
        </View>

        {/* Rasm */}
        <Text style={[s.label, { marginTop: space.lg }]}>{t("mob.vdoc.photo")}</Text>
        {photo ? (
          <View style={s.shot}>
            <Image source={{ uri: photo.uri }} style={s.shotImg} resizeMode="cover" />
            <Pressable onPress={() => setPhoto(null)} style={s.shotX} hitSlop={8}>
              <Icon name="close" size={16} stroke="#fff" />
            </Pressable>
          </View>
        ) : (
          <View style={{ flexDirection: "row", gap: 9 }}>
            <View style={{ flex: 1 }}>
              <Button
                title={t("mob.vdoc.camera")}
                variant="secondary"
                onPress={() => void choose("camera")}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Button
                title={t("mob.vdoc.gallery")}
                variant="secondary"
                onPress={() => void choose("gallery")}
              />
            </View>
          </View>
        )}

        {/* AI tekshiruvi */}
        {photo && !check ? (
          <View style={{ marginTop: space.md }}>
            <TariffNotice feature="ai" />
            <Text style={s.consent}>{t("mob.vdoc.consent")}</Text>
            <Button title={t("mob.vdoc.check")} loading={busy} onPress={scan} />
          </View>
        ) : null}

        {/* Solishtirish natijasi */}
        {check ? (
          <View style={{ marginTop: space.md, gap: 9 }}>
            {check.mismatches.length > 0 ? (
              check.mismatches.map((m) => (
                <Notice key={m.field} tone={m.level === "error" ? "danger" : "warning"}>
                  {t("mob.vdoc.mismatch", {
                    f: tOr(`mob.vdocField.${m.field}`, m.field),
                    a: m.inDoc,
                    b: m.inProfile,
                  })}
                </Notice>
              ))
            ) : check.compared.length > 0 ? (
              <Notice>{t("mob.vdoc.matched", { n: check.compared.length })}</Notice>
            ) : (
              /* Farq topilmagani «mos keldi» degani EMAS: hujjatdan
                 mashina belgilari umuman o'qilmagan bo'lishi mumkin
                 va u holda solishtiradigan narsa yo'q */
              <Notice tone="warning">{t("mob.vdoc.nothingCompared")}</Notice>
            )}

            {check.issues.map((i, n) => (
              <Notice key={`${i.code ?? "x"}-${n}`} tone="warning">
                {i.code ? t(`mob.scanIssue.${i.code}`, i.params ?? {}) : i.text}
              </Notice>
            ))}

            <Text style={s.unverified}>{t("mob.vdoc.unverified")}</Text>
          </View>
        ) : null}

        {/* Maydonlar */}
        <View style={{ marginTop: space.lg, gap: space.md }}>
          {kind === "OTHER" ? (
            <Field
              label={t("mob.vdoc.name")}
              value={title}
              onChangeText={setTitle}
              maxLength={100}
            />
          ) : null}
          <Field
            label={t("mob.vdoc.number")}
            value={number}
            onChangeText={setNumber}
            maxLength={60}
            autoCapitalize="characters"
          />
          <Field
            label={t("mob.vdoc.issued")}
            placeholder="2026-01-15"
            value={issued}
            onChangeText={setIssued}
            keyboardType="numbers-and-punctuation"
            maxLength={10}
          />
          <Field
            label={t("mob.vdoc.expires")}
            hint={t("mob.vdoc.expiresHint")}
            placeholder="2027-01-15"
            value={expires}
            onChangeText={setExpires}
            keyboardType="numbers-and-punctuation"
            maxLength={10}
          />
          <Field
            label={t("mob.vdoc.countries")}
            hint={t("mob.vdoc.countriesHint")}
            placeholder="UZ, RU, KZ"
            value={countries}
            onChangeText={setCountries}
            autoCapitalize="characters"
            maxLength={80}
          />
        </View>

        {badDate ? <Text style={s.err}>{t("mob.vdoc.badDate")}</Text> : null}
        {err ? <Text style={s.err}>{err}</Text> : null}

        <View style={{ marginTop: space.lg }}>
          <TariffNotice feature="documents" />
          <Button
            title={t("mob.common.save")}
            loading={saving}
            disabled={needTitle || badDate}
            onPress={save}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = themed(() => ({
  root: { flex: 1, backgroundColor: color.background },
  scroll: { padding: space.lg },

  label: { fontSize: 12, fontWeight: "800", color: color.mutedForeground, marginBottom: 9 },

  kinds: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  kind: {
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: 999,
    paddingHorizontal: 13,
    paddingVertical: 7,
    backgroundColor: color.card,
  },
  kindOn: { borderColor: color.brand, backgroundColor: color.brandSoft },
  kindText: { fontSize: 12.5, fontWeight: "600", color: color.mutedForeground },
  kindTextOn: { color: color.brand, fontWeight: "800" },

  shot: {
    height: 190,
    borderRadius: radius.card,
    overflow: "hidden",
    backgroundColor: color.muted,
    ...shadow.card,
  },
  shotImg: { width: "100%", height: "100%" },
  shotX: {
    position: "absolute",
    top: 9,
    right: 9,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#00000099",
  },

  consent: {
    fontSize: 11.5,
    color: color.mutedForeground,
    lineHeight: 17,
    marginBottom: 9,
  },
  unverified: { fontSize: 11.5, color: color.mutedForeground, lineHeight: 17 },

  err: { fontSize: 12.5, color: color.danger, marginTop: space.md },
}));
