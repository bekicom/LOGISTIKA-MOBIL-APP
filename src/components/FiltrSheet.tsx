/**
 * C2 — filtrlar.
 *
 * Manzil va transport turi serverdan olinadi (`/api/locations`,
 * `/api/vehicle-types`): 8 davlat, minglab hudud — ro'yxatni ilovaga
 * yozib qo'yib bo'lmaydi va u eskiradi.
 */
import { useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon } from "./Icon";
import { TruckIcon } from "./TruckIcon";
import { Button } from "./ui";
import { useApi } from "@/lib/use-api";
import { color, font, radius, space } from "@/lib/theme";
import { t } from "@/lib/i18n";

export type Filtr = {
  fromId: number | null;
  fromName: string | null;
  toId: number | null;
  toName: string | null;
  vehicleTypeIds: number[];
  vehicleNames: string[];
  readyNow: boolean;
};

export const EMPTY_FILTR: Filtr = {
  fromId: null, fromName: null, toId: null, toName: null,
  vehicleTypeIds: [], vehicleNames: [], readyNow: false,
};

/** Serverdagi `parseFilters` kutgan ko'rinishga o'giradi */
export function filtrToQuery(f: Filtr): string {
  const q = new URLSearchParams();
  if (f.fromId) q.set("fromId", String(f.fromId));
  if (f.toId) q.set("toId", String(f.toId));
  if (f.vehicleTypeIds.length) q.set("vehicleTypeId", f.vehicleTypeIds.join(","));
  if (f.readyNow) q.set("readyNow", "1");
  return q.toString();
}

/** Sarlavha ostidagi olib tashlanadigan chiplar */
export function filtrChips(f: Filtr): { key: keyof Filtr; label: string }[] {
  const out: { key: keyof Filtr; label: string }[] = [];
  if (f.vehicleTypeIds.length) out.push({ key: "vehicleTypeIds", label: f.vehicleNames.join(", ") });
  if (f.readyNow) out.push({ key: "readyNow", label: t("mob.loads.readyNow") });
  return out;
}

type VehicleType = { id: number; key: string; name: string; capacityT: number | null };
/* `name` — server SO'ROV TILIDA qaytaradi (`localName`). Variantlar
   qidiruv uchun qoladi: odam «Ташкент» deb ham, «Toshkent» deb ham
   yozishi mumkin. */
export type Loc = {
  id: number;
  name: string;
  nameUz: string;
  nameRu: string | null;
  countryCode: string;
};

