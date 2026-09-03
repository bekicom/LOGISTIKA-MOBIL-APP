/**
 * N1 — haydovchi paneli.
 *
 * Uchta qaror dizayndan:
 *
 *  1. REYSDA BO'LSA — TUGMA EMAS, FAKT. «Ish qidiryapman» kaliti
 *     reys ustida turmaydi: haydovchi allaqachon yo'lda va bu
 *     holatni kalit bilan o'zgartirib bo'lmaydi.
 *  2. MASOFA «TAXMINIY» DEB YOZILADI. Server `Trip.distanceKm`
 *     yig'indisini beradi, u esa to'g'ri chiziq × yo'l koeffitsienti.
 *     «Bosib o'tilgan yo'l» deb ko'rsatsak, haydovchi haqini shu
 *     raqamga qarab hisoblab, egasi bilan bahslashardi.
 *  3. MUDDATI TUGAGAN HUJJAT KALITNI O'CHIRMAYDI, ogohlantiradi.
 *     Pravani bugun yangilagan bo'lishi mumkin, bazada esa eskisi.
 *
 * Panel bosh sahifani takrorlamaydi: u yerda lenta, bu yerda faqat
 * haydovchining O'ZIGA tegishlisi.
 */
import { useState } from "react";
import {
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch as RNSwitch,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Icon } from "@/components/Icon";
import { ErrorBox, Skeleton } from "@/components/state";
import { api, FuramError } from "@/lib/api";
import { vehiclePhoto } from "@/lib/img";
import { useApi } from "@/lib/use-api";
import { useAuth } from "@/lib/auth-context";
import { t, tripStatusLabel } from "@/lib/i18n";
import { color, font, radius, space } from "@/lib/theme";

type DocItem = { kind: string; state: string; days: number | null };

type Panel = {
  trip: {
    id: string; no: number; status: string; stepIndex: number; stepTotal: number;
    from: string; to: string; cargo: string | null; weightT: number | null;
    placeName: string | null; remainingKm: number | null;
  } | null;
  month: {
    trips: number;
    km: number;
    kmIsEstimate: boolean;
    paid: { currency: string; amount: number }[];
  };
  vehicle: {
    id: string; plate: string; brand: string; model: string | null; type: string;
    capacityT: number | null; photo: string | null;
    alert: { kind: string; state: string; days: number | null } | null;
  } | null;
  docs: { ready: number; total: number; items: DocItem[] };
  employer: { id: string; name: string; since: string } | null;
  resume: { exists: boolean; isActive: boolean; saved: number };
};

const money = (n: number) => new Intl.NumberFormat("ru-RU").format(Math.round(n));

