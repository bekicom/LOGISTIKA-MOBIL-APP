/**
 * Kichik UI to'plami — web'dagi `furam/src/components/ui.tsx` ning mobil ko'rinishi.
 * O'lchamlar va ranglar o'sha yerdan olingan, faqat tegish maydoni kattaroq.
 */
import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Switch as RNSwitch,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Icon } from "./Icon";
import { color, font, radius, size, space } from "@/lib/theme";

/* ─────────────────────────────────────────────── Tugma */

type ButtonProps = {
  title: string;
  onPress?: () => void;
  variant?: "primary" | "secondary" | "ghost";
  loading?: boolean;
  disabled?: boolean;
  icon?: ReactNode;
};

export function Button({
  title,
  onPress,
  variant = "primary",
  loading = false,
  disabled = false,
  icon,
}: ButtonProps) {
  const off = disabled || loading;

  return (
    <Pressable
      onPress={off ? undefined : onPress}
      accessibilityRole="button"
      accessibilityState={{ disabled: off, busy: loading }}
      style={({ pressed }) => [
        s.btn,
        variant === "primary" && { backgroundColor: color.brand },
        variant === "secondary" && {
          backgroundColor: color.card,
          borderWidth: 1,
          borderColor: color.border,
        },
        variant === "primary" && pressed && { backgroundColor: color.brandHover },
        variant !== "primary" && pressed && { backgroundColor: color.muted },
        off && { backgroundColor: color.muted, borderWidth: 0 },
      ]}
    >
      {loading ? (
        // Kenglik o'zgarmasin — matn o'rniga aylana qo'yiladi
        <ActivityIndicator color={variant === "primary" ? "#fff" : color.mutedForeground} />
      ) : (
        <>
          {icon}
          <Text
            style={[
              s.btnText,
              variant === "primary" && { color: color.brandForeground },
              off && { color: color.mutedForeground },
            ]}
          >
            {title}
          </Text>
        </>
      )}
    </Pressable>
  );
}

/* ─────────────────────────────────────────────── Maydon */

type FieldProps = TextInputProps & {
  label?: string;
  hint?: string;
  error?: string;
  right?: ReactNode;
  left?: ReactNode;
};

export function Field({ label, hint, error, right, left, style, ...rest }: FieldProps) {
  return (
    <View>
      {label ? (
        <Text style={s.label}>
          {label}
          {hint ? <Text style={s.labelHint}> — {hint}</Text> : null}
        </Text>
      ) : null}

      <View style={[s.field, !!error && { borderColor: color.danger, borderWidth: 1.5 }]}>
        {left}
        <TextInput
          placeholderTextColor="#94a3b8"
          style={[s.input, style]}
          {...rest}
        />
        {right}
      </View>

      {error ? <Text style={s.error}>{error}</Text> : null}
    </View>
  );
}

/* ─────────────────────────────────────────────── Ogohlantirish */

export function Notice({
  tone = "info",
  title,
  children,
}: {
  tone?: "info" | "danger" | "warning";
  title?: string;
  children: ReactNode;
}) {
  const c =
    tone === "danger" ? color.danger : tone === "warning" ? color.warning : color.info;

  return (
    <View style={[s.notice, { borderColor: c + "47", backgroundColor: c + "0d" }]}>
      {title ? <Text style={[s.noticeTitle, { color: c }]}>{title}</Text> : null}
      <Text style={[s.noticeBody, { color: c }]}>{children}</Text>
    </View>
  );
}

/* ─────────────────────────────────────────────── Bosqich chizig'i */

export function Steps({ total, current }: { total: number; current: number }) {
  return (
    <View style={s.steps}>
      {Array.from({ length: total }, (_, i) => (
        <View
          key={i}
          style={[
            s.step,
            { backgroundColor: i < current ? color.brand : color.border },
          ]}
        />
      ))}
    </View>
  );
}

/* ─────────────────────────────────────────────── Ekran sarlavhasi */

/**
 * Ichki ekranlarning yuqori qatori: orqaga, sarlavha, o'ngdagi amal.
 *
 * Ilgari har ekran buni o'zi chizardi. Profil bo'limi beshta ekran
 * qo'shgach nusxa soni oshib ketdi — bittaga jamlandi.
 */
export function Header({
  title,
  subtitle,
  right,
  onBack,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  onBack?: () => void;
}) {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View style={[s.head, { paddingTop: insets.top + 4 }]}>
      <Pressable
        onPress={onBack ?? (() => router.back())}
        accessibilityRole="button"
        accessibilityLabel="Orqaga"
        hitSlop={8}
        style={({ pressed }) => [s.headBack, pressed && { opacity: 0.5 }]}
      >
        <Icon name="back" size={22} />
      </Pressable>

      <View style={{ flex: 1 }}>
        <Text style={s.headTitle} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? <Text style={s.headSub}>{subtitle}</Text> : null}
      </View>

      {right}
    </View>
  );
}

