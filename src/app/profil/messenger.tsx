/**
 * Messenger sozlamalari — suhbat tili va avtomatik tarjima (TZ 02, 9-band).
 * `GET/PATCH /api/profile/chat-lang`.
 */
import { useEffect, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "@/components/Text";
import { Icon } from "@/components/Icon";
import { Header, Notice, Switch } from "@/components/ui";
import { api, FuramError } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { color, radius, shadow, space, themed } from "@/lib/theme";
import { LOCALES, LOCALE_INFO, t } from "@/lib/i18n";

export default function MessengerSozlama() {
  const insets = useSafeAreaInsets();
  const { data, reload } = useApi<{ chatLang: string; autoTranslate: boolean }>("/api/profile/chat-lang");
  const [lang, setLang] = useState("uz");
  const [auto, setAuto] = useState(true);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (data) {
      setLang(data.chatLang);
      setAuto(data.autoTranslate);
    }
  }, [data]);

  async function save(body: { chatLang?: string; autoTranslate?: boolean }) {
    setBusy(true);
    setErr(null);
    setSaved(false);
    try {
      await api("/api/profile/chat-lang", { method: "PATCH", body });
      if (body.chatLang) setLang(body.chatLang);
      if (body.autoTranslate !== undefined) setAuto(body.autoTranslate);
      setSaved(true);
      reload();
    } catch (e) {
      setErr((e as FuramError).message ?? t("mob.msg.actionFailed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={s.root}>
      <Header title={t("mob.chatLang.title")} />
      <ScrollView contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + space.xxl }]}>
        <Text style={s.text}>{t("mob.chatLang.text")}</Text>

        <View style={s.grid}>
          {LOCALES.map((code) => {
            const on = lang === code;
            return (
              <Pressable key={code} onPress={() => save({ chatLang: code })} disabled={busy} style={[s.lang, on && s.langOn]}>
                <Text style={{ fontSize: 22 }}>{LOCALE_INFO[code].flag}</Text>
                <Text style={[s.langText, on && s.langTextOn]}>{LOCALE_INFO[code].native}</Text>
                {on ? <Icon name="check" size={14} stroke="#fff" /> : null}
              </Pressable>
            );
          })}
        </View>

        <View style={s.card}>
          <View style={{ flex: 1 }}>
            <Text style={s.autoTitle}>{t("mob.chatLang.auto")}</Text>
            <Text style={s.autoHint}>{t("mob.chatLang.autoHint")}</Text>
          </View>
          <Switch value={auto} onValueChange={(v) => save({ autoTranslate: v })} disabled={busy} />
        </View>

        {saved ? (
          <View style={s.saved}>
            <Icon name="check" size={15} stroke={color.success} />
            <Text style={s.savedText}>{t("mob.chatLang.saved")}</Text>
          </View>
        ) : null}
        {err ? <Notice tone="danger">{err}</Notice> : null}
      </ScrollView>
    </View>
  );
}

const s = themed(() => ({
  root: { flex: 1, backgroundColor: color.background },
  scroll: { padding: space.lg, gap: space.md },
  text: { fontSize: 13.5, color: color.mutedForeground, lineHeight: 20 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  lang: { width: "48%", flexGrow: 1, flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderRadius: radius.card, backgroundColor: color.card, ...shadow.card },
  langOn: { backgroundColor: color.blue },
  langText: { flex: 1, fontSize: 14, fontWeight: "700", color: color.foreground },
  langTextOn: { color: "#fff" },
  card: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: color.card, borderRadius: radius.card, padding: space.lg, ...shadow.card },
  autoTitle: { fontSize: 15, fontWeight: "700", color: color.foreground },
  autoHint: { fontSize: 12.5, color: color.mutedForeground, marginTop: 3, lineHeight: 18 },
  saved: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "center" },
  savedText: { fontSize: 13, fontWeight: "700", color: color.success },
}));
