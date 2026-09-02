/**
 * I3 — bildirishnoma sozlamalari.
 *
 * IKKI BOSQICHLI: «nima haqida» va «qaysi yo'l bilan».
 *
 * Serverda sozlama aslida MATRITSA: har kategoriya uchun alohida
 * beshta kanal (`furam/src/lib/notify.ts`). Ya'ni 10 × 5 = 50 ta
 * kalit. Telefonda buni hech kim sozlamaydi — ekran cheksiz
 * cho'ziladi va odam birinchi ekrandayoq voz kechadi.
 *
 * Shuning uchun ikkiga bo'lindi:
 *   • kategoriya kaliti — o'sha kategoriyada BIROR kanal yoqiqmi;
 *     o'chirilsa hammasi o'chadi, yoqilsa standart kanallar qaytadi.
 *   • kanal kaliti — YOQIQ kategoriyalarning hammasiga qo'llanadi.
 *
 * Matritsa buzilmaydi: server o'sha shaklni oladi va web'dagi
 * batafsil sozlama ishlayveradi.
 */
import { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { Card, GroupLabel, Header, ListRow, Switch } from "@/components/ui";
import { ErrorBox, Skeleton } from "@/components/state";
import { api, FuramError } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { color, font, radius, space } from "@/lib/theme";
import { notifyCategoryHint, notifyCategoryLabel, notifyChannelLabel, t } from "@/lib/i18n";

type Prefs = Record<string, Partial<Record<Channel, boolean>>>;

/* Bo'lim va kanal KALITLARI — `furam/src/lib/notify.ts` bilan bir
   xil to'plam. Nomlari bu yerda yozilmaydi: tarjima lug'atda
   (`mob.notifyCat.*`), aks holda sakkiz til ikki joyda yurardi. */
const CATEGORIES = [
  "TRIP", "TASK", "PROBLEM", "CONTRACT", "DOC",
  "PAYMENT", "BORDER", "ALERT", "TECH", "SYSTEM",
] as const;

const CHANNELS = ["push", "inApp", "sound", "email", "sms"] as const;
type Channel = (typeof CHANNELS)[number];

/** Kategoriya yoqilganda tiklanadigan standart kanallar */
const ON_BY_DEFAULT: Channel[] = ["inApp", "push"];

const anyOn = (c: Partial<Record<Channel, boolean>> | undefined) =>
  !!c && CHANNELS.some((ch) => c[ch]);

export default function BildirishnomaSozlama() {
  const { data, loading, error, reload } = useApi<{ channels: Prefs }>("/api/notifications/prefs");
  const [prefs, setPrefs] = useState<Prefs>({});
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState("");

  useEffect(() => {
    if (data?.channels) setPrefs(data.channels);
  }, [data]);

  /* Saqlash DARHOL: telefonda «Saqlash» tugmasi bosilmay qoladi va
     odam sozlaganini yo'qotadi. Xato bo'lsa eski holat qaytariladi. */
  async function push(next: Prefs) {
    const before = prefs;
    setPrefs(next);
    setSaving(true);
    setFailed("");
    try {
      await api("/api/notifications/prefs", { method: "PUT", body: { channels: next } });
    } catch (e) {
      setPrefs(before);
      setFailed((e as FuramError).message ?? t("mob.common.notSaved"));
    } finally {
      setSaving(false);
    }
  }

  function toggleCategory(key: string, on: boolean) {
    const next: Prefs = { ...prefs };
    if (on) {
      const old = prefs[key] ?? {};
      // Ilgari tanlangani bo'lsa o'shani, bo'lmasa standartni qaytaramiz
      const restore = CHANNELS.some((c) => old[c] !== undefined)
        ? Object.fromEntries(CHANNELS.map((c) => [c, !!old[c]]))
        : Object.fromEntries(CHANNELS.map((c) => [c, ON_BY_DEFAULT.includes(c)]));
      next[key] = anyOn(restore as Partial<Record<Channel, boolean>>)
        ? (restore as Partial<Record<Channel, boolean>>)
        : Object.fromEntries(CHANNELS.map((c) => [c, ON_BY_DEFAULT.includes(c)]));
    } else {
      next[key] = Object.fromEntries(CHANNELS.map((c) => [c, false]));
    }
    void push(next);
  }

  /** Kanal kaliti — faqat YOQIQ kategoriyalarga ta'sir qiladi */
  function toggleChannel(ch: Channel, on: boolean) {
    const next: Prefs = { ...prefs };
    for (const c of CATEGORIES) {
      if (!anyOn(next[c])) continue;
      next[c] = { ...next[c], [ch]: on };
    }
    void push(next);
  }

  const channelOn = (ch: Channel) => {
    const live = CATEGORIES.filter((c) => anyOn(prefs[c]));
    return live.length > 0 && live.some((c) => prefs[c]?.[ch]);
  };

  return (
    <View style={s.root}>
      <Header
        title={t("mob.profile.notifications")}
        right={saving ? <ActivityIndicator size="small" color={color.mutedForeground} /> : undefined}
      />

      <ScrollView contentContainerStyle={s.scroll}>
        {loading ? (
          <Skeleton rows={5} />
        ) : error ? (
          <ErrorBox message={error} onRetry={reload} />
        ) : (
          <>
            {failed ? (
              <View style={s.failed}>
                <Text style={s.failedText}>{failed}</Text>
              </View>
            ) : null}

            <View>
              <GroupLabel>{t("mob.notify.aboutWhat")}</GroupLabel>
              <Card>
                {CATEGORIES.map((c, i) => (
                  <ListRow
                    key={c}
                    last={i === CATEGORIES.length - 1}
                    title={notifyCategoryLabel(c)}
                    hint={notifyCategoryHint(c)}
                    right={
                      <Switch value={anyOn(prefs[c])} onValueChange={(v) => toggleCategory(c, v)} />
                    }
                  />
                ))}
              </Card>
            </View>

            <View>
              <GroupLabel>{t("mob.notify.howChannel")}</GroupLabel>
              <Card>
                {CHANNELS.map((ch, i) => (
                  <ListRow
                    key={ch}
                    last={i === CHANNELS.length - 1}
                    title={notifyChannelLabel(ch)}
                    hint={ch === "sms" ? t("mob.notifyChHint.sms") : undefined}
                    right={<Switch value={channelOn(ch)} onValueChange={(v) => toggleChannel(ch, v)} />}
                  />
                ))}
              </Card>
              <Text style={s.under}>{t("mob.notify.appliesAll")}</Text>
            </View>

            <View style={s.note}>
              <Text style={s.noteTitle}>{t("mob.notify.whyTwo")}</Text>
              <Text style={s.noteBody}>{t("mob.notify.whyTwoText")}</Text>
              <Text style={s.noteBody}>{t("mob.notify.pushNote")}</Text>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.background },
  scroll: { padding: space.lg, gap: space.lg, paddingBottom: space.xxl * 2 },

  failed: {
    borderWidth: 1, borderColor: color.danger + "59", backgroundColor: color.danger + "0d",
    borderRadius: radius.control, padding: space.md,
  },
  failedText: { fontSize: font.caption, color: color.danger },

  under: { fontSize: 12, color: color.mutedForeground, marginTop: 6, marginLeft: space.xs },

  note: { borderWidth: 1, borderColor: "#cbd5e1", borderRadius: radius.card, backgroundColor: "#f8fafc", padding: space.lg, gap: 8 },
  noteTitle: { fontSize: font.caption, fontWeight: "600", color: color.foreground },
  noteBody: { fontSize: 12, color: "#475569", lineHeight: 19 },
});
