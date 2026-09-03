/**
 * H2 — papka ichi.
 *
 * Papkalar ro'yxati bor edi, ichiga kirish yo'li yo'q edi: telefonda
 * papka ko'rinardi-yu, ochilmasdi.
 *
 * SHAXSIY HUJJATLARDAN AJRATILGAN. `hujjatlarim` ekranida prava,
 * pasport va tibbiy — ular muddat bo'yicha kuzatiladi va «tayyorlik»
 * hisobi bor. Papkada esa ixtiyoriy hujjat yotadi; muddat bo'lsa
 * ko'rsatiladi, bo'lmasa jim o'tiladi. Ikkalasini bitta ro'yxatga
 * qo'shsak, «2/3 tayyor» degan hisob ma'nosini yo'qotardi.
 */
import { Linking, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";
import { Card, Header, ListRow } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { Empty, ErrorBox, Skeleton } from "@/components/state";
import { API_BASE } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { t } from "@/lib/i18n";
import { color, space } from "@/lib/theme";

type Doc = {
  id: string;
  name: string;
  kind: string | null;
  number: string | null;
  isImage: boolean;
  size: number | null;
  expiresAt: string | null;
  state: "ok" | "soon" | "expired" | "forever" | null;
  days: number | null;
  createdAt: string;
};

type Data = {
  folder: { id: string; name: string; createdAt: string };
  documents: Doc[];
};

const kb = (n: number | null) =>
  n == null ? null : n > 1_048_576 ? `${(n / 1_048_576).toFixed(1)} MB` : `${Math.round(n / 1024)} KB`;

export default function Papka() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { data, loading, error, refreshing, refresh, reload } = useApi<Data>(
    id ? `/api/documents/folders/${id}` : null,
    [id],
  );

  return (
    <View style={s.root}>
      <Header
        title={data?.folder.name ?? t("mob.folder.title")}
        subtitle={
          data ? t("mob.folder.count", { n: data.documents.length }) : undefined
        }
      />

      <ScrollView
        contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + space.xxl }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={color.brand} />
        }
      >
        {loading && !data ? (
          <Skeleton rows={3} />
        ) : error ? (
          <ErrorBox message={error} onRetry={reload} />
        ) : !data?.documents.length ? (
          <Empty icon="doc" title={t("mob.folder.empty")} text={t("mob.folder.emptyText")} />
        ) : (
          <Card>
            {data.documents.map((d, i) => (
              <ListRow
                key={d.id}
                icon={
                  <View style={[s.badge, d.state ? tone(d.state) : null]}>
                    <Icon
                      name="doc"
                      size={17}
                      stroke={d.state ? toneInk(d.state) : color.mutedForeground}
                    />
                  </View>
                }
                title={d.name}
                hint={
                  [
                    d.number,
                    kb(d.size),
                    /* Muddat FAQAT bor bo'lsa. Yo'q bo'lsa «muddatsiz»
                       deb yozmaymiz — papkadagi hujjatning ko'pida u
                       umuman bo'lmaydi va har qatorga qo'shilsa,
                       chinakam muddatlar ko'zga tashlanmay qolardi. */
                    d.state === "expired"
                      ? t("mob.panel.expiredAgo", { n: Math.abs(d.days ?? 0) })
                      : d.state === "soon"
                        ? t("mob.panel.expiresIn", { n: d.days ?? 0 })
                        : null,
                  ]
                    .filter(Boolean)
                    .join(" · ") || undefined
                }
                last={i === data.documents.length - 1}
                onPress={() => void Linking.openURL(`${API_BASE}/api/documents/${d.id}`)}
              />
            ))}
          </Card>
        )}
      </ScrollView>
    </View>
  );
}

const tone = (state: string) => ({
  backgroundColor:
    (state === "expired" ? color.danger : state === "soon" ? color.warning : color.success) + "1f",
});
const toneInk = (state: string) =>
  state === "expired" ? color.danger : state === "soon" ? color.warning : color.success;

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.background },
  scroll: { padding: space.lg, gap: space.md },
  badge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: color.muted,
    alignItems: "center",
    justifyContent: "center",
  },
});
