/**
 * D7 — tirkama (TZ 03, 43-45-band).
 *
 * ── NEGA ALOHIDA YOZUV ──────────────────────────────────────────
 *
 * Tirkamaning O'Z raqami, o'z texpasporti va o'z texko'rigi bor.
 * Uni tyagachning maydoni qilib qo'ysak, chegarada «tirkamaning
 * dozvoli qani?» degan savolga javob topilmasdi.
 *
 * Shuning uchun tirkama parkda alohida mashina bo'lib turadi va
 * tyagachga ULANADI. Ajratilsa — yo'qolmaydi, ro'yxatda qoladi.
 */
import { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, View } from "react-native";
import { Text } from "@/components/Text";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";
import { Icon } from "@/components/Icon";
import { Sheet } from "@/components/Sheet";
import { Button, Field, Header, Notice } from "@/components/ui";
import { ErrorBox, Skeleton } from "@/components/state";
import { api, FuramError } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { color, radius, shadow, space, themed } from "@/lib/theme";
import { t } from "@/lib/i18n";

type VType = { id: number; name: string };
type Detail = {
  vehicle: {
    id: string;
    plate: string;
    trailer: { plate: string; no: number; capacityT: number | null } | null;
  };
};

export default function Tirkama() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { data, loading, error, reload } = useApi<Detail>(
    id ? `/api/fleet/vehicles/${id}` : null,
    [id],
  );
  const types = useApi<{ items: VType[] }>("/api/vehicle-types");

  const [open, setOpen] = useState(false);
  const [pickType, setPickType] = useState(false);
  const [plate, setPlate] = useState("");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [vin, setVin] = useState("");
  const [bodyType, setBodyType] = useState("");
  const [year, setYear] = useState("");
  const [typeId, setTypeId] = useState<number | null>(null);
  const [capacity, setCapacity] = useState("");
  const [volume, setVolume] = useState("");
  const [axles, setAxles] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const trailer = data?.vehicle.trailer ?? null;

  /* Tahrirga ochilganda mavjud raqam ko'rinsin — bo'sh forma
     odamni «yangisini yaratyapmanmi?» deb ikkilantiradi */
  useEffect(() => {
    if (open && trailer && !plate) setPlate(trailer.plate);
  }, [open, trailer, plate]);

  const num = (v: string) => {
    const n = Number(v.replace(/\s/g, "").replace(",", "."));
    return Number.isFinite(n) && n > 0 ? n : undefined;
  };
  const ready = plate.trim().length >= 3 && brand.trim().length > 0 && typeId != null;

  async function save() {
    setBusy(true);
    setErr(null);
    try {
      await api(`/api/fleet/vehicles/${id}/trailer`, {
        method: "PUT",
        body: {
          plate: plate.trim(),
          brand: brand.trim(),
          model: model.trim() || undefined,
          vin: vin.trim() || undefined,
          bodyType: bodyType.trim() || undefined,
          year: num(year),
          vehicleTypeId: typeId,
          capacityT: num(capacity),
          volumeM3: num(volume),
          axles: num(axles),
        },
      });
      setOpen(false);
      reload();
    } catch (e) {
      setErr((e as FuramError).message ?? t("mob.common.failed"));
    } finally {
      setBusy(false);
    }
  }

  function detach() {
    Alert.alert(t("mob.trailer.detach"), t("mob.trailer.detachQ"), [
      { text: t("mob.common.cancel"), style: "cancel" },
      {
        text: t("mob.trailer.detach"),
        style: "destructive",
        onPress: async () => {
          try {
            await api(`/api/fleet/vehicles/${id}/trailer`, { method: "DELETE" });
            reload();
          } catch (e) {
            setErr((e as FuramError).message ?? t("mob.common.failed"));
          }
        },
      },
    ]);
  }

  const typeName = types.data?.items.find((x) => x.id === typeId)?.name;

  return (
    <View style={s.root}>
      <Header title={t("mob.trailer.title")} />

      <ScrollView
        contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + space.xxl }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={s.lead}>{t("mob.trailer.lead")}</Text>

        {loading && !data ? <Skeleton rows={2} /> : null}
        {error && !data ? <ErrorBox message={error} onRetry={reload} /> : null}
        {err ? <Notice tone="danger">{err}</Notice> : null}

        {data && trailer ? (
          <View style={s.card}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <View style={s.icon}>
                <Icon name="truck" size={20} stroke={color.blue} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={s.plate}>{trailer.plate}</Text>
                <Text style={s.meta}>
                  #{trailer.no}
                  {trailer.capacityT ? ` · ${trailer.capacityT} t` : ""}
                </Text>
              </View>
            </View>

            <View style={{ gap: 9, marginTop: space.md }}>
              <Button
                title={t("mob.common.edit")}
                variant="secondary"
                onPress={() => setOpen(true)}
              />
              <Pressable onPress={detach} hitSlop={8}>
                <Text style={s.linkDanger}>{t("mob.trailer.detach")}</Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        {data && !trailer ? (
          <View style={s.card}>
            <Text style={s.none}>{t("mob.trailer.none")}</Text>
            <View style={{ marginTop: space.md }}>
              <Button
                title={t("mob.trailer.add")}
                onPress={() => setOpen(true)}
                icon={<Icon name="plus" size={18} stroke="#fff" />}
              />
            </View>
          </View>
        ) : null}
      </ScrollView>

      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title={trailer ? t("mob.common.edit") : t("mob.trailer.add")}
      >
        <View style={{ gap: space.md }}>
          <Field
            label={t("mob.vehicle.plate")}
            value={plate}
            onChangeText={setPlate}
            autoCapitalize="characters"
            maxLength={20}
          />
          <Field label={t("mob.vehicle.brand")} value={brand} onChangeText={setBrand} maxLength={60} />
          <Field label={t("mob.vehicle.model")} value={model} onChangeText={setModel} maxLength={60} />

          <Pressable onPress={() => setPickType(true)} style={s.pick}>
            <Text style={s.pickLabel}>{t("mob.vehicle.type")}</Text>
            <Text style={[s.pickValue, !typeName && { color: color.mutedForeground }]}>
              {typeName ?? t("mob.common.notSet")}
            </Text>
            <Icon name="chevron" size={17} stroke="#cbd5e1" />
          </Pressable>

          <View style={{ flexDirection: "row", gap: 9 }}>
            <View style={{ flex: 1 }}>
              <Field
                label={t("mob.vehicle.capacity")}
                value={capacity}
                onChangeText={setCapacity}
                keyboardType="numeric"
                placeholder="t"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Field
                label={t("mob.vehicle.volume")}
                value={volume}
                onChangeText={setVolume}
                keyboardType="numeric"
                placeholder="m³"
              />
            </View>
          </View>

          <View style={{ flexDirection: "row", gap: 9 }}>
            <View style={{ flex: 1 }}>
              <Field
                label={t("mob.trailer.bodyType")}
                value={bodyType}
                onChangeText={setBodyType}
                maxLength={40}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Field label={t("mob.vehicle.year")} value={year} onChangeText={setYear} keyboardType="numeric" />
            </View>
          </View>

          <Field label="VIN" value={vin} onChangeText={setVin} autoCapitalize="characters" maxLength={40} />
          <Field label={t("mob.vehicle.axles")} value={axles} onChangeText={setAxles} keyboardType="numeric" />

          {err ? <Notice tone="danger">{err}</Notice> : null}
          <Button title={t("mob.common.save")} onPress={save} loading={busy} disabled={!ready} />
        </View>
      </Sheet>

      <Sheet open={pickType} onClose={() => setPickType(false)} title={t("mob.vehicle.type")}>
        <View style={{ gap: 7 }}>
          {(types.data?.items ?? []).map((x) => (
            <Pressable
              key={x.id}
              onPress={() => {
                setTypeId(x.id);
                setPickType(false);
              }}
              style={[s.typeRow, typeId === x.id && s.typeRowOn]}
            >
              <Text style={[s.typeText, typeId === x.id && { color: color.brand, fontWeight: "700" }]}>
                {x.name}
              </Text>
              {typeId === x.id ? <Icon name="check" size={16} stroke={color.brand} /> : null}
            </Pressable>
          ))}
        </View>
      </Sheet>
    </View>
  );
}

