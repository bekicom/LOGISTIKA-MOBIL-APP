/** A6 — kirish. Telefon yoki FURAM ID + parol. */
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Svg, { Circle, Path } from "react-native-svg";
import { Logo } from "@/components/Logo";
import { Button, Field, Notice } from "@/components/ui";
import { api, FuramError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { color, font, radius, space } from "@/lib/theme";
import { LOCALE_INFO, currentLocale, t } from "@/lib/i18n";

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
  const insets = useSafeAreaInsets();

  async function submit() {
    setErr(null);
    setBusy(true);
    try {
      const body =
        mode === "phone"
          ? { phone: "+998" + phone.replace(/\D/g, ""), password }
          : { furamId: Number(furamId), password };

      const res = await api<{ token?: string }>("/api/auth/login", {
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
    <KeyboardAvoidingView
      style={s.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          s.scroll,
          { paddingTop: insets.top + space.xs, paddingBottom: insets.bottom + space.xl },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={s.top}>
          <Pressable onPress={() => router.back()} hitSlop={12} style={s.back}>
            <Svg width={22} height={22} viewBox="0 0 24 24">
              <Path d="m15 18-6-6 6-6" stroke={color.foreground} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </Svg>
          </Pressable>
          <View style={{ flex: 1 }} />
          <View style={s.lang}>
            <Svg width={16} height={16} viewBox="0 0 24 24">
              <Circle cx={12} cy={12} r={10} stroke={color.mutedForeground} strokeWidth={2} fill="none" />
              <Path d="M2 12h20M12 2a15 15 0 0 1 0 20 15 15 0 0 1 0-20z" stroke={color.mutedForeground} strokeWidth={2} fill="none" />
            </Svg>
            <Text style={s.langText}>{LOCALE_INFO[currentLocale()].native}</Text>
          </View>
        </View>

        <View style={s.hero}>
          <Logo width={176} />
          <Text style={s.title}>{t("mob.signIn.title")}</Text>
        </View>

        <View style={s.segment}>
          <Pressable style={[s.segItem, mode === "phone" && s.segOn]} onPress={() => setMode("phone")}>
            <Text style={[s.segText, mode === "phone" && s.segTextOn]}>{t("mob.signIn.byPhone")}</Text>
          </Pressable>
          <Pressable style={[s.segItem, mode === "furamId" && s.segOn]} onPress={() => setMode("furamId")}>
            <Text style={[s.segText, mode === "furamId" && s.segTextOn]}>FURAM ID</Text>
          </Pressable>
        </View>

        {locked ? (
          <View style={{ marginTop: space.lg }}>
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

          <Pressable hitSlop={8}>
            <Text style={s.link}>{t("mob.signIn.forgot")}</Text>
          </Pressable>
        </View>

        <View style={{ marginTop: space.xxl }}>
          <Button title={t("mob.signIn.submit")} onPress={submit} loading={busy} disabled={!ready || locked} />
        </View>

        <View style={s.bottom}>
          <Text style={s.bottomText}>{t("mob.signIn.noAccount")}</Text>
          <Pressable onPress={() => router.replace("/royxat")} hitSlop={8}>
            <Text style={s.link}>{t("mob.intro.signUp")}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.card },
  scroll: { flexGrow: 1, paddingHorizontal: space.xl },

  top: { flexDirection: "row", alignItems: "center" },
  back: { width: 44, height: 44, marginLeft: -12, alignItems: "center", justifyContent: "center" },
  lang: { flexDirection: "row", alignItems: "center", gap: 6, height: 36 },
  langText: { fontSize: 14, fontWeight: "500", color: color.mutedForeground },

  hero: { alignItems: "center", gap: space.md, marginTop: space.xxl },
  title: { fontSize: 24, fontWeight: "700", color: color.foreground, letterSpacing: -0.2 },

  segment: {
    flexDirection: "row",
    gap: 4,
    backgroundColor: color.muted,
    borderRadius: radius.control,
    padding: 3,
    marginTop: 28,
  },
  segItem: { flex: 1, height: 40, alignItems: "center", justifyContent: "center", borderRadius: 6 },
  segOn: { backgroundColor: color.card },
  segText: { fontSize: 14, fontWeight: "500", color: color.mutedForeground },
  segTextOn: { fontWeight: "600", color: color.foreground },

  form: { gap: space.lg, marginTop: space.xl },
  phoneRow: { flexDirection: "row", gap: 8, alignItems: "flex-start" },
  cc: {
    width: 92,
    height: 52,
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: color.border,
    alignItems: "center",
    justifyContent: "center",
  },
  ccText: { fontSize: font.body, fontWeight: "600", color: color.foreground },

  err: { fontSize: 13, color: color.danger, marginTop: -8 },
  link: { fontSize: 14, fontWeight: "600", color: color.brand },

  bottom: { flexDirection: "row", justifyContent: "center", gap: 5, marginTop: space.xl, paddingTop: space.sm },
  bottomText: { fontSize: 14, color: color.mutedForeground },
});
