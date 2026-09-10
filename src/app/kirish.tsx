/**
 * A6 — kirish. Telefon yoki FURAM ID + parol.
 *
 * Dizayn-2: `AuthShell` (ko'k fon, oq karta), kartaning tepasida
 * «Kirish | Ro'yxatdan o'tish» almashtirgichi. Mantiq o'zgarmadi.
 */
import { useState } from "react";
import { Alert, Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import Svg, { Circle, Path } from "react-native-svg";
import { AuthLine, AuthShell } from "@/components/AuthShell";
import { Text } from "@/components/Text";
import { Button, Field, Notice } from "@/components/ui";
import { api, FuramError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { color, font, radius, space, themed } from "@/lib/theme";
import { t } from "@/lib/i18n";

type Mode = "phone" | "furamId";

export default function Kirish() {
  const [mode, setMode] = useState<Mode>("phone");
  const [phone, setPhone] = useState("");
  const [furamId, setFuramId] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<{ code: string; message: string } | null>(null);

  const { signIn } = useAuth();
  const router = useRouter();

  async function submit() {
    setErr(null);
    setBusy(true);
    try {
      const body =
        mode === "phone"
          ? { phone: "+998" + phone.replace(/\D/g, ""), password }
          : { furamId: Number(furamId), password };

      const res = await api<{ token?: string; signedOutDevices?: number }>("/api/auth/login", {
        method: "POST",
        auth: false,
        body,
      });

      if (!res.token) {
        // Server mobil sessiyani qaytarmadi — bu backend sozlamasi muammosi
        setErr({ code: "NO_TOKEN", message: t("mob.ui.supportContact") });
        return;
      }
      await signIn(res.token);

      /* BOSHQA QURILMA CHIQARILGANINI AYTAMIZ (2026-09-10).
         Bitta hisobda ko'pi bilan ikkita qurilma bo'ladi;
         uchinchisidan kirilsa eng eskisi chiqib ketadi. Ilgari bu
         JIM bo'lardi — eski telefonda ilova birdan «kirish kerak»
         deb turardi va odam sababini bilmasdi. Endi hozir kirgan
         odam darrov ko'radi.

         Xabar KIRISHNI TO'SMAYDI: `Alert` chiqadi-yu, ekran
         baribir bosh sahifaga o'tadi. Aks holda odam OK bosmaguncha
         kirish tugamagan bo'lib turardi. */
      if (res.signedOutDevices && res.signedOutDevices > 0) {
        Alert.alert(
          t("mob.signIn.deviceLimitTitle"),
          t("mob.signIn.deviceLimitBody", { n: res.signedOutDevices }),
        );
      }
      router.replace("/bosh");
    } catch (e) {
      const f = e as FuramError;
      setErr({ code: f.code ?? "ERROR", message: f.message ?? t("mob.signIn.failed") });
    } finally {
      setBusy(false);
    }
  }

  const locked = err?.code === "TOO_MANY_ATTEMPTS";
  const ready = password.length > 0 && (mode === "phone" ? phone.length >= 9 : furamId.length > 0);

  return (
    <AuthShell
      title={t("mob.signIn.title")}
      subtitle={t("mob.signIn.subtitle")}
      tab="signIn"
      onBack={() => (router.canGoBack() ? router.back() : router.replace("/tanishtiruv"))}
      footer={
        <AuthLine
          text={t("mob.signIn.noAccount")}
          link={t("mob.intro.signUp")}
          onPress={() => router.replace("/rol")}
        />
      }
    >
      {/* Telefon | FURAM ID */}
      <View style={s.mode}>
        <Pressable style={[s.modeItem, mode === "phone" && s.modeOn]} onPress={() => setMode("phone")}>
          <Text style={[s.modeText, mode === "phone" && s.modeTextOn]}>{t("mob.signIn.byPhone")}</Text>
        </Pressable>
        <Pressable style={[s.modeItem, mode === "furamId" && s.modeOn]} onPress={() => setMode("furamId")}>
          <Text style={[s.modeText, mode === "furamId" && s.modeTextOn]}>FURAM ID</Text>
        </Pressable>
      </View>

      {locked ? (
        <View style={{ marginBottom: space.lg }}>
          <Notice tone="danger" title={t("mob.signIn.blocked")}>
            {err.message}
          </Notice>
        </View>
      ) : null}

      <View style={s.form}>
        {mode === "phone" ? (
          <View style={s.phoneRow}>
            <View style={s.cc}>
              <Text style={s.ccText}>+998</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Field
                placeholder="90 123 45 67"
                keyboardType="phone-pad"
                autoComplete="tel"
                textContentType="telephoneNumber"
                value={phone}
                onChangeText={setPhone}
                editable={!locked}
              />
            </View>
          </View>
        ) : (
          <Field
            label="FURAM ID"
            placeholder="11186"
            keyboardType="number-pad"
            value={furamId}
            onChangeText={setFuramId}
            editable={!locked}
          />
        )}

        <Field
          label={t("mob.signIn.password")}
          placeholder={t("mob.signIn.passwordPh")}
          secureTextEntry={!show}
          autoComplete="current-password"
          textContentType="password"
          value={password}
          onChangeText={setPassword}
          editable={!locked}
          right={
            <Pressable onPress={() => setShow((v) => !v)} hitSlop={10}>
              <Svg width={20} height={20} viewBox="0 0 24 24">
                <Path
                  d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z"
                  stroke={color.mutedForeground}
                  strokeWidth={2}
                  fill="none"
                />
                <Circle cx={12} cy={12} r={3} stroke={color.mutedForeground} strokeWidth={2} fill="none" />
                {show ? (
                  <Path d="M3 3l18 18" stroke={color.mutedForeground} strokeWidth={2} strokeLinecap="round" />
                ) : null}
              </Svg>
            </Pressable>
          }
        />

        {err && !locked ? <Text style={s.err}>{err.message}</Text> : null}

        <Pressable
          hitSlop={8}
          onPress={() => router.push("/parol")}
          accessibilityRole="button"
          style={{ alignSelf: "flex-end" }}
        >
          <Text style={s.link}>{t("mob.signIn.forgot")}</Text>
        </Pressable>
      </View>

      <View style={{ marginTop: space.xl }}>
        <Button title={t("mob.signIn.submit")} onPress={submit} loading={busy} disabled={!ready || locked} />
      </View>
    </AuthShell>
  );
}

const s = themed(() => ({
  mode: { flexDirection: "row", gap: 8, marginBottom: space.lg },
  modeItem: {
    flex: 1,
    height: 38,
    borderRadius: radius.control,
    borderWidth: 1.5,
    borderColor: color.border,
    alignItems: "center",
    justifyContent: "center",
  },
  modeOn: { borderColor: color.blue, backgroundColor: color.blueSoft },
  modeText: { fontSize: 13.5, fontWeight: "600", color: color.mutedForeground },
  modeTextOn: { color: color.blue },

  form: { gap: space.md },
  phoneRow: { flexDirection: "row", gap: 8, alignItems: "flex-start" },
  cc: {
    width: 88,
    height: 52,
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.muted,
    alignItems: "center",
    justifyContent: "center",
  },
  ccText: { fontSize: font.body, fontWeight: "700", color: color.foreground },

  err: { fontSize: 13, color: color.danger },
  link: { fontSize: 14, fontWeight: "600", color: color.blue },
}));
