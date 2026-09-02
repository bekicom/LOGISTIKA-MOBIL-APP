/**
 * I2 — profilni tahrirlash.
 *
 * TELEFON ALOHIDA TURADI. U — kirish kaliti; boshqa maydonlar kabi
 * shunchaki yozib saqlab bo'lmaydi. O'zgartirilsa yangi raqamga kod
 * yuborilishi va A4 ekrani qayta ishlashi kerak. Aks holda hisobni
 * o'g'irlash yo'li ochiq qolardi.
 *
 * Server hozir `firstName`, `lastName` va `extraPhone` ni oladi
 * (`PATCH /api/profile`). Qolgan maydonlar backend tayyor bo'lgach
 * qo'shiladi — bu yerda ularni ko'rsatib, «hozircha yo'q» deb
 * turish yolg'on bo'lardi, shuning uchun yozilmadi.
 */
import { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Button, Card, Field, Header } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { api, FuramError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { color, font, radius, space } from "@/lib/theme";

export default function ProfilTahrir() {
  const router = useRouter();
  const { user, refresh } = useAuth();

  const [firstName, setFirst] = useState(user?.firstName ?? "");
  const [lastName, setLast] = useState(user?.lastName ?? "");
  const [extraPhone, setExtra] = useState("");
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const changed =
    firstName !== (user?.firstName ?? "") ||
    lastName !== (user?.lastName ?? "") ||
    extraPhone !== "";

  async function save() {
    setBusy(true);
    setErrors({});
    try {
      await api("/api/profile", {
        method: "PATCH",
        body: { firstName, lastName, extraPhone },
      });
      await refresh();
      router.back();
    } catch (e) {
      const err = e as FuramError;
      if (err.details) {
        // Server maydon bo'yicha xato qaytaradi — o'z maydoni tagida chiqsin
        setErrors(
          Object.fromEntries(Object.entries(err.details).map(([k, v]) => [k, v[0] ?? ""])),
        );
      } else {
        Alert.alert("Saqlanmadi", err.message ?? "Qaytadan urinib ko'ring");
      }
    } finally {
      setBusy(false);
    }
  }

  const initials = (firstName || user?.firstName || "?").slice(0, 2).toUpperCase();

  return (
    <KeyboardAvoidingView
      style={s.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Header
        title="Profilni tahrirlash"
        right={
          <Text
            onPress={busy || !changed ? undefined : save}
            style={[s.save, (busy || !changed) && { color: color.mutedForeground }]}
          >
            {busy ? "..." : "Saqlash"}
          </Text>
        }
      />

      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <View style={s.avatarWrap}>
          <View style={s.avatar}>
            <Text style={s.avatarText}>{initials}</Text>
          </View>
          <Text style={s.avatarHint}>Rasm qo&apos;yish tez orada</Text>
        </View>

        <Field
          label="Ism"
          value={firstName}
          onChangeText={setFirst}
          placeholder="Ismingiz"
          autoCapitalize="words"
          error={errors.firstName}
        />

        <Field
          label="Familiya"
          hint="ixtiyoriy"
          value={lastName}
          onChangeText={setLast}
          placeholder="Familiyangiz"
          autoCapitalize="words"
          error={errors.lastName}
        />

        <Field
          label="Qo'shimcha telefon"
          hint="ixtiyoriy"
          value={extraPhone}
          onChangeText={setExtra}
          placeholder="+998 __ ___ __ __"
          keyboardType="phone-pad"
          error={errors.extraPhone}
        />
        <Text style={s.under}>
          Sizga yetib bo&apos;lmaganda shu raqamga qo&apos;ng&apos;iroq qilishadi.
        </Text>

        {/* Telefon — o'zgartirilmaydigan maydon */}
        <Card style={{ padding: space.lg, marginTop: space.sm }}>
          <View style={s.phoneRow}>
            <Icon name="check" size={18} stroke={color.success} />
            <View style={{ flex: 1 }}>
              <Text style={s.phoneLabel}>Asosiy telefon</Text>
              <Text style={s.phone}>{user?.phone ?? "—"}</Text>
            </View>
          </View>
          <Text style={s.phoneNote}>
            Bu raqam — kirish kaliti. O&apos;zgartirish uchun yangi raqam
            tasdiqlanishi kerak, shuning uchun u alohida qadamda bo&apos;ladi.
          </Text>
        </Card>

        <View style={s.readonly}>
          <Row label="FURAM ID" value={String(user?.furamId ?? "—")} />
          <Row label="Rol" value={ROLE[user?.role ?? ""] ?? user?.role ?? "—"} last />
        </View>

        <Button title="Saqlash" onPress={save} loading={busy} disabled={!changed} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const ROLE: Record<string, string> = {
  DRIVER: "Haydovchi",
  SHIPPER: "Yuk egasi",
  VEHICLE_OWNER: "Mashina egasi",
  DISPATCHER: "Dispetcher",
  USER: "Oddiy foydalanuvchi",
};

function Row({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[s.row, !last && s.rowLine]}>
      <Text style={s.rowLabel}>{label}</Text>
      <Text style={s.rowValue}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.card },
  scroll: { padding: space.lg, gap: space.lg, paddingBottom: space.xxl * 2 },
  save: { fontSize: font.bodyLg, fontWeight: "600", color: color.brand },

  avatarWrap: { alignItems: "center", gap: space.sm, paddingTop: space.sm },
  avatar: {
    width: 88, height: 88, borderRadius: 44, backgroundColor: color.logoBlue,
    alignItems: "center", justifyContent: "center",
  },
  avatarText: { fontSize: 28, fontWeight: "700", color: "#fff" },
  avatarHint: { fontSize: font.caption, color: color.mutedForeground },

  under: { fontSize: 12, color: color.mutedForeground, marginTop: -8, lineHeight: 18 },

  phoneRow: { flexDirection: "row", alignItems: "center", gap: space.md },
  phoneLabel: { fontSize: font.caption, color: color.mutedForeground },
  phone: { fontSize: font.bodyLg, fontWeight: "600", color: color.foreground, marginTop: 2 },
  phoneNote: { fontSize: 12, color: color.mutedForeground, lineHeight: 18, marginTop: space.md },

  readonly: {
    borderWidth: 1, borderColor: color.border, borderRadius: radius.card,
    backgroundColor: color.background,
  },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: space.lg },
  rowLine: { borderBottomWidth: 1, borderBottomColor: color.border },
  rowLabel: { fontSize: font.caption, color: color.mutedForeground },
  rowValue: { fontSize: font.body, fontWeight: "600", color: color.foreground },
});