export function FiltrSheet({
  open, value, onClose, onApply, total,
}: {
  open: boolean;
  value: Filtr;
  onClose: () => void;
  onApply: (f: Filtr) => void;
  total?: number;
}) {
  const [draft, setDraft] = useState<Filtr>(value);
  const [picking, setPicking] = useState<null | "from" | "to">(null);
  const insets = useSafeAreaInsets();

  const types = useApi<{ items: VehicleType[] }>(open ? "/api/vehicle-types" : null);

  // Ochilganda joriy holatdan boshlaymiz
  const [seen, setSeen] = useState(false);
  if (open && !seen) {
    setSeen(true);
    setDraft(value);
  }
  if (!open && seen) setSeen(false);

  const toggleType = (t: VehicleType) =>
    setDraft((d) => {
      const on = d.vehicleTypeIds.includes(t.id);
      return {
        ...d,
        vehicleTypeIds: on ? d.vehicleTypeIds.filter((x) => x !== t.id) : [...d.vehicleTypeIds, t.id],
        vehicleNames: on ? d.vehicleNames.filter((x) => x !== t.name) : [...d.vehicleNames, t.name],
      };
    });

  return (
    <Modal visible={open} animationType="slide" transparent onRequestClose={onClose}>
      <View style={s.backdrop}>
        <View style={s.sheet}>
          <View style={s.grabber} />

          <View style={s.head}>
            <Text style={s.title}>{t("mob.loads.filters")}</Text>
            <Pressable onPress={() => setDraft(EMPTY_FILTR)} hitSlop={8}>
              <Text style={s.link}>{t("mob.loads.clear")}</Text>
            </Pressable>
            <Pressable onPress={onClose} hitSlop={8} style={{ marginLeft: space.lg }}>
              <Icon name="close" size={22} stroke={color.foreground} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={s.body} showsVerticalScrollIndicator={false}>
            {/* Yo'nalish */}
            <Text style={s.label}>{t("mob.loads.route")}</Text>
            <View style={{ gap: 8 }}>
              <Pressable style={s.row} onPress={() => setPicking("from")}>
                <View style={s.dotOutline} />
                <Text style={[s.rowText, !draft.fromName && s.rowPlaceholder]}>
                  {draft.fromName ?? t("mob.loads.from")}
                </Text>
                <Icon name="chevron" size={16} stroke="#94a3b8" />
              </Pressable>
              <Pressable style={s.row} onPress={() => setPicking("to")}>
                <View style={s.dotFilled} />
                <Text style={[s.rowText, !draft.toName && s.rowPlaceholder]}>
                  {draft.toName ?? t("mob.loads.to")}
                </Text>
                <Icon name="chevron" size={16} stroke="#94a3b8" />
              </Pressable>
            </View>

            {/* Transport turi */}
            <View style={s.section}>
              <View style={s.sectionHead}>
                <Text style={s.label}>{t("mob.loads.vehicleType")}</Text>
                {draft.vehicleTypeIds.length > 0 ? (
                  <Text style={s.hint}>{draft.vehicleTypeIds.length} tanlangan</Text>
                ) : null}
              </View>
              <View style={s.grid}>
                {(types.data?.items ?? []).map((t) => {
                  const on = draft.vehicleTypeIds.includes(t.id);
                  return (
                    <Pressable key={t.id} onPress={() => toggleType(t)} style={[s.type, on && s.typeOn]}>
                      <TruckIcon type={t.key} size={34} color={on ? color.brand : color.mutedForeground} />
                      <Text style={[s.typeText, on && s.typeTextOn]} numberOfLines={2}>
                        {t.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Kalit */}
            <View style={s.section}>
              <Pressable style={s.switchRow} onPress={() => setDraft((d) => ({ ...d, readyNow: !d.readyNow }))}>
                <Text style={s.switchLabel}>{t("mob.loads.readyOnly")}</Text>
                <View style={[s.switch, draft.readyNow && s.switchOn]}>
                  <View style={[s.knob, draft.readyNow && s.knobOn]} />
                </View>
              </Pressable>
            </View>
          </ScrollView>

          <View style={[s.foot, { paddingBottom: insets.bottom + space.lg }]}>
            <Button
              title={total != null ? `${total} ta natijani ko'rsatish` : t("mob.loads.apply")}
              onPress={() => onApply(draft)}
            />
          </View>
        </View>
      </View>

      <LocationPicker
        open={picking !== null}
        title={picking === "from" ? t("mob.loads.from") : t("mob.loads.to")}
        onClose={() => setPicking(null)}
        onPick={(l) => {
          setDraft((d) =>
            picking === "from"
              ? { ...d, fromId: l.id, fromName: l.name }
              : { ...d, toId: l.id, toName: l.name },
          );
          setPicking(null);
        }}
      />
    </Modal>
  );
}

/* ─────────────────────────────────────────────── manzil tanlash */

/** E'lon berish oynasida ham ishlatiladi — shuning uchun eksport */
export function LocationPicker({
  open, title, onClose, onPick,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  onPick: (l: Loc) => void;
}) {
  const [q, setQ] = useState("");
  const insets = useSafeAreaInsets();
  // Ikki harfdan boshlab qidiradi — serverdagi shart bilan bir xil
  const { data, loading } = useApi<{ items: Loc[] }>(
    open ? `/api/locations${q.trim().length >= 2 ? `?q=${encodeURIComponent(q.trim())}` : ""}` : null,
    [q, open],
  );

  return (
    <Modal visible={open} animationType="slide" onRequestClose={onClose}>
      <View style={[s.picker, { paddingTop: insets.top }]}>
        <View style={s.pickerHead}>
          <Pressable onPress={onClose} hitSlop={10} style={s.back}>
            <Icon name="back" size={22} stroke={color.foreground} />
          </Pressable>
          <Text style={s.pickerTitle}>{title}</Text>
        </View>

        <View style={s.searchBox}>
          <Icon name="search" size={19} />
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder={t("mob.loads.cityPh")}
            placeholderTextColor="#94a3b8"
            style={s.searchInput}
            autoFocus
          />
        </View>

        <FlatList
          data={data?.items ?? []}
          keyExtractor={(l) => String(l.id)}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <Pressable style={s.locRow} onPress={() => onPick(item)}>
              <View style={{ flex: 1 }}>
                <Text style={s.locName}>{item.name}</Text>
                {item.nameRu && item.nameRu !== item.name ? (
                  <Text style={s.locSub}>{item.nameRu}</Text>
                ) : null}
              </View>
              <Text style={s.locCountry}>{item.countryCode}</Text>
            </Pressable>
          )}
          ListEmptyComponent={
            <Text style={s.locEmpty}>
              {loading ? t("mob.loads.searching") : q.length >= 2 ? t("mob.loads.notFound") : "Kamida 2 harf yozing"}
            </Text>
          }
        />
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(15,23,42,0.45)", justifyContent: "flex-end" },
  sheet: { backgroundColor: color.card, borderTopLeftRadius: radius.sheet, borderTopRightRadius: radius.sheet, maxHeight: "92%" },
  grabber: { width: 38, height: 4, borderRadius: 2, backgroundColor: "#cbd5e1", alignSelf: "center" },

  head: {
    flexDirection: "row", alignItems: "center", paddingHorizontal: space.xl,
    paddingTop: space.md, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: color.border,
  },
  title: { flex: 1, fontSize: 20, fontWeight: "700", color: color.foreground },
  link: { fontSize: 14, fontWeight: "600", color: color.brand },

  body: { padding: space.xl, gap: 0 },
  section: { marginTop: space.xl },
  sectionHead: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" },
  label: { fontSize: font.caption, fontWeight: "600", color: color.foreground, marginBottom: 9 },
  hint: { fontSize: 12, color: color.mutedForeground },

  row: {
    height: 48, borderWidth: 1, borderColor: color.border, borderRadius: radius.control,
    flexDirection: "row", alignItems: "center", paddingHorizontal: 14, gap: 10,
  },
  rowText: { flex: 1, fontSize: font.body, fontWeight: "500", color: color.foreground },
  rowPlaceholder: { fontWeight: "400", color: "#94a3b8" },
  dotOutline: { width: 9, height: 9, borderRadius: 5, borderWidth: 2.5, borderColor: color.foreground },
  dotFilled: { width: 9, height: 9, borderRadius: 5, backgroundColor: color.brand },

  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  type: {
    width: "22.6%", flexGrow: 1, borderWidth: 1, borderColor: color.border,
    borderRadius: radius.control, paddingVertical: 10, paddingHorizontal: 2,
    minHeight: 78, alignItems: "center", justifyContent: "center", gap: 6,
  },
  typeOn: { borderWidth: 2, borderColor: color.brand, backgroundColor: "#f45a180f" },
  typeText: { fontSize: 10, fontWeight: "500", color: "#475569", textAlign: "center", lineHeight: 13 },
  typeTextOn: { fontWeight: "700", color: "#c2490f" },

  switchRow: { flexDirection: "row", alignItems: "center", gap: space.md },
  switchLabel: { flex: 1, fontSize: 14, color: color.foreground },
  switch: { width: 46, height: 27, borderRadius: 14, backgroundColor: color.border, padding: 3 },
  switchOn: { backgroundColor: color.brand },
  knob: { width: 21, height: 21, borderRadius: 11, backgroundColor: "#fff" },
  knobOn: { alignSelf: "flex-end" },

  foot: { paddingHorizontal: space.xl, paddingTop: 14, borderTopWidth: 1, borderTopColor: color.border },

  picker: { flex: 1, backgroundColor: color.card },
  pickerHead: { flexDirection: "row", alignItems: "center", paddingHorizontal: 8, paddingVertical: 4 },
  back: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  pickerTitle: { fontSize: 18, fontWeight: "700", color: color.foreground },
  searchBox: {
    marginHorizontal: space.lg, marginBottom: space.md, height: 52, borderWidth: 1,
    borderColor: color.border, borderRadius: radius.control, flexDirection: "row",
    alignItems: "center", paddingHorizontal: 14, gap: 11,
  },
  searchInput: { flex: 1, fontSize: font.bodyLg, color: color.foreground, padding: 0 },
  locRow: {
    flexDirection: "row", alignItems: "center", paddingHorizontal: space.lg,
    paddingVertical: 14, borderTopWidth: 1, borderTopColor: color.border, gap: space.md,
  },
  locName: { fontSize: font.body, fontWeight: "500", color: color.foreground },
  locSub: { fontSize: 12, color: color.mutedForeground, marginTop: 1 },
  locCountry: { fontSize: 12, fontWeight: "600", color: color.mutedForeground },
  locEmpty: { textAlign: "center", color: color.mutedForeground, marginTop: space.xxl, fontSize: font.caption },
});
