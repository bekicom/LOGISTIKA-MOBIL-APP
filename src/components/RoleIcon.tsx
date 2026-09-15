/**
 * Rol belgisi — ro'yxat ekranlaridagi kartochka uchun.
 *
 * `royxat.tsx` dan ajratildi (2026-09-15): Google/Apple bilan
 * ro'yxatdan o'tish ekrani (`ijtimoiy-royxat.tsx`) ham xuddi shu
 * kartochkalarni chizadi. Ikki nusxa bo'lsa, biri o'zgarganda
 * ikkinchisi eskirib qolardi.
 */
import Svg, { Circle, Path, Rect } from "react-native-svg";
import { color } from "@/lib/theme";

export function RoleIcon({ value, on }: { value: string; on: boolean }) {
  const c = on ? "#ffffff" : color.mutedForeground;
  if (value === "DRIVER")
    return (
      <Svg width={22} height={22} viewBox="0 0 24 24">
        <Path
          d="M10 17h4V5H2v12h3M20 17h2v-3.34a4 4 0 0 0-1.17-2.83L19 9h-5v8h1"
          stroke={c}
          strokeWidth={2}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Circle cx={7.5} cy={17.5} r={2.5} stroke={c} strokeWidth={2} fill="none" />
        <Circle cx={17.5} cy={17.5} r={2.5} stroke={c} strokeWidth={2} fill="none" />
      </Svg>
    );
  if (value === "SHIPPER")
    return (
      <Svg width={22} height={22} viewBox="0 0 24 24">
        <Path
          d="m7.5 4.27 9 5.15M21 8l-9 5-9-5 9-5 9 5zM3 8v8l9 5 9-5V8"
          stroke={c}
          strokeWidth={2}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    );
  if (value === "VEHICLE_OWNER")
    return (
      <Svg width={22} height={22} viewBox="0 0 24 24">
        <Path
          d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-5h6v5"
          stroke={c}
          strokeWidth={2}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    );
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24">
      <Rect x={3} y={4} width={18} height={16} rx={2} stroke={c} strokeWidth={2} fill="none" />
      <Path d="M7 9h4M7 13h10M7 17h7" stroke={c} strokeWidth={2} strokeLinecap="round" fill="none" />
    </Svg>
  );
}
