/**
 * E8 — reys ishtirokchilari.
 *
 * ── TELEFON RAQAMI SHU YERDA ────────────────────────────────────
 *
 * Yo'lda eng ko'p kerak bo'ladigan narsa — «kimga qo'ng'iroq
 * qilaman». Shuning uchun har qatorda tugma turibdi, profilga
 * kirib izlash shart emas.
 *
 * ── QO'SHISH FAQAT TANISH ODAMNI ────────────────────────────────
 *
 * Server begona FURAM ID ni rad etadi (`knowsEachOther`): ID lar
 * ketma-ket son, aks holda ularni birma-bir terib butun bazaning
 * telefonini yig'ib olsa bo'lardi. Bu ekranda shu qoida OLDINDAN
 * yozib qo'yiladi — rad javobini keyin tushuntirgandan ko'ra.
 */
import { useState } from "react";
import { Linking, Pressable, RefreshControl, ScrollView, View } from "react-native";
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

/** `furam/src/app/api/trips/[id]/participants/route.ts:schema` */
const ROLES = ["DRIVER", "CO_DRIVER", "VEHICLE_OWNER", "DISPATCHER", "FORWARDER", "CARGO_OWNER"];
/** Serverning `schema` si `CO_DRIVER` ni qabul qilmaydi */
const ADDABLE = ROLES.filter((r) => r !== "CO_DRIVER");

type Item = {
  userId: string;
  furamId: number | null;
  role: string;
  name: string;
  phone: string | null;
  avatarUrl: string | null;
  mine: boolean;
};
type Feed = { canAdd: boolean; items: Item[] };

export default function Ishtirokchilar() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { data, loading, error, refreshing, refresh, reload } = useApi<Feed>(
    id ? `/api/trips/${id}/participants` : null,
    [id],
  );

  const [open, setOpen] = useState(false);
  const [furamId, setFuramId] = useState("");
  const [role, setRole] = useState("DRIVER");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const n = Number(furamId.trim());
  const ready = Number.isInteger(n) && n > 0;

  async function add() {
    setBusy(true);
    setErr(null);
    try {
      await api(`/api/trips/${id}/participants`, {
        method: "POST",
        body: { furamId: n, role },
      });
      setOpen(false);
      setFuramId("");
      reload();
    } catch (e) {
      setErr((e as FuramError).message ?? t("mob.common.failed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={s.root}>
      <Header title={t("mob.tpart.title")} />

      <ScrollView
        contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + space.xxl }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={color.brand} />
        }
        showsVerticalScrollIndicator={false}
      >
        <Text style={s.lead}>{t("mob.tpart.lead")}</Text>

        {loading && !data ? <Skeleton rows={3} /> : null}
        {error && !data ? <ErrorBox message={error} onRetry={reload} /> : null}

        <View style={{ gap: 8 }}>
          {(data?.items ?? []).map((p) => (
            <View key={p.userId} style={s.row}>
              <View style={[s.avatar, p.mine && { backgroundColor: color.brandSoft }]}>
                <Icon name="user" size={19} stroke={p.mine ? color.brand : color.mutedForeground} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={s.name} numberOfLines={1}>
                  {p.name}
                  {p.mine ? ` · ${t("mob.tpart.you")}` : ""}
                </Text>
                <Text style={s.meta}>
                  {t(`mob.role.${p.role}`)}
                  {p.furamId ? ` · FURAM-${p.furamId}` : ""}
                </Text>
              </View>
              {p.phone && !p.mine ? (
                <Pressable style={s.call} onPress={() => Linking.openURL(`tel:${p.phone}`)}>
                  <Icon name="phone" size={16} stroke={color.brand} />
                </Pressable>
              ) : null}
            </View>
          ))}
        </View>

        {data && !data.canAdd ? (
          <Notice tone="info">{t("mob.tpart.cantAdd")}</Notice>
        ) : null}

        {data?.canAdd ? (
          <Button
            title={t("mob.tpart.add")}
            variant="secondary"
            onPress={() => setOpen(true)}
            icon={<Icon name="plus" size={18} stroke={color.foreground} />}
          />
        ) : null}
      </ScrollView>

      <Sheet open={open} onClose={() => setOpen(false)} title={t("mob.tpart.add")}>
        <Text style={s.lead}>{t("mob.tpart.knownOnly")}</Text>

        <View style={{ marginTop: space.md }}>
          <Field
            label={t("mob.tpart.furamId")}
            hint={t("mob.tpart.furamIdHint")}
            value={furamId}
            onChangeText={setFuramId}
            keyboardType="number-pad"
            placeholder="10042"
            maxLength={9}
          />
        </View>

        <Text style={[s.label, { marginTop: space.md }]}>{t("mob.tpart.role")}</Text>
        <View style={s.chips}>
          {ADDABLE.map((r) => (
            <Pressable key={r} onPress={() => setRole(r)} style={[s.chip, role === r && s.chipOn]}>
              <Text style={[s.chipText, role === r && { color: "#fff" }]}>
                {t(`mob.role.${r}`)}
              </Text>
            </Pressable>
          ))}
        </View>

        {err ? <Notice tone="danger">{err}</Notice> : null}

        <View style={{ marginTop: space.md }}>
          <Button title={t("mob.common.add")} onPress={add} loading={busy} disabled={!ready} />
        </View>
      </Sheet>
    </View>
  );
}

const s = themed(() => ({
  root: { flex: 1, backgroundColor: color.background },
  scroll: { padding: space.lg, gap: space.md },
  lead: { fontSize: 13, color: color.mutedForeground, lineHeight: 19 },

  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: color.card,
    borderRadius: radius.card,
    padding: space.md,
    ...shadow.card,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: color.muted,
    alignItems: "center",
    justifyContent: "center",
  },
  name: { fontSize: 14.5, fontWeight: "700", color: color.foreground },
  meta: { fontSize: 12.5, color: color.mutedForeground, marginTop: 2 },
  call: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: color.brandSoft,
    alignItems: "center",
    justifyContent: "center",
  },

  label: { fontSize: 12, fontWeight: "700", color: color.mutedForeground, marginBottom: 8 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  chip: {
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: radius.pill,
    backgroundColor: color.muted,
  },
  chipOn: { backgroundColor: color.brand },
  chipText: { fontSize: 13, fontWeight: "700", color: color.mutedForeground },
}));
