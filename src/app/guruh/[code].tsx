/**
 * Guruhga taklif havolasi — `furam://guruh/<kod>` (TZ 28-okt Q67).
 *
 * Web sahifasi (`furam.uz/g/<kod>`) «Ilovada ochish» tugmasi shu yerga
 * olib keladi. Kod haqiqiy bo'lsa guruh nomi va a'zolar soni ko'rinadi,
 * «Qo'shilish» bosilsa suhbat ochiladi.
 */
import { useState } from "react";
import { ScrollView, View } from "react-native";
import { Text } from "@/components/Text";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon } from "@/components/Icon";
import { Button, Header } from "@/components/ui";
import { ErrorBox, Skeleton } from "@/components/state";
import { api, FuramError } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { tariffBlocked } from "@/lib/features";
import { color, radius, shadow, space, themed } from "@/lib/theme";
import { t } from "@/lib/i18n";

export default function GuruhHavola() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [band, setBand] = useState(false);
  const [xato, setXato] = useState<string | null>(null);
  const { data, loading, error, reload } = useApi<{ title: string; members: number }>(
    code ? `/api/chat/guruh/havola?code=${encodeURIComponent(String(code))}` : null,
    [code],
  );

  async function qoshil() {
    if (tariffBlocked("messenger")) return;
    setBand(true);
    setXato(null);
    try {
      const r = await api<{ chatId: string }>("/api/chat/guruh/havola", { method: "POST", body: { code: String(code) } });
      router.replace({ pathname: "/suhbat/[id]", params: { id: r.chatId, title: data?.title ?? "" } });
    } catch (e) {
      setXato((e as FuramError).message ?? t("mob.msg.actionFailed"));
    } finally {
      setBand(false);
    }
  }

  return (
    <View style={s.root}>
      <Header title={t("guruh.inviteTitle")} />
      <ScrollView contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + space.xxl }]}>
        {loading && !data ? <Skeleton rows={2} /> : null}
        {error && !data ? <ErrorBox message={error} onRetry={reload} /> : null}
        {data ? (
          <View style={s.card}>
            <View style={s.badge}>
              <Icon name="users" size={28} stroke={color.blue} />
            </View>
            <Text style={s.title}>{data.title}</Text>
            <Text style={s.sub}>{t("guruh.membersN", { n: data.members })}</Text>
            <View style={{ alignSelf: "stretch", marginTop: space.lg }}>
              <Button title={t("guruh.join")} onPress={() => void qoshil()} loading={band} />
            </View>
            {xato ? <Text style={s.err}>{xato}</Text> : null}
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const s = themed(() => ({
  root: { flex: 1, backgroundColor: color.background },
  scroll: { padding: space.lg },
  card: { backgroundColor: color.card, borderRadius: radius.card, padding: space.xl, alignItems: "center", ...shadow.card },
  badge: { width: 64, height: 64, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: color.blueSoft },
  title: { marginTop: space.md, fontSize: 20, fontWeight: "800", color: color.foreground, textAlign: "center" },
  sub: { marginTop: 4, fontSize: 13, color: color.mutedForeground },
  err: { marginTop: space.sm, fontSize: 13, color: color.danger, textAlign: "center" },
}));
