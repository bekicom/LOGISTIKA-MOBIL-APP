/**
 * «Haydovchi kerak — qiziqasizmi?» bildirishnomasidan (TZ v2 §4.2, 2026-10-27):
 * haydovchi bosadi → mashina egasi bilan suhbat ochiladi. Webdagi
 * `/haydovchi-kerak/[id]` ning o'zi; ruxsat serverda (faqat xabar olgan odam).
 */
import { useEffect, useState } from "react";
import { View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Header } from "@/components/ui";
import { ErrorBox, Skeleton } from "@/components/state";
import { api, FuramError } from "@/lib/api";
import { color, space, themed } from "@/lib/theme";
import { t } from "@/lib/i18n";

export default function HaydovchiKerak() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [xato, setXato] = useState<string | null>(null);
  const [urinish, setUrinish] = useState(0);

  useEffect(() => {
    if (!id) return;
    let tirik = true;
    void api<{ chatId: string }>(`/api/haydovchi-kerak/${encodeURIComponent(id)}`, { method: "POST" })
      .then((r) => {
        if (tirik) router.replace({ pathname: "/suhbat/[id]", params: { id: r.chatId } });
      })
      .catch((e) => tirik && setXato((e as FuramError).message ?? t("mob.err.network")));
    return () => {
      tirik = false;
    };
  }, [id, router, urinish]);

  return (
    <View style={s.root}>
      <Header title={t("haydovchiTop.nomzodlar")} />
      <View style={{ padding: space.lg }}>
        {xato ? <ErrorBox message={xato} onRetry={() => { setXato(null); setUrinish((n) => n + 1); }} /> : <Skeleton rows={2} />}
      </View>
    </View>
  );
}

const s = themed(() => ({
  root: { flex: 1, backgroundColor: color.background },
}));
