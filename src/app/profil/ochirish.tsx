/**
 * I5 — hisobni o'chirish.
 *
 * BU EKRAN APP STORE TALABI. Guideline 5.1.1(v): ro'yxatdan o'tish
 * bo'lsa, o'chirish ham ILOVA ICHIDA bo'lishi shart. Saytga havola
 * qilish yetmaydi — ko'p ilova aynan shundan rad qilinadi.
 *
 * «Bekor qilish» ASOSIY tugma, o'chirish esa ikkinchi darajali:
 * bu yerga odam ko'pincha jahl bilan keladi, qaytish yo'li ochiq
 * turishi kerak.
 *
 * Server (`furam/src/app/api/profile/route.ts`) ikki himoyani
 * tekshiradi — parol va yopilmagan reyslar. Reys ogohlantirishi
 * TO'SIQ EMAS: tasdiqlangach baribir o'chadi, aks holda reysi
 * tiqilib qolgan odam hisobini umuman o'chira olmasdi.
 *
 * ⚠️ GOOGLE/APPLE HISOBI (2026-09-17, do'kon auditi A1): bunday hisobda
 * parol tasodifiy yaratiladi va odam uni BILMAYDI — parol so'ralsa
 * hisobini umuman o'chira olmasdi. Apple 5.1.1(v) va Google Play buni
 * to'g'ridan-to'g'ri rad sababi qiladi. Shuning uchun ekran ochilganda
 * `/api/profile/deletion` dan qanday tasdiq kerakligi so'raladi:
 * parolli hisobda — parol, ijtimoiy hisobda — aniq tasdiq belgisi.
 */
