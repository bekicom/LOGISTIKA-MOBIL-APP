/**
 * Parolni o'zgartirish.
 *
 * Server parol almashgach BOSHQA QURILMALARDAGI seanslarni yopadi —
 * bu ekranda oldindan aytiladi. Hisobni kimdir egallab olgan bo'lsa,
 * parolni almashtirish uni chiqarib yuborishi kerak.
 */
import { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Text } from "@/components/Text";
import { Icon } from "@/components/Icon";
import { Button, Field, Header, Notice } from "@/components/ui";
import { api, FuramError } from "@/lib/api";
import { color, radius, shadow, space, themed } from "@/lib/theme";
import { t } from "@/lib/i18n";

export default function ParolOzgartirish() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [again, setAgain] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const mismatch = again.length > 0 && again !== next;
  const ready = current.length > 0 && next.length >= 8 && next === again;

  async function save() {
    setBusy(true);
    setErr(null);
    try {
      await api("/api/profile/password", {
        method: "POST",
        body: { currentPassword: current, newPassword: next },
      });
      setDone(true);
    } catch (e) {
      setErr((e as FuramError).message ?? t("mob.msg.actionFailed"));
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <View style={s.root}>
        <Header title={t("mob.pwd.title")} />
        <View style={s.doneWrap}>
          <View style={s.doneIcon}>
            <Icon name="check" size={30} stroke={color.success} />
          </View>
          <Text style={s.doneTitle}>{t("mob.pwd.done")}</Text>
          <Text style={s.doneText}>{t("mob.pwd.note")}</Text>
          <View style={{ alignSelf: "stretch", marginTop: space.xl }}>
            <Button title={t("mob.common.back")} onPress={() => router.back()} />
          </View>
        </View>
      </View>
    );
  }

  const eye = (
    <Pressable onPress={() => setShow((v) => !v)} hitSlop={10}>
      <Icon name={show ? "eye-off" : "eye"} size={18} stroke={color.mutedForeground} />
    </Pressable>
  );

  return (
    <View style={s.root}>
      <Header title={t("mob.pwd.title")} />
      <ScrollView
        contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + space.xxl }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={s.card}>
          <Field
            label={t("mob.pwd.current")}
            value={current}
            onChangeText={setCurrent}
            secureTextEntry={!show}
            autoComplete="current-password"
            textContentType="password"
            right={eye}
          />
          <Field
            label={t("mob.pwd.new")}
            hint={t("mob.pwd.min")}
            value={next}
            onChangeText={setNext}
            secureTextEntry={!show}
            autoComplete="new-password"
            textContentType="newPassword"
          />
          <Field
            label={t("mob.pwd.again")}
            value={again}
            onChangeText={setAgain}
            secureTextEntry={!show}
            error={mismatch ? t("mob.pwd.mismatch") : undefined}
          />
        </View>

        {/* Sessiyalar yopilishi OLDINDAN aytiladi, keyin emas */}
        <View style={s.note}>
          <Icon name="shield" size={17} stroke={color.mutedForeground} />
          <Text style={s.noteText}>{t("mob.pwd.note")}</Text>
        </View>

        {err ? <Notice tone="danger">{err}</Notice> : null}

        <Button title={t("mob.common.save")} onPress={save} loading={busy} disabled={!ready} />
      </ScrollView>
    </View>
  );
}

const s = themed(() => ({
  root: { flex: 1, backgroundColor: color.background },
  scroll: { padding: space.lg, gap: space.md },
  card: { backgroundColor: color.card, borderRadius: radius.card, padding: space.lg, gap: space.md, ...shadow.card },
  note: { flexDirection: "row", gap: 10, padding: 14, borderRadius: radius.card, backgroundColor: color.muted },
  noteText: { flex: 1, fontSize: 12.5, color: color.mutedForeground, lineHeight: 18 },
  doneWrap: { alignItems: "center", paddingHorizontal: space.xl, paddingTop: space.xxl },
  doneIcon: { width: 72, height: 72, borderRadius: 24, backgroundColor: color.successSoft, alignItems: "center", justifyContent: "center" },
  doneTitle: { fontSize: 20, fontWeight: "800", color: color.foreground, marginTop: 18 },
  doneText: { fontSize: 14, color: color.mutedForeground, marginTop: 8, textAlign: "center", lineHeight: 20 },
}));
