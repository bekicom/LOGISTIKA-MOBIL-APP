/**
 * Saqlangan qidiruvlar — yangi e'lon chiqqanda xabar keladi.
 * Webdagi `/profile/qidiruvlar` juftligi (TZ-03, 2026-09-19 da qayta yozildi).
 *
 * ── NIMA UCHUN RO'YXAT KERAK ────────────────────────────────────
 *
 * Saqlash tugmasi bor-u ro'yxat bo'lmasa, odam nechta qidiruv
 * saqlaganini bilmaydi va chegaraga (20 ta) yetganda «nega
 * saqlanmadi» degan savol bilan qolardi. Ustiga keraksizini
 * o'chirish yo'li ham bo'lmasdi — xabarlar esa kelaverardi.
 * Chegara sarlavhada: «3 / 20».
 *
 * ── QATOR — SO'Z BILAN, SONI BILAN ──────────────────────────────
 *
 * Ilgari qatorda faqat odam qo'ygan nom yoki «3 ta shart» turardi:
 * server joy ID larini xom qaytarardi. Endi server o'quvchi tilida
 * nom (Toshkent → Moskva · Tent) va HOZIR nechta mos e'lon borligini
 * beradi. Qatorni bosish — o'sha qidiruv bilan lenta; xabarni
 * yoqish/o'chirish va o'chirish shu yerda (lentadagi yorliqda barmoq
 * uchun joy yo'q).
 *
 * Ikkalasi ham bosilgan zahoti ko'rinadi — server javobi kutilmaydi,
 * xato bo'lsa holat qaytadi.
 *
 * ── LENTAGA QAYTISH — `dismissTo` ───────────────────────────────
 *
 * `push` lentaning IKKINCHI nusxasini ochardi (tablar ustiga yana
 * tablar). `dismissTo` lenta orqada tursa o'shanga qaytadi, bo'lmasa
 * shu ekran o'rnini egallaydi.
 */
import { useCallback, useMemo, useState } from "react";
import { Alert, FlatList, Pressable, RefreshControl, Switch, View } from "react-native";
import { Text } from "@/components/Text";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Icon } from "@/components/Icon";
import { Header } from "@/components/ui";
import { Empty, ErrorBox, Skeleton } from "@/components/state";
import { api, FuramError } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import type { SaqlanganQidiruv } from "@/lib/saqlangan-qidiruv";
import { color, radius, shadow, space, themed } from "@/lib/theme";
import { t } from "@/lib/i18n";

type Javob = { rows: SaqlanganQidiruv[]; max: number; jami?: number };

