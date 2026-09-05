/**
 * Rl1 — «Men kimman?» (rollarim).
 *
 * ── ROL — TANLOV EMAS, HOLAT ────────────────────────────────────
 *
 * Bir odamda bir necha rol bo'lishi mumkin va har birining o'z
 * tarifi bor. Shuning uchun bu «tarif tanlash» emas, «rollarimni
 * boshqarish» ekrani: amaldagilari tepada, qo'shish mumkinlari
 * ostida.
 *
 * ── MUDDAT CHIZIQ BILAN ─────────────────────────────────────────
 *
 * «14 kun qoldi» degan raqam shoshirmaydi, tugab borayotgan
 * chiziq esa ko'rinadi.
 *
 * ── TUGAGANDA NIMA BO'LADI ──────────────────────────────────────
 *
 * TZ 25-band: ma'lumot o'chirilmaydi, faqat yangi ish to'xtaydi.
 * Buni aytmasak odam «hammasi yo'qoladi» deb qo'rqadi va shu
 * qo'rquv bilan qaror qiladi.
 */
import { RefreshControl, ScrollView, StyleSheet, Text, View, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Header, Button } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { ErrorBox, Skeleton } from "@/components/state";
import { fmtNum } from "@/components/cards";
import { useApi } from "@/lib/use-api";
import { color, radius, space } from "@/lib/theme";
import { t } from "@/lib/i18n";

/* `accessOf()` shakli — `furam/src/app/api/roles/route.ts`.
   `daysLeft` serverda hisoblanadi: telefon soati noto'g'ri
   bo'lsa muddat ham noto'g'ri chiqardi. */
type Live = {
  roleKey: string;
  status: string;
  daysLeft: number | null;
  tariff: string | null;
};

type Offer = {
  roleKey: string;
  name: string;
  price: number;
  days: number;
  trialDays: number;
};

