/**
 * Kompaniya rekvizitlari (mijoz TZ'si 9-band).
 *
 * Shartnoma va hisob-fakturada shu ma'lumot ishlatiladi. Jismoniy
 * shaxsda bo'sh qoladi — majburiy maydon yo'q, bo'sh satr serverda
 * `null` bo'lib yoziladi (maydonni tozalash).
 */
import { useEffect, useState } from "react";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "@/components/Text";
import { Icon } from "@/components/Icon";
import { Button, Field, Header, Notice } from "@/components/ui";
import { Skeleton } from "@/components/state";
import { api, FuramError } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { color, radius, shadow, space, themed } from "@/lib/theme";
import { t } from "@/lib/i18n";

type Company = {
  companyName: string;
  companyTin: string;
  companyDir: string;
  businessLine: string;
  companyAddr: string;
  bankName: string;
  bankAccount: string;
  bankMfo: string;
};

const EMPTY: Company = {
  companyName: "", companyTin: "", companyDir: "", businessLine: "",
  companyAddr: "", bankName: "", bankAccount: "", bankMfo: "",
};

/* Tartib web'dagidek: avval kim, keyin qayerda, oxirida bank */
const FIELDS: { key: keyof Company; label: string; max: number; multiline?: boolean }[] = [
  { key: "companyName", label: "mob.company.name", max: 150 },
  { key: "companyTin", label: "mob.company.tin", max: 20 },
  { key: "companyDir", label: "mob.company.dir", max: 100 },
  { key: "businessLine", label: "mob.company.line", max: 150 },
  { key: "companyAddr", label: "mob.company.addr", max: 300, multiline: true },
  { key: "bankName", label: "mob.company.bank", max: 150 },
  { key: "bankAccount", label: "mob.company.account", max: 30 },
  { key: "bankMfo", label: "mob.company.mfo", max: 10 },
];

export default function Kompaniya() {
  const insets = useSafeAreaInsets();
  const { data, loading } = useApi<Company>("/api/profile/company");
  const [f, setF] = useState<Company>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (data) setF({ ...EMPTY, ...data });
  }, [data]);

  function set(k: keyof Company, v: string) {
    setF((p) => ({ ...p, [k]: v }));
    setSaved(false);
  }

  async function save() {
    setBusy(true);
    setErr(null);
    try {
      await api("/api/profile/company", { method: "PATCH", body: f });
      setSaved(true);
    } catch (e) {
      setErr((e as FuramError).message ?? t("mob.msg.actionFailed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={s.root}>
      <Header title={t("mob.company.title")} />
      <ScrollView
        contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + space.xxl }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={s.hint}>{t("mob.company.hint")}</Text>

        {loading && !data ? (
          <Skeleton rows={2} />
        ) : (
          <View style={s.card}>
            {FIELDS.map((x) => (
              <Field
                key={x.key}
                label={t(x.label)}
                value={f[x.key]}
                onChangeText={(v) => set(x.key, v)}
                maxLength={x.max}
                multiline={x.multiline}
                style={x.multiline ? { minHeight: 62, textAlignVertical: "top" } : undefined}
                keyboardType={x.key === "companyTin" || x.key === "bankAccount" || x.key === "bankMfo" ? "number-pad" : "default"}
              />
            ))}
          </View>
        )}

        {err ? <Notice tone="danger">{err}</Notice> : null}
        {saved ? (
          <View style={s.saved}>
            <Icon name="check" size={15} stroke={color.success} />
            <Text style={s.savedText}>{t("mob.company.saved")}</Text>
          </View>
        ) : null}

        <Button title={t("mob.common.save")} onPress={save} loading={busy} />
      </ScrollView>
    </View>
  );
}

const s = themed(() => ({
  root: { flex: 1, backgroundColor: color.background },
  scroll: { padding: space.lg, gap: space.md },
  hint: { fontSize: 13, color: color.mutedForeground, lineHeight: 19 },
  card: { backgroundColor: color.card, borderRadius: radius.card, padding: space.lg, gap: space.md, ...shadow.card },
  saved: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "center" },
  savedText: { fontSize: 13, fontWeight: "700", color: color.success },
}));
