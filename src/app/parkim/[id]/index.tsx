/**
 * D2 — transport tafsiloti.
 *
 * Tartib yuqoridan pastga: HOZIR NIMA BO'LAYAPTI (reys) → KIM
 * JAVOBGAR (haydovchi) → NIMA TO'SQINLIK QILADI (hujjat) → qolgani.
 * Texnik ko'rsatkichlar pastda: ular kamdan-kam ochiladi.
 *
 * Hujjat muddati SANA bilan emas, «necha kun qoldi» bilan yoziladi —
 * haydovchi kalendar hisoblab o'tirmaydi.
 */
import { Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Card, GroupLabel, Header, ListRow } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { ErrorBox, Skeleton } from "@/components/state";
import { useApi } from "@/lib/use-api";
import { color, font, radius, space } from "@/lib/theme";
import { t, tripStatusLabel } from "@/lib/i18n";

type Doc = {
  id: string | null;
  kind: string;
  title: string | null;
  number: string | null;
  days: number | null;
  state: "ok" | "soon" | "expired" | "forever" | "missing";
  missing: boolean;
};
type Detail = {
  vehicle: {
    id: string; no: number; plate: string; brand: string; model: string | null;
    year: number | null; status: string; type: string; capacityT: number | null;
    volumeM3: number | null; bodyLengthM: number | null; bodyWidthM: number | null;
    bodyHeightM: number | null; fuelLabel: string; fuelNorm: number | null;
    tankL: number | null; odometer: number | null; odometerAt: string | null;
    photos: string[];
    mainDriver: { id: string; fullName: string; phone: string | null } | null;
    coDriver: { id: string; fullName: string; phone: string | null } | null;
    trailer: { plate: string; no: number; capacityT: number | null } | null;
  };
  documents: Doc[];
  services: {
    id: string; title: string; cost: number | null; currency: string | null;
    odometer: number | null; servicedAt: string;
  }[];
  trip: {
    id: string; no: number; status: string; from: string; to: string;
    cargo: string; weightT: number | null; placeName: string | null; remainingKm: number | null;
  } | null;
};

const TONE: Record<string, { fg: string; bg: string }> = {
  FREE: { fg: "#15803d", bg: "rgba(22,163,74,0.12)" },
  ON_TRIP: { fg: color.info, bg: "rgba(29,78,216,0.12)" },
  REPAIR: { fg: color.warning, bg: "rgba(180,83,9,0.12)" },
  INACTIVE: { fg: color.mutedForeground, bg: color.muted },
};

const statusLabel = (k: string) =>
  ({
    FREE: t("mob.park.free"),
    ON_TRIP: t("mob.park.onTrip"),
    REPAIR: t("mob.park.repair"),
    INACTIVE: t("mob.park.inactive"),
  })[k] ?? k;

/** Hujjat holatini bitta joyda rangga va matnga bog'laymiz */
function docLook(d: Doc): { color: string; text: string; icon: "check" | "clock" | "alert" } {
  if (d.missing) return { color: color.danger, text: t("mob.docs.missingShort"), icon: "alert" };
  if (d.state === "expired")
    return { color: color.danger, text: t("mob.docs.expiredAgo", { n: -(d.days ?? 0) }), icon: "alert" };
  if (d.state === "soon")
    return { color: color.warning, text: t("mob.docs.daysLeft", { n: d.days ?? 0 }), icon: "clock" };
  if (d.state === "forever")
    return { color: color.mutedForeground, text: d.number ?? t("mob.docs.forever"), icon: "check" };
  return { color: color.mutedForeground, text: t("mob.docs.daysLeft", { n: d.days ?? 0 }), icon: "check" };
}

/**
 * Hujjat nomi — foydalanuvchi yozgani yoki tarjima.
 *
 * Server `title` (odam yozgan nom) va `kind` (kalit) ni ALOHIDA
 * yuboradi. Ilgari u tayyor satr yuborardi va u o'zbekcha edi:
 * rus tilidagi telefonda «Texko'rik 12 kun qoldi» chiqardi.
 */
function docName(d: { kind: string; title?: string | null }) {
  return d.title || t(`vehDocKind.${d.kind}`);
}

