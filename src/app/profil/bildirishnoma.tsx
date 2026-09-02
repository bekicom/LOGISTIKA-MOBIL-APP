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

type Channel = "inApp" | "push" | "email" | "sms" | "sound";
type Prefs = Record<string, Partial<Record<Channel, boolean>>>;

/** Serverdagi kategoriyalar — `furam/src/lib/notify.ts` bilan bir xil */
const CATEGORIES: { key: string; label: string; hint: string }[] = [
  { key: "TRIP", label: "Reys holati", hint: "Yuklandi, chegarada, yetib bordi" },
  { key: "TASK", label: "Vazifalar", hint: "Sizga topshirilgan ishlar" },
  { key: "PROBLEM", label: "Muammolar", hint: "Reysda nosozlik yoki kechikish" },
  { key: "CONTRACT", label: "Taklif va shartnoma", hint: "Kimdir narx taklif qilganda" },
  { key: "DOC", label: "Hujjat muddati", hint: "30, 7 va 1 kun qolganda" },
  { key: "PAYMENT", label: "To'lov", hint: "Pul kelganda yoki kutilganda" },
  { key: "BORDER", label: "Chegara ogohlantirishi", hint: "Navbat uzayganda" },
  { key: "ALERT", label: "Muhim ogohlantirish", hint: "SOS va shoshilinch xabarlar" },
  { key: "TECH", label: "Texnik holat", hint: "Mashina va texnik ko'rik" },
  { key: "SYSTEM", label: "Tizim xabarlari", hint: "Yangilanish va e'lonlar" },
];

const CHANNELS: { key: Channel; label: string; hint?: string }[] = [
  { key: "push", label: "Telefonda (push)" },
  { key: "inApp", label: "Ilova ichida" },
  { key: "sound", label: "Ovoz" },
  { key: "email", label: "E-mail" },
  { key: "sms", label: "SMS", hint: "Faqat eng muhimlari — SMS pullik" },
];

/** Kategoriya yoqilganda tiklanadigan standart kanallar */
const ON_BY_DEFAULT: Channel[] = ["inApp", "push"];

const anyOn = (c: Partial<Record<Channel, boolean>> | undefined) =>
  !!c && CHANNELS.some((ch) => c[ch.key]);

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
      setFailed((e as FuramError).message ?? "Saqlanmadi");
    } finally {
      setSaving(false);
    }
  }

  function toggleCategory(key: string, on: boolean) {
    const next: Prefs = { ...prefs };
    if (on) {
      const old = prefs[key] ?? {};
      // Ilgari tanlangani bo'lsa o'shani, bo'lmasa standartni qaytaramiz
      const restore = CHANNELS.some((c) => old[c.key] !== undefined)
        ? Object.fromEntries(CHANNELS.map((c) => [c.key, !!old[c.key]]))
        : Object.fromEntries(CHANNELS.map((c) => [c.key, ON_BY_DEFAULT.includes(c.key)]));
      next[key] = anyOn(restore as Partial<Record<Channel, boolean>>)
        ? (restore as Partial<Record<Channel, boolean>>)
        : Object.fromEntries(CHANNELS.map((c) => [c.key, ON_BY_DEFAULT.includes(c.key)]));
    } else {
      next[key] = Object.fromEntries(CHANNELS.map((c) => [c.key, false]));
    }
    void push(next);
  }

  /** Kanal kaliti — faqat YOQIQ kategoriyalarga ta'sir qiladi */
  function toggleChannel(ch: Channel, on: boolean) {
    const next: Prefs = { ...prefs };
    for (const c of CATEGORIES) {
      if (!anyOn(next[c.key])) continue;
      next[c.key] = { ...next[c.key], [ch]: on };
    }
    void push(next);
  }

  const channelOn = (ch: Channel) => {
    const live = CATEGORIES.filter((c) => anyOn(prefs[c.key]));
    return live.length > 0 && live.some((c) => prefs[c.key]?.[ch]);
  };

  return (
    <View style={s.root}>
      <Header
        title="Bildirishnomalar"
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
              <GroupLabel>NIMA HAQIDA XABAR BERILSIN</GroupLabel>
              <Card>
                {CATEGORIES.map((c, i) => (
                  <ListRow
                    key={c.key}
                    last={i === CATEGORIES.length - 1}
                    title={c.label}
                    hint={c.hint}
                    right={
                      <Switch
                        value={anyOn(prefs[c.key])}
                        onValueChange={(v) => toggleCategory(c.key, v)}
                      />
                    }
                  />
                ))}
              </Card>
            </View>

            <View>
              <GroupLabel>QAYSI YO&apos;L BILAN</GroupLabel>
              <Card>
                {CHANNELS.map((ch, i) => (
                  <ListRow
                    key={ch.key}
                    last={i === CHANNELS.length - 1}
                    title={ch.label}
                    hint={ch.hint}
                    right={
                      <Switch value={channelOn(ch.key)} onValueChange={(v) => toggleChannel(ch.key, v)} />
                    }
                  />
                ))}
              </Card>
              <Text style={s.under}>
                Yoqilgan bo&apos;limlarning hammasiga qo&apos;llanadi.
              </Text>
            </View>

            <View style={s.note}>
              <Text style={s.noteTitle}>Nega ikki bosqich</Text>
              <Text style={s.noteBody}>
                Har bo&apos;lim uchun beshta kalit qo&apos;yilsa 50 ta kalit
                chiqardi — telefonda hech kim uni sozlamaydi. Shuning uchun
                avval «nima haqida», keyin «qaysi yo&apos;l bilan».
              </Text>
              <Text style={s.noteBody}>
                Push bildirishnoma telefon sozlamalarida ham yoqiq bo&apos;lishi
                kerak. Bu ruxsat App Store va Play Market&apos;dan o&apos;rnatilgan
                ilovada so&apos;raladi.
              </Text>
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