const s = themed(() => ({
  root: { flex: 1, backgroundColor: color.background },
  scroll: { padding: space.lg, gap: space.md },
  lead: { fontSize: 13, color: color.mutedForeground, lineHeight: 19 },

  card: {
    backgroundColor: color.card,
    borderRadius: radius.card,
    padding: space.lg,
    ...shadow.card,
  },
  icon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: color.blueSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  plate: { fontSize: 17, fontWeight: "800", color: color.foreground },
  meta: { fontSize: 12.5, color: color.mutedForeground, marginTop: 2 },
  none: { fontSize: 14.5, fontWeight: "700", color: color.mutedForeground },
  linkDanger: { fontSize: 13, fontWeight: "700", color: color.danger, textAlign: "center" },

  pick: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    height: 52,
    paddingHorizontal: 14,
    borderRadius: radius.control,
    backgroundColor: color.muted,
  },
  pickLabel: { fontSize: 13, color: color.mutedForeground },
  pickValue: { flex: 1, fontSize: 14, fontWeight: "600", color: color.foreground, textAlign: "right" },

  typeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: radius.control,
    backgroundColor: color.card,
    borderWidth: 1,
    borderColor: color.border,
  },
  typeRowOn: { borderColor: color.brand, backgroundColor: color.brandSoft },
  typeText: { fontSize: 14, color: color.foreground },
}));