export default function TransportTafsilot() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data, loading, error, refreshing, refresh, reload } = useApi<Detail>(
    id ? `/api/fleet/vehicles/${id}` : null,
    [id],
  );

  if (loading) {
    return (
      <View style={s.root}>
        <Header title={t("mob.vehicle.vehicleTitle")} />
        <View style={{ padding: space.lg }}>
          <Skeleton rows={5} />
        </View>
      </View>
    );
  }
  if (error || !data) {
    return (
      <View style={s.root}>
        <Header title={t("mob.vehicle.vehicleTitle")} />
        <View style={{ padding: space.lg }}>
          <ErrorBox message={error ?? t("mob.vehicle.notFound")} onRetry={reload} />
        </View>
      </View>
    );
  }

  const v = data.vehicle;
  const tone = TONE[v.status] ?? TONE.INACTIVE;
  const problems = data.documents.filter((d) => d.missing || d.state === "expired" || d.state === "soon");

  return (
    <View style={s.root}>
      <Header title={v.plate} subtitle={[v.brand, v.model].filter(Boolean).join(" ")} />

      <ScrollView
        contentContainerStyle={s.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={color.brand} />}
      >
        {/* Sarlavha kartasi */}
        <Card style={{ padding: space.lg }}>
          <View style={{ flexDirection: "row", alignItems: "flex-start", gap: space.md }}>
            <View style={s.thumb}>
              <Icon name="truck" size={34} stroke="#475569" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.plate}>{v.plate}</Text>
              <Text style={s.sub}>
                {[v.brand, v.model, v.year].filter(Boolean).join(" · ")}
              </Text>
              <Text style={s.no}>TR-{v.no}</Text>
            </View>
            <Text style={[s.chip, { color: tone.fg, backgroundColor: tone.bg }]}>{statusLabel(v.status)}</Text>
          </View>
          {v.trailer ? (
            <View style={s.trailerRow}>
              <Icon name="truck" size={15} stroke={color.mutedForeground} />
              <Text style={s.trailerText}>
                {t("mob.vehicle.trailer", { plate: v.trailer.plate })}
                {v.trailer.capacityT ? ` · ${v.trailer.capacityT}t` : ""}
              </Text>
            </View>
          ) : null}
        </Card>

        {/* 1. Hozir nima bo'layapti */}
        {data.trip ? (
          <Pressable
            onPress={() => router.push(`/reys/${data.trip!.id}`)}
            style={({ pressed }) => [s.trip, pressed && { opacity: 0.7 }]}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Icon name="route" size={16} stroke={color.info} />
              <Text style={s.tripTitle}>
                FURAM #{data.trip.no} · {tripStatusLabel(data.trip.status)}
              </Text>
            </View>
            <Text style={s.tripRoute}>
              {data.trip.from} → {data.trip.to} · {data.trip.cargo}
              {data.trip.weightT ? ` ${data.trip.weightT} t` : ""}
            </Text>
            {data.trip.placeName || data.trip.remainingKm != null ? (
              <Text style={s.tripWhere}>
                {[
                  data.trip.placeName,
                  data.trip.remainingKm != null
                    ? t("mob.park.kmLeft", { n: data.trip.remainingKm.toLocaleString() })
                    : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </Text>
            ) : null}
          </Pressable>
        ) : null}

        {/* 2. Kim javobgar */}
        <View>
          <GroupLabel>{t("mob.vehicle.drivers")}</GroupLabel>
          <Card>
            {v.mainDriver ? (
              <ListRow
                icon={<Avatar name={v.mainDriver.fullName} />}
                title={v.mainDriver.fullName}
                hint={`${t("mob.vehicle.mainDriver")}${v.mainDriver.phone ? ` · ${v.mainDriver.phone}` : ""}`}
                last={!v.coDriver}
                right={
                  v.mainDriver.phone ? (
                    <Pressable
                      hitSlop={10}
                      onPress={() => Linking.openURL(`tel:${v.mainDriver!.phone}`)}
                    >
                      <Icon name="chevron" size={18} stroke={color.brand} />
                    </Pressable>
                  ) : undefined
                }
              />
            ) : (
              <ListRow title={t("mob.park.noDriver")} hint={t("mob.vehicle.driverNeeded")} last={!v.coDriver} />
            )}
            {v.coDriver ? (
              <ListRow
                icon={<Avatar name={v.coDriver.fullName} />}
                title={v.coDriver.fullName}
                hint={`${t("mob.vehicle.coDriver")}${v.coDriver.phone ? ` · ${v.coDriver.phone}` : ""}`}
                last
              />
            ) : null}
          </Card>
        </View>

        {/* 3. Nima to'sqinlik qiladi */}
        <View>
          <GroupLabel>{t("mob.vehicle.documents")}</GroupLabel>
          <Card>
            {data.documents.slice(0, 4).map((d, i) => {
              const look = docLook(d);
              return (
                <ListRow
                  key={d.kind + (d.id ?? "")}
                  last={i === Math.min(3, data.documents.length - 1)}
                  icon={<Icon name={look.icon} size={17} stroke={look.color} />}
                  title={docName(d)}
                  hint={look.text}
                  right={
                    d.missing || d.state === "expired" || d.state === "soon" ? (
                      <Text style={s.action}>{d.missing ? t("mob.common.add") : t("mob.common.renew")}</Text>
                    ) : null
                  }
                  onPress={() => router.push(`/parkim/${v.id}/hujjatlar`)}
                />
              );
            })}
          </Card>
          <Pressable onPress={() => router.push(`/parkim/${v.id}/hujjatlar`)}>
            <Text style={s.more}>
              {t("mob.vehicle.allDocuments", { n: data.documents.length })}
              {problems.length ? ` · ${t("mob.vehicle.needAttention", { n: problems.length })}` : ""}
            </Text>
          </Pressable>
        </View>

        {/* 4. Texnik ko'rsatkichlar */}
        <View>
          <GroupLabel>{t("mob.vehicle.specs")}</GroupLabel>
          <Card>
            <View style={s.grid}>
              <Cell k={t("mob.vehicle.type")} v={v.type} />
              <Cell k={t("mob.vehicle.capacity")} v={v.capacityT ? `${v.capacityT} t` : "—"} right />
              <Cell k={t("mob.vehicle.volume")} v={v.volumeM3 ? `${v.volumeM3} m³` : "—"} />
              <Cell
                k={t("mob.vehicle.body")}
                v={
                  v.bodyLengthM
                    ? `${v.bodyLengthM} × ${v.bodyWidthM ?? "—"} × ${v.bodyHeightM ?? "—"} m`
                    : "—"
                }
                right
              />
              <Cell
                k={t("mob.vehicle.fuel")}
                v={v.fuelNorm ? `${v.fuelLabel} · ${v.fuelNorm} l/100` : v.fuelLabel}
              />
              <Cell k={t("mob.vehicle.tank")} v={v.tankL ? `${v.tankL} l` : "—"} right />
            </View>
            <ListRow
              last
              title={t("mob.vehicle.odometer")}
              hint={
                v.odometerAt
                  ? t("mob.vehicle.odometerAt", { date: new Date(v.odometerAt).toLocaleDateString() })
                  : t("mob.common.notSet")
              }
              right={
                <Text style={s.odo}>
                  {v.odometer ? `${v.odometer.toLocaleString()} km` : "—"}
                </Text>
              }
            />
          </Card>
        </View>

        {/* 5. Xizmat tarixi */}
        {data.services.length > 0 ? (
          <View>
            <GroupLabel>{t("mob.vehicle.service")}</GroupLabel>
            <Card>
              {data.services.map((sv, i) => (
                <ListRow
                  key={sv.id}
                  last={i === data.services.length - 1}
                  title={sv.title}
                  hint={[
                    sv.odometer ? `${sv.odometer.toLocaleString()} km` : null,
                    new Date(sv.servicedAt).toLocaleDateString("ru-RU"),
                    sv.cost ? `${sv.cost.toLocaleString()} ${sv.currency ?? ""}` : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                />
              ))}
            </Card>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

function Avatar({ name }: { name: string }) {
  return (
    <View style={s.avatar}>
      <Text style={s.avatarText}>
        {name
          .split(" ")
          .slice(0, 2)
          .map((w) => w[0])
          .join("")
          .toUpperCase()}
      </Text>
    </View>
  );
}

function Cell({ k, v, right }: { k: string; v: string; right?: boolean }) {
  return (
    <View style={[s.cell, !right && s.cellLine]}>
      <Text style={s.cellK}>{k}</Text>
      <Text style={s.cellV}>{v}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.background },
  scroll: { padding: space.lg, gap: space.lg, paddingBottom: space.xxl * 2 },

  thumb: {
    width: 62, height: 62, borderRadius: 10, backgroundColor: color.muted,
    alignItems: "center", justifyContent: "center",
  },
  plate: { fontSize: 20, fontWeight: "700", color: color.foreground, letterSpacing: 0.3 },
  sub: { fontSize: font.caption, color: color.mutedForeground, marginTop: 2 },
  no: { fontSize: 11, color: "#94a3b8", marginTop: 4, fontFamily: "monospace" },
  chip: {
    fontSize: 10, fontWeight: "700", paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 6, overflow: "hidden",
  },
  trailerRow: {
    flexDirection: "row", alignItems: "center", gap: 8, marginTop: space.md,
    paddingTop: space.md, borderTopWidth: 1, borderTopColor: color.border,
  },
  trailerText: { fontSize: font.caption, color: color.mutedForeground },

  trip: {
    borderWidth: 1, borderColor: color.info + "4d", backgroundColor: color.info + "0d",
    borderRadius: radius.card, padding: space.lg,
  },
  tripTitle: { fontSize: font.caption, fontWeight: "700", color: color.info },
  tripRoute: { fontSize: font.caption, color: color.foreground, marginTop: 7 },
  tripWhere: { fontSize: 12, color: color.mutedForeground, marginTop: 4 },

  avatar: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: color.logoBlue,
    alignItems: "center", justifyContent: "center",
  },
  avatarText: { fontSize: 13, fontWeight: "700", color: "#fff" },

  action: { fontSize: 12, fontWeight: "600", color: color.brand },
  more: {
    fontSize: font.caption, fontWeight: "600", color: color.brand,
    marginTop: space.sm, marginLeft: space.xs,
  },

  grid: { flexDirection: "row", flexWrap: "wrap" },
  cell: {
    width: "50%", paddingHorizontal: space.lg, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: color.border,
  },
  cellLine: { borderRightWidth: 1, borderRightColor: color.border },
  cellK: { fontSize: font.caption, color: color.mutedForeground },
  cellV: { fontSize: 14, fontWeight: "600", color: color.foreground, marginTop: 3 },
  odo: { fontSize: font.body, fontWeight: "700", color: color.foreground },
});
