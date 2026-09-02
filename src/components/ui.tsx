/**
 * Kichik UI to'plami — web'dagi `furam/src/components/ui.tsx` ning mobil ko'rinishi.
 * O'lchamlar va ranglar o'sha yerdan olingan, faqat tegish maydoni kattaroq.
 */
import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from "react-native";
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
});
