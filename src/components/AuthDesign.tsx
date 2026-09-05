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
import Svg, { Circle, Defs, LinearGradient, Path, Rect, Stop } from "react-native-svg";
import { color, font, space } from "@/lib/theme";

export function AuthTexture() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width="100%" height="100%" viewBox="0 0 393 852" preserveAspectRatio="none">
        <Defs>
          <LinearGradient id="authBg" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#08162b" />
            <Stop offset="0.58" stopColor="#071326" />
            <Stop offset="1" stopColor="#0b1d35" />
          </LinearGradient>
          <LinearGradient id="authLine" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#f45a18" stopOpacity="0.08" />
            <Stop offset="0.52" stopColor="#ffffff" stopOpacity="0.16" />
            <Stop offset="1" stopColor="#f45a18" stopOpacity="0.05" />
          </LinearGradient>
        </Defs>
        <Rect width="393" height="852" fill="url(#authBg)" />
        <Circle cx="326" cy="70" r="152" fill="#12345f" opacity="0.16" />
        <Circle cx="55" cy="688" r="210" fill="#12345f" opacity="0.11" />
        <Path
          d="M-24 440 C61 391 93 466 158 424 C218 386 260 318 420 344"
          fill="none"
          stroke="url(#authLine)"
          strokeWidth={1.4}
          strokeLinecap="round"
        />
        <Path
          d="M18 196 C78 166 106 226 164 195 C224 162 262 93 370 128"
          fill="none"
          stroke="#7aa3d8"
          strokeOpacity="0.13"
          strokeWidth={1}
          strokeDasharray="4 7"
        />
      </Svg>
    </View>
  );
}

export function BackButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable onPress={onPress} hitSlop={12} style={s.back} accessibilityRole="button">
      <Svg width={23} height={23} viewBox="0 0 24 24">
        <Path
          d="m15 18-6-6 6-6"
          stroke="#ffffff"
          strokeWidth={2.2}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </Svg>
    </Pressable>
  );
}

export function ProgressDots({ total, current }: { total: number; current: number }) {
  return (
    <View style={s.progress}>
      {Array.from({ length: total }, (_, i) => (
        <View key={i} style={[s.progressItem, i < current && s.progressOn]} />
      ))}
    </View>
  );
}

export function GlassPanel({ children, style }: { children: ReactNode; style?: object }) {
  return <View style={[s.panel, style]}>{children}</View>;
}

export function DarkInput({ style, ...props }: TextInputProps) {
  return (
    <TextInput
      placeholderTextColor="#7891b1"
      style={[s.input, style]}
      {...props}
    />
  );
}

export function LabeledDarkInput({
  label,
  hint,
  right,
  ...props
}: TextInputProps & { label: string; hint?: string; right?: ReactNode }) {
  return (
    <View>
      <Text style={s.label}>
        {label}
        {hint ? <Text style={s.labelHint}> - {hint}</Text> : null}
      </Text>
      <View style={s.inputWrap}>
        <DarkInput style={{ flex: 1, height: 54, borderWidth: 0, backgroundColor: "transparent" }} {...props} />
        {right}
      </View>
    </View>
  );
}

export function PrimaryAction({
  title,
  onPress,
  loading,
  disabled,
}: {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
}) {
  const off = loading || disabled;
  return (
    <Pressable
      onPress={off ? undefined : onPress}
      accessibilityRole="button"
      accessibilityState={{ disabled: off, busy: loading }}
      style={({ pressed }) => [s.primary, pressed && !off && s.primaryDown, off && s.buttonOff]}
    >
      {loading ? (
        <ActivityIndicator color="#ffffff" />
      ) : (
        <>
          <Text style={[s.primaryText, off && s.buttonOffText]}>{title}</Text>
          <Text style={[s.primaryArrow, off && s.buttonOffText]}>→</Text>
        </>
      )}
    </Pressable>
  );
}

export function SecondaryAction({ title, onPress }: { title: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => [s.secondary, pressed && s.secondaryDown]}>
      <Text style={s.secondaryText}>{title}</Text>
    </Pressable>
  );
}

export function EyeButton({ shown, onPress }: { shown: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} hitSlop={10} accessibilityRole="button">
      <Svg width={21} height={21} viewBox="0 0 24 24">
        <Path
          d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z"
          stroke="#9eb5d5"
          strokeWidth={2}
          fill="none"
          strokeLinejoin="round"
        />
        <Circle cx={12} cy={12} r={3} stroke="#9eb5d5" strokeWidth={2} fill="none" />
        {shown ? <Path d="M3 3l18 18" stroke="#9eb5d5" strokeWidth={2} strokeLinecap="round" /> : null}
      </Svg>
    </Pressable>
  );
}

const s = StyleSheet.create({
  back: { width: 44, height: 44, marginLeft: -12, alignItems: "center", justifyContent: "center" },
  progress: { flexDirection: "row", gap: 7, marginTop: 12 },
  progressItem: { flex: 1, height: 5, borderRadius: 999, backgroundColor: "#294566" },
  progressOn: { backgroundColor: color.brand },
  panel: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#294566",
    backgroundColor: "rgba(15, 37, 68, 0.72)",
    padding: space.lg,
  },
  label: { fontSize: font.caption, fontWeight: "700", color: "#ffffff", marginBottom: 8 },
  labelHint: { fontWeight: "500", color: "#9eb5d5" },
  input: {
    height: 56,
    borderRadius: 14,
    borderWidth: 1.2,
    borderColor: "#33577f",
    backgroundColor: "#0c1f3a",
    color: "#ffffff",
    fontSize: font.bodyLg,
    fontWeight: "600",
    paddingHorizontal: 15,
  },
  inputWrap: {
    height: 56,
    borderRadius: 14,
    borderWidth: 1.2,
    borderColor: "#33577f",
    backgroundColor: "#0c1f3a",
    flexDirection: "row",
    alignItems: "center",
    paddingRight: 14,
  },
  primary: {
    minHeight: 62,
    borderRadius: 16,
    backgroundColor: color.brand,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    paddingHorizontal: space.xl,
  },
  primaryDown: { backgroundColor: color.brandHover },
  primaryText: { flex: 1, textAlign: "center", color: "#ffffff", fontSize: 18, fontWeight: "800" },
  primaryArrow: { color: "#ffffff", fontSize: 30, fontWeight: "600", marginLeft: -28 },
  buttonOff: { backgroundColor: "#294566" },
  buttonOffText: { color: "#7891b1" },
  secondary: {
    minHeight: 56,
    borderRadius: 16,
    borderWidth: 1.3,
    borderColor: "#33577f",
    backgroundColor: "rgba(15, 37, 68, 0.58)",
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryDown: { backgroundColor: "rgba(33, 71, 112, 0.72)" },
  secondaryText: { color: "#ffffff", fontSize: font.bodyLg, fontWeight: "800" },
});
