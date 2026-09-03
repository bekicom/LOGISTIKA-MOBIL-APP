/**
 * Yuklanmoqda / bo'sh / xato holatlari.
 *
 * TZ §9: har ekranda shu uchtasi bo'lishi shart. Bitta joyda yozilgan —
 * har ekranda qayta o'ylab o'tirilmaydi va ko'rinishi bir xil bo'ladi.
 */
import { StyleSheet, Text, View } from "react-native";
import { Icon, type IconName } from "./Icon";
import { Button } from "./ui";
import { color, font, radius, space } from "@/lib/theme";
import { t } from "@/lib/i18n";

/** Kartochka shaklidagi kutish — aylanuvchi spinner emas.
 *  Spinner nima kelayotganini aytmaydi, skelet aytadi. */
export function Skeleton({ rows = 3 }: { rows?: number }) {
  return (
    <View style={{ gap: space.md }}>
      {Array.from({ length: rows }, (_, i) => (
        <View key={i} style={s.sk}>
          <View style={[s.bar, { width: 90, height: 24 }]} />
          <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
            <View style={[s.bar, { flex: 1, height: 22 }]} />
            <View style={[s.bar, { flex: 1, height: 22 }]} />
          </View>
          <View style={{ flexDirection: "row", gap: 6, marginTop: 14 }}>
            <View style={[s.bar, { width: 54, height: 26 }]} />
            <View style={[s.bar, { width: 62, height: 26 }]} />
            <View style={[s.bar, { width: 88, height: 26 }]} />
          </View>
          <View style={[s.bar, { width: 160, height: 22, marginTop: 14 }]} />
        </View>
      ))}
    </View>
  );
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <View style={s.box}>
      <View style={[s.circle, { backgroundColor: "#dc26261a" }]}>
        <Icon name="alert" size={24} stroke={color.danger} />
      </View>
      <Text style={s.title}>{t("mob.state.noData")}</Text>
      <Text style={s.text}>{message}</Text>
      {onRetry ? (
        <View style={{ alignSelf: "stretch", marginTop: space.lg }}>
          <Button title={t("mob.ui.retry")} variant="secondary" onPress={onRetry} />
        </View>
      ) : null}
    </View>
  );
}

export function Empty({
  icon = "package",
  title,
  text,
  actionLabel,
  onAction,
}: {
  icon?: IconName;
  title: string;
  text?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={s.box}>
      <View style={s.circle}>
        <Icon name={icon} size={26} stroke="#94a3b8" />
      </View>
      <Text style={s.title}>{title}</Text>
      {text ? <Text style={s.text}>{text}</Text> : null}
      {actionLabel && onAction ? (
        <View style={{ alignSelf: "stretch", marginTop: space.lg }}>
          <Button title={actionLabel} onPress={onAction} />
        </View>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  sk: {
    backgroundColor: color.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: color.border,
    padding: space.lg,
  },
  bar: { backgroundColor: color.muted, borderRadius: 6 },

  box: {
    backgroundColor: color.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: color.border,
    padding: space.xxl,
    alignItems: "center",
  },
  circle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: color.muted,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: space.md,
  },
  title: { fontSize: font.bodyLg, fontWeight: "700", color: color.foreground, textAlign: "center" },
  text: {
    fontSize: font.caption,
    color: color.mutedForeground,
    textAlign: "center",
    marginTop: 6,
    lineHeight: 20,
  },
});