export default function Panelim() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const { data, loading, error, refreshing, refresh, reload } = useApi<Panel>("/api/driver/panel");

  const [seeking, setSeeking] = useState<boolean | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const on = seeking ?? data?.resume.isActive ?? false;

  async function toggle(next: boolean) {
    setSeeking(next);
    setErr(null);
    try {
      await api("/api/driver/panel", { method: "PATCH", body: { seeking: next } });
    } catch (e) {
      setSeeking(!next);
      setErr((e as FuramError).message);
    }
  }

  const name = [user?.firstName, user?.lastName].filter(Boolean).join(" ");
  const initials = (name || "—").slice(0, 2).toUpperCase();

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <View style={s.head}>
        <View style={s.avatar}>
          <Text style={s.avatarText}>{initials}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>{t("mob.panel.title")}</Text>
          <Text style={s.sub} numberOfLines={1}>
            {name}
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + space.xxl }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={color.brand} />
        }
      >
        {loading && !data ? (
          <Skeleton rows={5} />
        ) : error || !data ? (
          <ErrorBox message={error ?? t("mob.err.generic")} onRetry={reload} />
        ) : (
          <>
            {/* Mashina hujjati tugagan bo'lsa — eng tepada */}
            {data.docs.items.some((d) => d.state === "expired") ? (
              <View style={s.alarm}>
                <Icon name="alert" size={20} stroke={color.danger} />
                <View style={{ flex: 1 }}>
                  <Text style={s.alarmTitle}>{t("mob.panel.docExpired")}</Text>
                  <Text style={s.alarmText}>{t("mob.panel.docExpiredText")}</Text>
                  <Pressable style={s.alarmBtn} onPress={() => router.push("/hujjatlarim")}>
                    <Text style={s.alarmBtnText}>{t("mob.panel.fixDocs")}</Text>
                  </Pressable>
                </View>
              </View>
            ) : null}

            {data.trip ? (
              /* ── REYSDA: kalit emas, fakt ── */
              <View style={s.trip}>
                <View style={s.tripHead}>
                  <View style={s.dot} />
                  <Text style={s.tripLabel}>{t("mob.panel.onTrip")}</Text>
                </View>

                <Text style={s.tripRoute}>
                  {data.trip.from} → {data.trip.to}
                </Text>
                <Text style={s.tripSub}>
                  {[
                    `FURAM #${data.trip.no}`,
                    data.trip.cargo,
                    data.trip.weightT != null ? `${data.trip.weightT} t` : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </Text>

                <View style={s.track}>
                  {Array.from({ length: data.trip.stepTotal }, (_, i) => (
                    <View
                      key={i}
                      style={[
                        s.trackStep,
                        { backgroundColor: i <= data.trip!.stepIndex ? color.brand : "rgba(255,255,255,0.18)" },
                      ]}
                    />
                  ))}
                </View>
                <Text style={s.tripWhere}>
                  {[
                    tripStatusLabel(data.trip.status),
                    data.trip.placeName,
                    data.trip.remainingKm != null
                      ? t("mob.panel.kmLeft", { n: data.trip.remainingKm })
                      : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </Text>

                <Pressable
                  style={s.tripBtn}
                  onPress={() => router.push(`/reys/${data.trip!.id}`)}
                  accessibilityRole="button"
                >
                  <Text style={s.tripBtnText}>{t("mob.panel.openTrip")}</Text>
                </Pressable>
              </View>
            ) : (
              <>
                {/* ── REYSSIZ: kalit shu yerda ── */}
                {data.resume.exists ? (
                  <View style={[s.seek, on && s.seekOn]}>
                    <View style={s.seekRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={s.seekTitle}>{t("mob.panel.seeking")}</Text>
                        <Text style={s.seekText}>
                          {on ? t("mob.panel.seekingOn") : t("mob.panel.seekingOff")}
                        </Text>
                      </View>
                      <RNSwitch
                        value={on}
                        onValueChange={toggle}
                        trackColor={{ true: color.success, false: "#cbd5e1" }}
                        thumbColor="#fff"
                      />
                    </View>

                    {err ? <Text style={s.err}>{err}</Text> : null}

                    {data.resume.saved > 0 ? (
                      <Pressable style={s.seekFoot} onPress={() => router.push("/profil")}>
                        <Icon name="heart" size={15} stroke={color.success} />
                        <Text style={s.seekFootText}>
                          {t("mob.panel.savedBy", { n: data.resume.saved })}
                        </Text>
                      </Pressable>
                    ) : null}
                  </View>
                ) : (
                  <View style={s.seek}>
                    <Text style={s.seekTitle}>{t("mob.panel.noResume")}</Text>
                    <Text style={s.seekText}>{t("mob.panel.noResumeText")}</Text>
                    <Pressable style={s.primary} onPress={() => router.push("/profil")}>
                      <Text style={s.primaryText}>{t("mob.panel.makeResume")}</Text>
                    </Pressable>
                  </View>
                )}

                {/* Reys yo'q — harakatga chorlash */}
                <View style={s.empty}>
                  <View style={s.emptyIcon}>
                    <Icon name="truck" size={24} stroke="#94a3b8" />
                  </View>
                  <Text style={s.emptyTitle}>{t("mob.panel.noTrip")}</Text>
                  <Text style={s.emptyText}>{t("mob.panel.noTripText")}</Text>
                  <View style={s.emptyBtns}>
                    <Pressable style={s.primaryHalf} onPress={() => router.push("/yuklar")}>
                      <Text style={s.primaryText}>{t("mob.panel.findLoad")}</Text>
                    </Pressable>
                    <Pressable style={s.ghostHalf} onPress={() => router.push("/mashina-joylash")}>
                      <Text style={s.ghostText}>{t("mob.trucks.post")}</Text>
                    </Pressable>
                  </View>
                </View>
              </>
            )}

            {/* ── SHU OY ── */}
            <View style={s.sec}>
              <Text style={s.secLabel}>{t("mob.panel.thisMonth")}</Text>
              <View style={s.figs}>
                <Fig value={String(data.month.trips)} label={t("mob.panel.tripsDone")} />
                <Fig
                  value={data.month.km ? `${money(data.month.km)} km` : "—"}
                  label={t("mob.panel.kmEstimate")}
                />
                <Fig
                  value={
                    data.month.paid.length
                      ? data.month.paid.map((p) => `${money(p.amount)} ${p.currency}`).join("\n")
                      : "—"
                  }
                  label={t("mob.panel.earned")}
                  good={data.month.paid.length > 0}
                />
              </View>
              <View style={s.hint}>
                <Icon name="alert" size={15} stroke="#94a3b8" />
                <Text style={s.hintText}>{t("mob.panel.kmHint")}</Text>
              </View>
            </View>

            {/* ── MASHINAM ── */}
            {data.vehicle ? (
              <Pressable
                style={s.veh}
                onPress={() => router.push(`/parkim/${data.vehicle!.id}`)}
                accessibilityRole="button"
              >
                {data.vehicle.photo ? (
                  <Image
                    source={vehiclePhoto(data.vehicle.id, data.vehicle.photo)}
                    style={s.vehShot}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={[s.vehShot, s.vehShotEmpty]}>
                    <Icon name="truck" size={22} stroke="#94a3b8" />
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={s.vehPlate}>{data.vehicle.plate}</Text>
                  <Text style={s.vehSub} numberOfLines={1}>
                    {[data.vehicle.brand, data.vehicle.model, data.vehicle.type]
                      .filter(Boolean)
                      .join(" · ")}
                  </Text>
                  {data.vehicle.alert ? (
                    <Text style={s.vehAlert}>
                      {t(`mob.docKind.${data.vehicle.alert.kind}`)} ·{" "}
                      {data.vehicle.alert.state === "expired"
                        ? t("mob.panel.expiredAgo", { n: Math.abs(data.vehicle.alert.days ?? 0) })
                        : t("mob.panel.expiresIn", { n: data.vehicle.alert.days ?? 0 })}
                    </Text>
                  ) : null}
                </View>
                <Icon name="chevron" size={18} stroke="#cbd5e1" />
              </Pressable>
            ) : null}

            {/* ── HUJJATLARIM ── */}
            <Pressable
              style={s.sec}
              onPress={() => router.push("/hujjatlarim")}
              accessibilityRole="button"
            >
              <View style={s.secHead}>
                <Text style={s.secTitle}>{t("mob.pdoc.title")}</Text>
                <Text
                  style={[
                    s.ready,
                    data.docs.ready < data.docs.total && { color: color.danger },
                  ]}
                >
                  {t("mob.panel.docsReady", { a: data.docs.ready, b: data.docs.total })}
                </Text>
              </View>

              <View style={s.bar}>
                {data.docs.items.map((d) => (
                  <View
                    key={d.kind}
                    style={[s.barPart, { backgroundColor: docColor(d.state) }]}
                  />
                ))}
              </View>

              <View style={s.chips}>
                {data.docs.items.map((d) => (
                  <View key={d.kind} style={[s.chip, { backgroundColor: docColor(d.state) + "1f" }]}>
                    <Text style={[s.chipText, { color: docText(d.state) }]}>
                      {t(`mob.pdocKind.${d.kind}`)}
                      {d.state === "expired"
                        ? ` · ${t("mob.panel.expiredShort")}`
                        : d.state === "soon" && d.days != null
                          ? ` · ${t("mob.panel.days", { n: d.days })}`
                          : d.state === "missing"
                            ? ` · ${t("mob.panel.missingShort")}`
                            : ""}
                    </Text>
                  </View>
                ))}
              </View>
            </Pressable>

            {/* ── ISH BERUVCHI ── */}
            <View style={s.sec}>
              <Text style={s.secLabel}>{t("mob.panel.employer")}</Text>
              {data.employer ? (
                <View style={s.empRow}>
                  <View style={s.empIcon}>
                    <Text style={s.empIconText}>
                      {data.employer.name.slice(0, 2).toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.empName}>{data.employer.name}</Text>
                    <Text style={s.empSince}>
                      {t("mob.panel.linkedSince", { d: data.employer.since.slice(0, 7) })}
                    </Text>
                  </View>
                </View>
              ) : (
                <>
                  <Text style={s.empName}>{t("mob.panel.independent")}</Text>
                  <Text style={s.empText}>{t("mob.panel.independentText")}</Text>
                </>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const docColor = (state: string) =>
  state === "expired" || state === "missing"
    ? color.danger
    : state === "soon"
      ? color.warning
      : color.success;

const docText = (state: string) =>
  state === "expired" || state === "missing"
    ? "#b91c1c"
    : state === "soon"
      ? "#92400e"
      : "#15803d";

function Fig({ value, label, good }: { value: string; label: string; good?: boolean }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={[s.figValue, good && { color: color.success }]}>{value}</Text>
      <Text style={s.figLabel}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.background },
  head: {
    backgroundColor: color.card,
    paddingHorizontal: space.lg,
    paddingTop: 4,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: color.border,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: color.muted,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 14, fontWeight: "600", color: color.mutedForeground },
  title: { fontSize: 20, fontWeight: "700", color: color.foreground, letterSpacing: -0.3 },
  sub: { fontSize: 12, color: color.mutedForeground },
  scroll: { padding: space.lg, gap: space.md },

  alarm: {
    flexDirection: "row",
    gap: 11,
    borderWidth: 1,
    borderColor: color.danger + "66",
    backgroundColor: color.danger + "0d",
    borderRadius: radius.card,
    padding: 16,
  },
  alarmTitle: { fontSize: font.body, fontWeight: "700", color: "#b91c1c" },
  alarmText: { fontSize: font.caption, color: "#b91c1c", marginTop: 5, lineHeight: 20 },
  alarmBtn: {
    height: 44,
    borderRadius: radius.control,
    backgroundColor: color.danger,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 14,
  },
  alarmBtnText: { fontSize: 14, fontWeight: "600", color: "#fff" },

  trip: { backgroundColor: color.navy, borderRadius: radius.card, padding: 18 },
  tripHead: { flexDirection: "row", alignItems: "center", gap: 9 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: color.brand },
  tripLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "rgba(241,245,249,0.75)",
    letterSpacing: 0.4,
  },
  tripRoute: { fontSize: 24, fontWeight: "700", color: "#fff", letterSpacing: -0.5, marginTop: 12 },
  tripSub: { fontSize: font.caption, color: "rgba(241,245,249,0.7)", marginTop: 3 },
  track: { flexDirection: "row", gap: 4, marginTop: 14 },
  trackStep: { flex: 1, height: 4, borderRadius: 2 },
  tripWhere: { fontSize: 12, color: "rgba(241,245,249,0.7)", marginTop: 8 },
  tripBtn: {
    height: 46,
    borderRadius: radius.control,
    backgroundColor: color.brand,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
  },
  tripBtnText: { fontSize: font.body, fontWeight: "600", color: "#fff" },

  seek: {
    backgroundColor: color.card,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.card,
    padding: 18,
  },
  seekOn: { borderColor: color.success, borderWidth: 2 },
  seekRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  seekTitle: { fontSize: font.title, fontWeight: "700", color: color.foreground },
  seekText: { fontSize: font.caption, color: "#475569", marginTop: 4, lineHeight: 20 },
  seekFoot: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: color.border,
  },
  seekFootText: { flex: 1, fontSize: 12, color: "#475569" },
  err: { fontSize: font.caption, color: color.danger, marginTop: 10 },

  empty: {
    backgroundColor: color.card,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#cbd5e1",
    borderRadius: radius.card,
    padding: 22,
    alignItems: "center",
  },
  emptyIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: color.muted,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  emptyTitle: { fontSize: font.body, fontWeight: "600", color: color.foreground },
  emptyText: {
    fontSize: font.caption,
    color: color.mutedForeground,
    marginTop: 5,
    textAlign: "center",
    lineHeight: 20,
  },
  emptyBtns: { flexDirection: "row", gap: 9, marginTop: 16, alignSelf: "stretch" },
  primary: {
    height: 46,
    borderRadius: radius.control,
    backgroundColor: color.brand,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
  },
  primaryHalf: {
    flex: 1,
    height: 46,
    borderRadius: radius.control,
    backgroundColor: color.brand,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryText: { fontSize: 14, fontWeight: "600", color: "#fff" },
  ghostHalf: {
    flex: 1,
    height: 46,
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: color.border,
    alignItems: "center",
    justifyContent: "center",
  },
  ghostText: { fontSize: 14, fontWeight: "600", color: "#475569" },

  sec: {
    backgroundColor: color.card,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.card,
    padding: space.lg,
  },
  secLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: color.mutedForeground,
    letterSpacing: 0.3,
  },
  secHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  secTitle: { fontSize: font.body, fontWeight: "700", color: color.foreground },
  ready: { fontSize: font.caption, fontWeight: "600", color: color.success },

  figs: { flexDirection: "row", gap: 10, marginTop: 14 },
  figValue: { fontSize: 22, fontWeight: "700", color: color.foreground, letterSpacing: -0.4 },
  figLabel: { fontSize: 11, color: color.mutedForeground, marginTop: 2 },
  hint: {
    flexDirection: "row",
    gap: 8,
    marginTop: 13,
    paddingTop: 13,
    borderTopWidth: 1,
    borderTopColor: color.border,
  },
  hintText: { flex: 1, fontSize: 12, color: color.mutedForeground, lineHeight: 18 },

  veh: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: color.card,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.card,
    padding: 12,
  },
  vehShot: { width: 64, height: 64, borderRadius: 10, backgroundColor: "#cbd5e1" },
  vehShotEmpty: { backgroundColor: color.muted, alignItems: "center", justifyContent: "center" },
  vehPlate: { fontSize: font.body, fontWeight: "700", color: color.foreground },
  vehSub: { fontSize: 12, color: color.mutedForeground, marginTop: 2 },
  vehAlert: { fontSize: 12, fontWeight: "600", color: color.warning, marginTop: 5 },

  bar: { flexDirection: "row", gap: 2, height: 6, borderRadius: 3, overflow: "hidden", marginTop: 12 },
  barPart: { flex: 1 },
  chips: { flexDirection: "row", gap: 8, marginTop: 12, flexWrap: "wrap" },
  chip: { height: 26, paddingHorizontal: 10, borderRadius: 8, justifyContent: "center" },
  chipText: { fontSize: 12, fontWeight: "600" },

  empRow: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 12 },
  empIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: color.info + "1a",
    alignItems: "center",
    justifyContent: "center",
  },
  empIconText: { fontSize: 13, fontWeight: "700", color: color.info },
  empName: { fontSize: font.body, fontWeight: "600", color: color.foreground, marginTop: 12 },
  empSince: { fontSize: 12, color: color.success, marginTop: 1 },
  empText: { fontSize: 12, color: color.mutedForeground, marginTop: 4, lineHeight: 19 },
});
