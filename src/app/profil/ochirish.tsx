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
 */
import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Button, Card, Field, Header } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { api, FuramError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { color, font, radius, space } from "@/lib/theme";

type ActiveTrip = { no: number; status: string; from: string; to: string };

const STATUS: Record<string, string> = {
  ASSIGNED: "Mashina biriktirildi",
  TO_LOADING: "Yuklashga ketmoqda",
  LOADED: "Yuklandi",
  ON_ROAD: "Yo'lda",
  AT_BORDER: "Chegarada",
  NEAR_DESTINATION: "Manzilga yaqin",
  UNLOADED: "Tushirildi",
  CLOSING: "Yopilmoqda",
};

export default function HisobniOchirish() {
  const router = useRouter();
  const { signOut } = useAuth();

  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [trips, setTrips] = useState<ActiveTrip[] | null>(null);

  async function submit() {
    setBusy(true);
    setError("");
    try {
      await api("/api/profile", {
        method: "DELETE",
        // Reyslar ko'rsatilgandan keyingi ikkinchi bosish — bilib turib tasdiq
        body: { password, confirmActiveTrips: trips !== null },
      });
      await signOut();
      router.replace("/til");
    } catch (e) {
      const err = e as FuramError;
      if (err.code === "ACTIVE_TRIPS") {
        setTrips((err.data?.trips as ActiveTrip[] | undefined) ?? []);
      } else if (err.code === "BAD_PASSWORD") {
        setError("Parol noto'g'ri");
      } else if (err.code === "PASSWORD_REQUIRED") {
        setError("Parolni kiriting");
      } else {
        setError(err.message ?? "O'chirilmadi, qaytadan urinib ko'ring");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={s.root}>
      <Header title="Hisobni o'chirish" />

      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        {/* Nima bo'ladi — uch bosqich */}
        <Card style={{ padding: space.lg }}>
          <Text style={s.cardTitle}>Nima bo'ladi</Text>
          <Step
            n="1"
            title="Hoziroq"
            body="Barcha qurilmadan chiqasiz, e'lonlaringiz ro'yxatdan olinadi."
          />
          <Step
            n="2"
            title="30 kun ichida"
            body="Fikringiz o'zgarsa — shu telefon va parol bilan kiring, hammasi joyiga qaytadi."
          />
          <Step
            n="3"
            title="30 kundan keyin"
            body="Ma'lumot butunlay o'chadi. Buni ortga qaytarib bo'lmaydi."
            last
          />
        </Card>

        {/* Nima yo'qoladi */}
        <Card style={{ padding: space.lg }}>
          <Text style={s.cardTitle}>Nima yo'qoladi</Text>
          {[
            "E'lonlar va ular bo'yicha kelishuvlar",
            "Reys tarixi va hisobotlar",
            "Yuklangan hujjatlar",
            "Suhbatlar va xabarlar",
            "Ishonch bali va reytingingiz",
          ].map((t) => (
            <View key={t} style={s.lose}>
              <Icon name="close" size={14} stroke={color.danger} />
              <Text style={s.loseText}>{t}</Text>
            </View>
          ))}
        </Card>

        {/* Server topgan yopilmagan reyslar */}
        {trips && trips.length > 0 ? (
          <View style={s.warn}>
            <View style={s.warnHead}>
              <Icon name="alert" size={18} stroke={color.warning} />
              <Text style={s.warnTitle}>
                {trips.length} ta reys hali yopilmagan
              </Text>
            </View>
            <Text style={s.warnBody}>
              Hisobni o'chirsangiz aloqa uziladi va bu reyslar egasiz qoladi.
              Avval ularni yopish tavsiya etiladi.
            </Text>
            {trips.map((t) => (
              <Text key={t.no} style={s.tripLine}>
                <Text style={{ fontWeight: "700" }}>FURAM #{t.no}</Text>
                {"  "}
                {t.from} → {t.to} · {STATUS[t.status] ?? t.status}
              </Text>
            ))}
          </View>
        ) : null}

        {/* Parol */}
        <View>
          <Field
            label="Tasdiqlash uchun parolni kiriting"
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
                {show ? "Yashirish" : "Ko'rsatish"}
              </Text>
            }
          />
        </View>

        {/* Bekor qilish ASOSIY, o'chirish ikkinchi darajali */}
        <View style={{ gap: space.md }}>
          <Button title="Bekor qilish — hisobim qolsin" onPress={() => router.back()} />
          <Button
            title={trips ? "Baribir o'chirish" : "Hisobni o'chirish"}
            variant="secondary"
            loading={busy}
            disabled={!password}
            onPress={submit}
          />
        </View>

        <Text style={s.foot}>
          Faol obunangiz bo'lsa, u avtomatik bekor qilinmaydi — App Store yoki
          Google Play sozlamalaridan alohida bekor qiling.
        </Text>
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

const s = StyleSheet.create({
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

  foot: { fontSize: 12, color: color.mutedForeground, lineHeight: 18, paddingHorizontal: space.xs },
});