import { useEffect, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { Text } from "@/components/Text";
import { useRouter } from "expo-router";
import { Button, Card, Field, Header } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { api, FuramError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { color, font, radius, space, themed } from "@/lib/theme";
import { t } from "@/lib/i18n";

type ActiveTrip = { no: number; status: string; from: string; to: string };

/* Holat nomi API dan TAYYOR kelmaydi: server uni bitta tilda
   yasaydi, ilova esa sakkiz tilda ishlaydi. Enum kaliti keladi,
   tarjimani mijoz qiladi — web'dagi `tripStatus` lug'ati bilan
   bir xil manba. */
const tripStatus = (k: string) => t(`tripStatus.${k}`);

export default function HisobniOchirish() {
  const router = useRouter();
  const { signOut } = useAuth();

  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [trips, setTrips] = useState<ActiveTrip[] | null>(null);
  /** `null` — hali bilinmadi: parol maydoni ham, tasdiq ham ko'rsatilmaydi */
  const [social, setSocial] = useState<boolean | null>(null);
  const [tasdiq, setTasdiq] = useState(false);

  useEffect(() => {
    let tirik = true;
    api<{ social: boolean }>("/api/profile/deletion")
      .then((r) => {
        if (tirik) setSocial(!!r.social);
      })
      /* So'rov o'tmasa parolli yo'lga tushamiz: server baribir tekshiradi,
         ya'ni bu yerda xato ko'rsatishning ma'nosi yo'q */
      .catch(() => tirik && setSocial(false));
    return () => {
      tirik = false;
    };
  }, []);

  const tayyor = social ? tasdiq : !!password;

  async function submit() {
    setBusy(true);
    setError("");
    try {
      await api("/api/profile", {
        method: "DELETE",
        // Reyslar ko'rsatilgandan keyingi ikkinchi bosish — bilib turib tasdiq
        body: social
          ? { confirm: true, confirmActiveTrips: trips !== null }
          : { password, confirmActiveTrips: trips !== null },
      });
      await signOut();
      router.replace("/til");
    } catch (e) {
      const err = e as FuramError;
      if (err.code === "ACTIVE_TRIPS") {
        setTrips((err.data?.trips as ActiveTrip[] | undefined) ?? []);
      } else if (err.code === "BAD_PASSWORD") {
        setError(t("mob.delete.badPassword"));
      } else if (err.code === "PASSWORD_REQUIRED") {
        /* Server hisob ijtimoiy ekanini aytdi — ekran parol so'rab
           turgan bo'lsa, tasdiq belgisiga o'tamiz */
        if (err.data?.social === true) {
          setSocial(true);
          setError("");
        } else {
          setError(t("mob.delete.passwordRequired"));
        }
      } else {
        setError(err.message ?? t("mob.delete.failed"));
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={s.root}>
      <Header title={t("mob.delete.title")} />

      <ScrollView
          /* Klaviatura maydonni bosib qolmasin: iOS ro'yxatni
             o'zi surib beradi (2026-09-13 audit) */
          automaticallyAdjustKeyboardInsets contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        {/* Nima bo'ladi — uch bosqich */}
        <Card style={{ padding: space.lg }}>
          <Text style={s.cardTitle}>{t("mob.delete.whatHappens")}</Text>
          <Step
            n="1"
            title={t("mob.delete.step1")}
            body={t("mob.delete.step1Text")}
          />
          <Step
            n="2"
            title={t("mob.delete.step2")}
            body={t("mob.delete.step2Text")}
          />
          <Step
            n="3"
            title={t("mob.delete.step3")}
            body={t("mob.delete.step3Text")}
            last
          />
        </Card>

        {/* Nima yo'qoladi */}
        <Card style={{ padding: space.lg }}>
          <Text style={s.cardTitle}>{t("mob.delete.whatLost")}</Text>
          {["lost1", "lost2", "lost3", "lost4", "lost5"].map((k) => t(`mob.delete.${k}`)).map((txt) => (
            <View key={txt} style={s.lose}>
              <Icon name="close" size={14} stroke={color.danger} />
              <Text style={s.loseText}>{txt}</Text>
            </View>
          ))}
        </Card>

        {/* Server topgan yopilmagan reyslar */}
        {trips && trips.length > 0 ? (
          <View style={s.warn}>
            <View style={s.warnHead}>
              <Icon name="alert" size={18} stroke={color.warning} />
              <Text style={s.warnTitle}>{t("mob.delete.activeTrips", { n: trips.length })}</Text>
            </View>
            <Text style={s.warnBody}>{t("mob.delete.activeTripsText")}</Text>
            {trips.map((tr) => (
              <Text key={tr.no} style={s.tripLine}>
                <Text style={{ fontWeight: "700" }}>FURAM #{tr.no}</Text>
                {"  "}
                {tr.from} → {tr.to} · {tripStatus(tr.status)}
              </Text>
            ))}
          </View>
        ) : null}

        {/* Tasdiq: parolli hisobda parol, Google/Apple hisobida belgi */}
        {social === null ? null : social ? (
          <View style={{ gap: space.sm }}>
            <Text style={s.socialNote}>{t("mob.delete.socialNote")}</Text>
            <Pressable
              onPress={() => {
                setTasdiq(!tasdiq);
                setError("");
              }}
              /* Ruxsat belgisi — ekran o'quvchiga ham holati bilinadi */
              accessibilityRole="checkbox"
              accessibilityState={{ checked: tasdiq }}
              accessibilityLabel={t("mob.delete.socialConfirm")}
              style={s.check}
            >
              <View style={[s.box, tasdiq && s.boxOn]}>
                {tasdiq ? <Icon name="check" size={14} stroke="#ffffff" /> : null}
              </View>
              <Text style={s.checkText}>{t("mob.delete.socialConfirm")}</Text>
            </Pressable>
            {error ? <Text style={s.err}>{error}</Text> : null}
          </View>
        ) : (
          <View>
            <Field
              label={t("mob.delete.confirmPassword")}
              value={password}
              onChangeText={(v) => {
                setPassword(v);
                setError("");
              }}
              secureTextEntry={!show}
              autoCapitalize="none"
              autoComplete="current-password"
              placeholder="••••••••"
              error={error || undefined}
              right={
                <Text onPress={() => setShow(!show)} style={s.showBtn}>
                  {show ? t("mob.common.hide") : t("mob.common.show")}
                </Text>
              }
            />
          </View>
        )}

        {/* Bekor qilish ASOSIY, o'chirish ikkinchi darajali */}
        <View style={{ gap: space.md }}>
          <Button title={t("mob.delete.keepAccount")} onPress={() => router.back()} />
          <Button
            title={trips ? t("mob.delete.deleteAnyway") : t("mob.delete.title")}
            variant="secondary"
            loading={busy}
            disabled={!tayyor}
            onPress={submit}
          />
        </View>

        <Text style={s.foot}>{t("mob.delete.subNote")}</Text>
      </ScrollView>
    </View>
  );
}

function Step({
  n,
  title,
  body,
  last,
}: {
  n: string;
  title: string;
  body: string;
  last?: boolean;
}) {
  return (
    <View style={s.step}>
      <View style={s.stepCol}>
        <View style={s.stepDot}>
          <Text style={s.stepNum}>{n}</Text>
        </View>
        {!last ? <View style={s.stepLine} /> : null}
      </View>
      <View style={{ flex: 1, paddingBottom: last ? 0 : space.lg }}>
        <Text style={s.stepTitle}>{title}</Text>
        <Text style={s.stepBody}>{body}</Text>
      </View>
    </View>
  );
}

const s = themed(() => ({
  root: { flex: 1, backgroundColor: color.background },
  scroll: { padding: space.lg, gap: space.md, paddingBottom: space.xxl * 2 },

  cardTitle: { fontSize: font.body, fontWeight: "700", color: color.foreground, marginBottom: space.md },

  step: { flexDirection: "row", gap: space.md },
  stepCol: { alignItems: "center", width: 26 },
  stepDot: {
    width: 26, height: 26, borderRadius: 13, backgroundColor: color.muted,
    alignItems: "center", justifyContent: "center",
  },
  stepNum: { fontSize: 12, fontWeight: "700", color: color.mutedForeground },
  stepLine: { flex: 1, width: 2, backgroundColor: color.border, marginVertical: 2 },
  stepTitle: { fontSize: font.caption, fontWeight: "600", color: color.foreground, marginTop: 4 },
  stepBody: { fontSize: font.caption, color: color.mutedForeground, lineHeight: 19, marginTop: 3 },

  lose: { flexDirection: "row", alignItems: "center", gap: space.sm, paddingVertical: 5 },
  loseText: { flex: 1, fontSize: font.caption, color: color.mutedForeground },

  warn: {
    borderWidth: 1, borderColor: color.warning + "59", backgroundColor: color.warning + "0f",
    borderRadius: radius.card, padding: space.lg,
  },
  warnHead: { flexDirection: "row", alignItems: "center", gap: space.sm },
  warnTitle: { fontSize: font.body, fontWeight: "700", color: color.warning },
  warnBody: { fontSize: font.caption, color: color.warning, lineHeight: 19, marginTop: 5 },
  tripLine: { fontSize: font.caption, color: color.foreground, marginTop: 8 },

  showBtn: { fontSize: font.caption, fontWeight: "600", color: color.brand },

  socialNote: { fontSize: font.caption, color: color.mutedForeground, lineHeight: 19 },
  check: { flexDirection: "row", alignItems: "center", gap: space.sm, paddingVertical: space.sm },
  box: {
    width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: color.border,
    alignItems: "center", justifyContent: "center",
  },
  boxOn: { backgroundColor: color.danger, borderColor: color.danger },
  checkText: { flex: 1, fontSize: font.body, fontWeight: "600", color: color.foreground },
  err: { fontSize: font.caption, color: color.danger },

  foot: { fontSize: 12, color: color.mutedForeground, lineHeight: 18, paddingHorizontal: space.xs },
}));
