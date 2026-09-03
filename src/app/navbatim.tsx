/**
 * Yuborilmagan yozuvlar — navbat ichi.
 *
 * NEGA KERAK: navbat ko'rinmas bo'lsa, haydovchi «yubordim» deb
 * o'ylab yuraveradi. Bu ekran nima kutayotganini va nima
 * O'TMAGANINI ochiq ko'rsatadi.
 *
 * IKKI XIL HOLAT ARALASHTIRILMAYDI:
 *   KUTMOQDA — aloqa qaytganda o'zi ketadi, qo'l tegizish shart emas.
 *   O'TMADI  — server rad etgan. O'zi hech qachon ketmaydi; odam
 *              qayta urinishi yoki o'chirishi kerak.
 *
 * Ikkinchisi jimgina tashlab yuborilmaydi: haydovchi 400 000 so'mlik
 * chekni kiritgan bo'lsa, u yo'qolgani haqida BILISHI shart.
 */
import { useCallback, useEffect, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Header } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { Empty } from "@/components/state";
import { flush, list, remove, retry, type Job } from "@/lib/outbox";
import { isOnline } from "@/lib/net";
import { t } from "@/lib/i18n";
import { color, font, radius, space } from "@/lib/theme";

export default function Navbatim() {
  const insets = useSafeAreaInsets();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [online, setOnline] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setJobs(await list());
    setOnline(await isOnline());
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function sendNow() {
    setBusy(true);
    await flush();
    await load();
    setBusy(false);
  }

  const waiting = jobs.filter((j) => !j.failed);
  const failed = jobs.filter((j) => j.failed);

  return (
    <View style={s.root}>
      <Header
        title={t("mob.outbox.title")}
        subtitle={online ? t("mob.outbox.online") : t("mob.outbox.offline")}
      />

      <ScrollView
        contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + space.xxl }]}
        refreshControl={<RefreshControl refreshing={busy} onRefresh={load} tintColor={color.brand} />}
      >
        {!jobs.length ? (
          <Empty icon="check" title={t("mob.outbox.empty")} text={t("mob.outbox.emptyText")} />
        ) : (
          <>
            {failed.length ? (
              <>
                <Text style={s.groupBad}>{t("mob.outbox.gFailed", { n: failed.length })}</Text>
                {failed.map((j) => (
                  <View key={j.id} style={[s.card, s.cardBad]}>
                    <View style={s.top}>
                      <Text style={s.kind}>{t(`mob.outboxKind.${j.kind}`)}</Text>
                      <Text style={s.when}>{when(j.createdAt)}</Text>
                    </View>
                    <Text style={s.err}>{j.lastError ?? t("mob.err.generic")}</Text>
                    <View style={s.btns}>
                      <Pressable
                        style={s.btn}
                        onPress={() => retry(j.id).then(load)}
                        accessibilityRole="button"
                      >
                        <Text style={s.btnText}>{t("mob.outbox.retry")}</Text>
                      </Pressable>
                      <Pressable
                        style={s.btn}
                        onPress={() => remove(j.id).then(load)}
                        accessibilityRole="button"
                      >
                        <Text style={[s.btnText, { color: color.danger }]}>
                          {t("mob.outbox.drop")}
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                ))}
              </>
            ) : null}

            {waiting.length ? (
              <>
                <Text style={s.group}>{t("mob.outbox.gWaiting", { n: waiting.length })}</Text>
                {waiting.map((j) => (
                  <View key={j.id} style={s.card}>
                    <View style={s.top}>
                      <Text style={s.kind}>{t(`mob.outboxKind.${j.kind}`)}</Text>
                      <Text style={s.when}>{when(j.createdAt)}</Text>
                    </View>
                    <View style={s.stateRow}>
                      <Icon
                        name={j.priority === 3 ? "alert" : "clock"}
                        size={15}
                        stroke={color.mutedForeground}
                      />
                      <Text style={s.state}>
                        {j.priority === 3
                          ? t("mob.outbox.waitsWifi")
                          : j.tries > 0
                            ? t("mob.outbox.tries", { n: j.tries })
                            : t("mob.outbox.queued")}
                      </Text>
                    </View>
                  </View>
                ))}
              </>
            ) : null}

            {online ? (
              <Pressable style={s.primary} onPress={sendNow} disabled={busy}>
                <Text style={s.primaryText}>
                  {busy ? t("mob.outbox.sendingNow") : t("mob.outbox.sendNow")}
                </Text>
              </Pressable>
            ) : (
              <View style={s.note}>
                <Text style={s.noteText}>{t("mob.outbox.willSend")}</Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function when(ms: number): string {
  const m = Math.max(1, Math.round((Date.now() - ms) / 60000));
  if (m < 60) return t("mob.ago.min", { n: m });
  const h = Math.round(m / 60);
  return h < 24 ? t("mob.ago.hour", { n: h }) : t("mob.ago.day", { n: Math.round(h / 24) });
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.background },
  scroll: { padding: space.lg, gap: space.md },

  group: { fontSize: 12, fontWeight: "700", color: color.mutedForeground, letterSpacing: 0.4 },
  groupBad: { fontSize: 12, fontWeight: "700", color: color.danger, letterSpacing: 0.4 },

  card: {
    backgroundColor: color.card,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.card,
    padding: 14,
  },
  cardBad: { borderColor: color.danger + "66" },
  top: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  kind: { fontSize: font.body, fontWeight: "600", color: color.foreground },
  when: { fontSize: 12, color: color.mutedForeground },

  stateRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 9 },
  state: { fontSize: font.caption, color: color.mutedForeground },
  err: { fontSize: font.caption, color: color.danger, marginTop: 8, lineHeight: 20 },

  btns: { flexDirection: "row", gap: 9, marginTop: 12 },
  btn: {
    flex: 1,
    height: 40,
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: color.border,
    alignItems: "center",
    justifyContent: "center",
  },
  btnText: { fontSize: font.caption, fontWeight: "600", color: "#475569" },

  primary: {
    height: 48,
    borderRadius: radius.control,
    backgroundColor: color.brand,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryText: { fontSize: font.body, fontWeight: "600", color: "#fff" },

  note: {
    padding: 14,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    backgroundColor: "#f8fafc",
  },
  noteText: { fontSize: 12, color: "#475569", lineHeight: 19 },
});