/* ─────────────────────────────────────────────── Kalit */

/**
 * Yoqish/o'chirish kaliti. RN'ning o'zinikini brend rangiga bo'yaydi;
 * `trackColor` iOS va Android'da boshqacha ishlaydi, shuning uchun
 * ikkalasi ham beriladi.
 */
export function Switch({
  value,
  onValueChange,
  disabled,
}: {
  value: boolean;
  onValueChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <RNSwitch
      value={value}
      onValueChange={onValueChange}
      disabled={disabled}
      trackColor={{ false: color.border, true: color.brand }}
      thumbColor="#ffffff"
      ios_backgroundColor={color.border}
      style={disabled ? { opacity: 0.5 } : undefined}
    />
  );
}

/* ─────────────────────────────────────────────── Ro'yxat qatori */

export function ListRow({
  icon,
  title,
  hint,
  right,
  onPress,
  last,
  tone,
}: {
  icon?: ReactNode;
  title: string;
  hint?: string;
  right?: ReactNode;
  onPress?: () => void;
  /** Oxirgi qatorda pastki chiziq chizilmaydi */
  last?: boolean;
  tone?: "default" | "danger";
}) {
  const body = (
    <>
      {icon}
      <View style={{ flex: 1 }}>
        <Text style={[s.rowTitle, tone === "danger" && { color: color.danger }]}>{title}</Text>
        {hint ? <Text style={s.rowHint}>{hint}</Text> : null}
      </View>
      {right ?? (onPress ? <Icon name="chevron" size={18} stroke="#cbd5e1" /> : null)}
    </>
  );

  if (!onPress) {
    return <View style={[s.row, !last && s.rowLine]}>{body}</View>;
  }
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [s.row, !last && s.rowLine, pressed && { backgroundColor: color.muted }]}
    >
      {body}
    </Pressable>
  );
}

/* ─────────────────────────────────────────────── Karta */

export function Card({ children, style }: { children: ReactNode; style?: object }) {
  return <View style={[s.card, style]}>{children}</View>;
}

/** Guruh sarlavhasi — karta ustidagi kichik yozuv */
export function GroupLabel({ children }: { children: ReactNode }) {
  return <Text style={s.group}>{children}</Text>;
}

const s = StyleSheet.create({
  btn: {
    height: size.controlLg,
    borderRadius: radius.control,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: space.sm,
    paddingHorizontal: space.lg,
  },
  btnText: { fontSize: font.body, fontWeight: "600", color: color.foreground },

  label: { fontSize: font.caption, fontWeight: "500", color: color.foreground, marginBottom: 6 },
  labelHint: { fontWeight: "400", color: color.mutedForeground },
  field: {
    height: size.controlLg,
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.card,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    gap: 10,
  },
  input: { flex: 1, fontSize: font.bodyLg, color: color.foreground, padding: 0 },
  error: { fontSize: 12, color: color.danger, marginTop: 6 },

  notice: { borderWidth: 1, borderRadius: radius.card, padding: 14 },
  noticeTitle: { fontSize: font.body, fontWeight: "700", marginBottom: 4 },
  noticeBody: { fontSize: font.caption, lineHeight: 19 },

  steps: { flexDirection: "row", gap: 6 },
  step: { flex: 1, height: 4, borderRadius: 2 },

  head: {
    backgroundColor: color.card,
    flexDirection: "row",
    alignItems: "center",
    gap: space.xs,
    paddingRight: space.lg,
    paddingBottom: space.md,
    borderBottomWidth: 1,
    borderBottomColor: color.border,
  },
  headBack: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  headTitle: { fontSize: 17, fontWeight: "700", color: color.foreground, letterSpacing: -0.3 },
  headSub: { fontSize: 12, color: color.mutedForeground, marginTop: 1 },

  row: { flexDirection: "row", alignItems: "center", gap: space.md, paddingHorizontal: space.lg, paddingVertical: 13 },
  rowLine: { borderBottomWidth: 1, borderBottomColor: color.border },
  rowTitle: { fontSize: font.body, color: color.foreground },
  rowHint: { fontSize: 12, color: color.mutedForeground, marginTop: 2 },

  card: {
    backgroundColor: color.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: color.border,
    overflow: "hidden",
  },
  group: {
    fontSize: 12,
    fontWeight: "600",
    color: color.mutedForeground,
    letterSpacing: 0.3,
    marginBottom: 6,
    marginLeft: space.xs,
  },
});