export default function SaqlanganQidiruvlar() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data, loading, error, refreshing, refresh, reload } = useApi<Javob>("/api/saved-search");

  /* Server javobidan oldin ko'rinadigan holat (xato bo'lsa qaytadi) */
  const [xabar, setXabar] = useState<Record<string, boolean>>({});
  const [olindi, setOlindi] = useState<Record<string, true>>({});

  /* Yuk qidiruvlari tepada, transport pastda — webdagi guruhlar */
  const rows = useMemo(() => {
    const bor = (data?.rows ?? []).filter((r) => !olindi[r.id]);
    return [...bor.filter((r) => r.kind === "load"), ...bor.filter((r) => r.kind === "truck")];
  }, [data, olindi]);

  const notify = useCallback(async (id: string, on: boolean) => {
    setXabar((x) => ({ ...x, [id]: on }));
    try {
      await api("/api/saved-search", { method: "POST", body: { action: "notify", id, on } });
    } catch (e) {
      setXabar((x) => ({ ...x, [id]: !on }));
      Alert.alert(t("mob.common.failed"), (e as FuramError).message ?? "");
    }
  }, []);

  const remove = useCallback(async (id: string) => {
    setOlindi((o) => ({ ...o, [id]: true }));
    try {
      await api("/api/saved-search", { method: "POST", body: { action: "remove", id } });
    } catch (e) {
      setOlindi((o) => {
        const n = { ...o };
        delete n[id];
        return n;
      });
      Alert.alert(t("mob.common.failed"), (e as FuramError).message ?? "");
    }
  }, []);

  const och = useCallback(
    (r: SaqlanganQidiruv) =>
      router.dismissTo({ pathname: r.kind === "load" ? "/yuklar" : "/mashinalar", params: { qidiruv: r.id } }),
    [router],
  );

  return (
    <View style={s.root}>
      <Header title={t("mob.ssearch.title")} subtitle={data ? `${rows.length} / ${data.max}` : undefined} />

      {loading && !data ? (
        <View style={{ padding: space.lg }}>
          <Skeleton rows={3} />
        </View>
      ) : error && !data ? (
        <View style={{ padding: space.lg }}>
          <ErrorBox message={error} onRetry={reload} />
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(x) => x.id}
          contentContainerStyle={[s.list, { paddingBottom: insets.bottom + space.xxl }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={color.brand} />}
          ListEmptyComponent={
            <Empty
              icon="search"
              title={t("mob.ssearch.emptyTitle")}
              text={t("mob.ssearch.emptyText")}
              actionLabel={t("mob.nav.loads")}
              onAction={() => router.dismissTo("/yuklar")}
            />
          }
          renderItem={({ item, index }) => {
            const on = xabar[item.id] ?? item.notify;
            return (
              <View style={s.item}>
                {/* Guruh sarlavhasi — tur almashgan joyda */}
                {index === 0 || rows[index - 1].kind !== item.kind ? (
                  <Text style={s.guruh}>{t(`mob.ssearch.kind.${item.kind}`)}</Text>
                ) : null}

                <View style={s.card}>
                  <Pressable
                    onPress={() => och(item)}
                    accessibilityRole="button"
                    style={({ pressed }) => [s.top, pressed && { opacity: 0.7 }]}
                  >
                    <View style={s.icon}>
                      <Icon name={item.kind === "load" ? "package" : "truck"} size={18} stroke={color.brand} />
                    </View>
                    <Text style={s.name} numberOfLines={2}>
                      {item.nomi || t("saveSearch.any")}
                    </Text>
                    {/* Hozir nechta mos e'lon bor */}
                    <View style={s.soni}>
                      <Text style={s.soniText}>{item.soni}</Text>
                    </View>
                    <Icon name="chevron" size={16} stroke={color.mutedForeground} />
                  </Pressable>

                  <View style={s.bottom}>
                    <Pressable onPress={() => void notify(item.id, !on)} style={s.notify}>
                      <Icon name="bell" size={15} stroke={on ? color.brand : color.mutedForeground} />
                      <Text style={[s.notifyText, !on && { color: color.mutedForeground }]}>
                        {on ? t("saveSearch.notifyOn") : t("saveSearch.notifyOff")}
                      </Text>
                    </Pressable>
                    <Switch
                      value={on}
                      onValueChange={(v) => void notify(item.id, v)}
                      accessibilityLabel={on ? t("saveSearch.notifyOn") : t("saveSearch.notifyOff")}
                    />
                    <View style={s.sep} />
                    <Pressable
                      onPress={() => void remove(item.id)}
                      hitSlop={8}
                      accessibilityRole="button"
                      accessibilityLabel={t("saveSearch.remove")}
                      style={({ pressed }) => [s.del, pressed && { opacity: 0.6 }]}
                    >
                      <Icon name="trash" size={17} stroke={color.danger} />
                    </Pressable>
                  </View>
                </View>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const s = themed(() => ({
  root: { flex: 1, backgroundColor: color.background },
  list: { padding: space.lg, gap: 10 },
  item: { gap: 8 },

  guruh: {
    marginTop: 6,
    fontSize: 10.5,
    fontWeight: "800",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: color.mutedForeground,
  },
  card: { backgroundColor: color.card, borderRadius: radius.card, ...shadow.card },
  top: { flexDirection: "row", alignItems: "center", gap: 11, padding: space.md },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: color.brandSoft,
  },
  name: { flex: 1, fontSize: 13.5, lineHeight: 18, fontWeight: "700", color: color.foreground },
  soni: {
    minWidth: 28,
    height: 24,
    paddingHorizontal: 7,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: color.brandSoft,
  },
  soniText: { fontSize: 12, fontWeight: "800", color: color.brandText, fontVariant: ["tabular-nums"] },

  bottom: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingLeft: space.md,
    paddingRight: 6,
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: color.border,
  },
  notify: { flex: 1, flexDirection: "row", alignItems: "center", gap: 7, minHeight: 36 },
  notifyText: { fontSize: 12.5, fontWeight: "600", color: color.foreground },
  sep: { width: 1, height: 22, backgroundColor: color.border },
  del: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
}));