export default function Rollarim() {
  const insets = useSafeAreaInsets();

  const { data, loading, error, refreshing, refresh, reload } = useApi<{
    live: Live[];
    offers?: Offer[];
  }>("/api/roles");

  const live = data?.live ?? [];
  const offers = (data?.offers ?? []).filter(
    (o) => !live.some((l) => l.roleKey === o.roleKey),
  );

  return (
    <View style={s.root}>
      <Header title={t("mob.roles.title")} subtitle={t("mob.roles.subtitle")} />

      <ScrollView
        contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + space.xxl }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
      >
        {loading && !data ? (
          <Skeleton rows={3} />
        ) : error ? (
          <ErrorBox message={error} onRetry={reload} />
        ) : (
          <>
            {live.length > 0 && (
              <View>
                <Text style={s.group}>{t("mob.roles.liveGroup")}</Text>
                <View style={{ gap: 9 }}>
                  {live.map((r) => {
                    const trial = r.status === "TRIAL";
                    const left = r.daysLeft;
                    /* Sinov muddati qisqa (odatda 3–7 kun),
                       to'lovli tarif esa oylik. Chiziq shu
                       farqni hisobga oladi, aks holda sinov
                       doim «deyarli tugagan» ko'rinardi. */
                    const span = trial ? 7 : 30;
                    const pct = left == null ? 0 : Math.max(2, Math.min(100, (left / span) * 100));
                    const soon = left != null && left <= 5;

                    return (
                      <View key={r.roleKey} style={[s.card, soon && s.cardWarn]}>
                        <View style={s.row}>
                          <View
                            style={[
                              s.icon,
                              { backgroundColor: (soon ? color.warning : color.success) + "1a" },
                            ]}
                          >
                            <Icon
                              name="user"
                              size={21}
                              stroke={soon ? color.warning : color.success}
                            />
                          </View>
                          <View style={{ flexGrow: 1, minWidth: 0 }}>
                            <Text style={s.roleName}>{t(`mob.role.${r.roleKey}`)}</Text>
                            <Text
                              style={[
                                s.roleMeta,
                                { color: soon ? color.warning : color.success },
                              ]}
                            >
                              {[
                                left != null ? t("mob.roles.daysLeft", { n: Math.max(0, left) }) : null,
                                trial ? t("mob.roles.trial") : r.tariff,
                              ]
                                .filter(Boolean)
                                .join(" · ")}
                            </Text>
                          </View>
                        </View>

                        <View style={s.bar}>
                          <View
                            style={[
                              s.barFill,
                              {
                                width: `${pct}%`,
                                backgroundColor: soon ? color.warning : color.success,
                              },
                            ]}
                          />
                        </View>

                        {soon && (
                          <>
                            {/* TUGAGANDA NIMA BO'LADI — TZ 25-band */}
                            <Text style={s.endNote}>{t("mob.roles.endNote")}</Text>
                            <View style={{ marginTop: 11 }}>
                              <Button title={t("mob.roles.extend")} onPress={() => {}} />
                            </View>
                          </>
                        )}
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            {live.length === 0 && (
              <View style={s.card}>
                <Text style={s.emptyTitle}>{t("mob.roles.noneTitle")}</Text>
                <Text style={s.emptyText}>{t("mob.roles.noneHint")}</Text>
              </View>
            )}

            {offers.length > 0 && (
              <View>
                <Text style={s.group}>{t("mob.roles.addGroup")}</Text>
                <View style={[s.card, { padding: 0 }]}>
                  {offers.map((o, i) => (
                    <Pressable
                      key={o.roleKey}
                      style={[s.offer, i < offers.length - 1 && s.offerLine]}
                    >
                      <View style={[s.iconSm, { backgroundColor: color.muted }]}>
                        <Icon name="plus" size={18} stroke={color.mutedForeground} />
                      </View>
                      <View style={{ flexGrow: 1, minWidth: 0 }}>
                        <Text style={s.offerName}>{t(`mob.role.${o.roleKey}`)}</Text>
                        <Text style={s.offerPrice}>
                          {t("mob.roles.priceDays", {
                            sum: fmtNum(o.price),
                            n: o.days,
                          })}
                        </Text>
                      </View>
                      <Icon name="chevron" size={17} stroke={color.mutedForeground} />
                    </Pressable>
                  ))}
                </View>
              </View>
            )}

            {/* ══ TO'LOV WEB'DA ══
                Ilova ichida to'lov App Store komissiyasiga
                tushadi. Shuning uchun tarif brauzerda uzaytiriladi
                va buni yashirmaymiz. */}
            <View style={s.note}>
              <Icon name="alert" size={16} stroke={color.mutedForeground} />
              <Text style={s.noteText}>{t("mob.roles.payNote")}</Text>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.background },
  scroll: { padding: space.lg, gap: space.lg },
  group: {
    fontSize: 12,
    fontWeight: "600",
    color: color.mutedForeground,
    letterSpacing: 0.3,
    marginBottom: 7,
    marginLeft: 4,
  },

  card: {
    backgroundColor: color.card,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.card,
    padding: space.md,
  },
  cardWarn: { borderColor: color.warning + "66" },

  row: { flexDirection: "row", alignItems: "center", gap: 11 },
  icon: { width: 42, height: 42, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  iconSm: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  roleName: { fontSize: 15, fontWeight: "600", color: color.foreground },
  roleMeta: { fontSize: 12, marginTop: 1 },

  bar: { height: 5, borderRadius: 3, backgroundColor: color.muted, marginTop: 11, overflow: "hidden" },
  barFill: { height: "100%", borderRadius: 3 },
  endNote: { fontSize: 12, color: color.mutedForeground, marginTop: 9, lineHeight: 18 },

  emptyTitle: { fontSize: 15, fontWeight: "600", color: color.foreground },
  emptyText: { fontSize: 13, color: color.mutedForeground, marginTop: 4, lineHeight: 19 },

  offer: { flexDirection: "row", alignItems: "center", gap: 12, padding: 13 },
  offerLine: { borderBottomWidth: 1, borderBottomColor: color.muted },
  offerName: { fontSize: 14, fontWeight: "600", color: color.foreground },
  offerPrice: { fontSize: 12, color: color.mutedForeground, marginTop: 1 },

  note: {
    flexDirection: "row",
    gap: 10,
    padding: 14,
    borderRadius: 12,
    backgroundColor: color.mutedForeground + "12",
  },
  noteText: { flex: 1, fontSize: 12.5, color: color.mutedForeground, lineHeight: 19 },
});
