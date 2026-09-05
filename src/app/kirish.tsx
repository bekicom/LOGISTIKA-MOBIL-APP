/** A6 — kirish. Telefon yoki FURAM ID + parol. */
import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Svg, { Circle, Path } from "react-native-svg";
import {
  AuthTexture,
  BackButton,
  DarkInput,
  EyeButton,
  GlassPanel,
  LabeledDarkInput,
  PrimaryAction,
  SecondaryAction,
} from "@/components/AuthDesign";
import { Logo } from "@/components/Logo";
import { api, FuramError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { color, font, space } from "@/lib/theme";
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
  const cleanPhone = phone.replace(/\D/g, "");
  const locked = err?.code === "TOO_MANY_ATTEMPTS" || err?.code === "BLOCKED";
  const ready = password.length > 0 && (mode === "phone" ? cleanPhone.length >= 9 : furamId.length > 0);

  async function submit() {
    setErr(null);
    setBusy(true);
    try {
      const body =
        mode === "phone"
          ? { phone: "+998" + cleanPhone, password }
          : { furamId: Number(furamId), password };

      const res = await api<{ token?: string }>("/api/auth/login", {
        method: "POST",
        auth: false,
        body,
      });

      if (!res.token) {
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

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <AuthTexture />
      <ScrollView
        contentContainerStyle={[
          s.scroll,
          { paddingTop: insets.top + space.xs, paddingBottom: insets.bottom + space.xl },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={s.header}>
          <BackButton onPress={() => router.back()} />
          <Pressable onPress={() => router.push("/til")} style={s.lang} hitSlop={8}>
            <Svg width={16} height={16} viewBox="0 0 24 24">
              <Circle cx={12} cy={12} r={10} stroke="#9eb5d5" strokeWidth={2} fill="none" />
              <Path d="M2 12h20M12 2a15 15 0 0 1 0 20 15 15 0 0 1 0-20z" stroke="#9eb5d5" strokeWidth={2} fill="none" />
            </Svg>
            <Text style={s.langText}>{LOCALE_INFO[currentLocale()].native}</Text>
          </Pressable>
        </View>

        <View style={s.hero}>
          <Logo width={166} light />
          <Text style={s.caption}>A6 · KIRISH</Text>
          <Text style={s.title}>{t("mob.signIn.title")}</Text>
          <Text style={s.sub}>Hisobingizga xavfsiz kiring va ishni davom ettiring.</Text>
        </View>

        <GlassPanel style={s.panel}>
          <View style={s.segment}>
            <SegmentButton label={t("mob.signIn.byPhone")} active={mode === "phone"} onPress={() => setMode("phone")} />
            <SegmentButton label="FURAM ID" active={mode === "furamId"} onPress={() => setMode("furamId")} />
          </View>

          {locked ? <LockedCard message={err?.message ?? t("mob.signIn.blocked")} /> : null}

          {mode === "phone" ? (
            <View>
              <Text style={s.label}>{t("mob.signIn.byPhone")}</Text>
              <View style={s.phoneRow}>
                <View style={s.cc}>
                  <Text style={s.ccText}>+998</Text>
                </View>
                <DarkInput
                  style={{ flex: 1 }}
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
            <LabeledDarkInput
              label="FURAM ID"
              placeholder="11186"
              keyboardType="number-pad"
              value={furamId}
              onChangeText={setFuramId}
              editable={!locked}
            />
          )}

          <LabeledDarkInput
            label={t("mob.signIn.password")}
            placeholder={t("mob.signIn.passwordPh")}
            secureTextEntry={!show}
            autoComplete="current-password"
            textContentType="password"
            value={password}
            onChangeText={setPassword}
            editable={!locked}
            right={<EyeButton shown={show} onPress={() => setShow((v) => !v)} />}
          />

          {err && !locked ? <Text style={s.err}>{err.message}</Text> : null}

          <Pressable hitSlop={8} onPress={() => router.push("/parol")} accessibilityRole="button">
            <Text style={s.link}>{t("mob.signIn.forgot")}</Text>
          </Pressable>
        </GlassPanel>

        <View style={s.actions}>
          <PrimaryAction title={t("mob.signIn.submit")} onPress={submit} loading={busy} disabled={!ready || locked} />
          <SecondaryAction title={t("mob.intro.signUp")} onPress={() => router.replace("/royxat")} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function SegmentButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[s.segItem, active && s.segOn]}>
      <Text style={[s.segText, active && s.segTextOn]}>{label}</Text>
    </Pressable>
  );
}

function LockedCard({ message }: { message: string }) {
  return (
    <View style={s.locked}>
      <View style={s.lockIcon}>
        <Svg width={24} height={24} viewBox="0 0 24 24">
          <Path d="M7 10V8a5 5 0 0 1 10 0v2M6 10h12v10H6z" stroke="#ffffff" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </Svg>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.lockTitle}>{t("mob.signIn.blocked")}</Text>
        <Text style={s.lockText}>{message}</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.navy },
  scroll: { flexGrow: 1, paddingHorizontal: space.xl },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 48 },
  lang: { flexDirection: "row", alignItems: "center", gap: 7, minHeight: 40 },
  langText: { fontSize: 14, fontWeight: "700", color: "#9eb5d5" },
  hero: { alignItems: "center", marginTop: 28, marginBottom: 26 },
  caption: { fontSize: 12, fontWeight: "800", color: "#8fa7c7", letterSpacing: 0.8, marginTop: 24 },
  title: { fontSize: 34, lineHeight: 40, fontWeight: "800", color: "#ffffff", marginTop: 8 },
  sub: { fontSize: font.body, color: "#a9bddc", textAlign: "center", marginTop: 9, lineHeight: 23 },
  panel: { gap: space.lg },
  segment: { flexDirection: "row", gap: 6, padding: 4, borderRadius: 15, backgroundColor: "#0c1f3a" },
  segItem: { flex: 1, minHeight: 42, borderRadius: 12, alignItems: "center", justifyContent: "center", paddingHorizontal: 8 },
  segOn: { backgroundColor: color.brand },
  segText: { fontSize: 14, fontWeight: "800", color: "#9eb5d5" },
  segTextOn: { color: "#ffffff" },
  label: { fontSize: font.caption, fontWeight: "700", color: "#ffffff", marginBottom: 8 },
  phoneRow: { flexDirection: "row", gap: 9 },
  cc: {
    width: 94,
    height: 56,
    borderRadius: 14,
    borderWidth: 1.2,
    borderColor: "#33577f",
    backgroundColor: "#0c1f3a",
    alignItems: "center",
    justifyContent: "center",
  },
  ccText: { fontSize: font.bodyLg, fontWeight: "800", color: "#ffffff" },
  link: { fontSize: 14.5, fontWeight: "800", color: color.brand, textAlign: "right" },
  err: { fontSize: 13, color: "#ff9b73", lineHeight: 19 },
  locked: {
    flexDirection: "row",
    gap: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1.2,
    borderColor: "#f45a18",
    backgroundColor: "rgba(244, 90, 24, 0.12)",
  },
  lockIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: color.brand,
    alignItems: "center",
    justifyContent: "center",
  },
  lockTitle: { fontSize: font.body, fontWeight: "800", color: "#ffffff" },
  lockText: { fontSize: 12.5, color: "#ffd2c0", lineHeight: 18, marginTop: 3 },
  actions: { gap: 12, marginTop: space.xxl },
});
