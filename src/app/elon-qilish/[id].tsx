/**
 * «Bo'sh mashinangizni e'lon qilaymi?» (TZ v2 §4.4, 2026-10-27).
 *
 * Webdagi `/elon-qilish/[id]` ning o'zi: AI e'lonni avtoparkdan tayyorlab
 * qo'yadi (qayerdan — oxirgi reys tushirilgan joy, qayerga — u boshlangan
 * joy), ega bitta tugma bosadi. Reys tarixi bo'lmasa — e'lon formasi.
 */
import { useState } from "react";
import { View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Text } from "@/components/Text";
import { Button, Header } from "@/components/ui";
import { ErrorBox, Skeleton } from "@/components/state";
import { useApi } from "@/lib/use-api";
import { api, FuramError } from "@/lib/api";
import { color, radius, shadow, space, themed } from "@/lib/theme";
import { t } from "@/lib/i18n";
import { TariffNotice } from "@/components/TariffNotice";
import { tariffBlocked } from "@/lib/features";

type Q = {
  qoralama: {
    vehicleId: string;
    nomi: string;
    capacityT: number | null;
    qayerdan: { id: number; nomi: string } | null;
    qayerga: { id: number; nomi: string } | null;
  };
};

export default function ElonQilish() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data, error, loading, reload } = useApi<Q>(id ? `/api/elon-qilish/${encodeURIComponent(id)}` : null, [id]);
  const [band, setBand] = useState(false);
  const [xato, setXato] = useState<string | null>(null);
  const q = data?.qoralama;

  async function joyla() {
    /* Tarif to'sig'i oldindan aytiladi (5-qoida) — bu oxirgi to'siq */
    if (tariffBlocked("post_truck")) return;
    setBand(true);
    setXato(null);
    try {
      const r = await api<{ slug: string }>(`/api/elon-qilish/${encodeURIComponent(String(id))}`, { method: "POST" });
      router.replace({ pathname: "/mashina/[id]", params: { id: r.slug } });
    } catch (e) {
      setXato((e as FuramError).message ?? t("mob.msg.actionFailed"));
    } finally {
      setBand(false);
    }
  }

  return (
    <View style={s.root}>
      <Header title={t("boshElon.title")} />
      <View style={{ padding: space.lg }}>
        <TariffNotice feature="post_truck" />
        {loading && !data ? <Skeleton rows={2} /> : null}
        {error && !data ? <ErrorBox message={error} onRetry={reload} /> : null}
        {q ? (
          <View style={s.card}>
            <Text style={s.title}>{q.nomi}</Text>
            {q.capacityT != null ? <Text style={s.muted}>{t("boshElon.sigim", { n: q.capacityT })}</Text> : null}
            {q.qayerdan && q.qayerga ? (
              <>
                <Text style={s.text}>
                  {t("boshElon.qayerdan")}: <Text style={s.bold}>{q.qayerdan.nomi}</Text>
                </Text>
                <Text style={s.text}>
                  {t("boshElon.qayerga")}: <Text style={s.bold}>{q.qayerga.nomi}</Text>
                </Text>
                <Button title={t("boshElon.joyla")} onPress={() => void joyla()} loading={band} />
              </>
            ) : (
              <>
                <Text style={s.muted}>{t("boshElon.joyYoq")}</Text>
                <Button title={t("boshElon.formaga")} onPress={() => router.push("/mashina-joylash")} />
              </>
            )}
            {xato ? <Text style={[s.text, { color: color.danger }]}>{xato}</Text> : null}
          </View>
        ) : null}
      </View>
    </View>
  );
}

const s = themed(() => ({
  root: { flex: 1, backgroundColor: color.background },
  card: { padding: space.md, borderRadius: radius.card, backgroundColor: color.card, gap: space.sm, ...shadow.card },
  title: { fontSize: 16, fontFamily: "Manrope_700Bold", color: color.foreground },
  text: { fontSize: 14, color: color.foreground },
  bold: { fontFamily: "Manrope_700Bold" },
  muted: { fontSize: 13, color: color.mutedForeground },
}));
