/**
 * Tanishtiruv illyustratsiyalari — SVG, ko'k fon uchun.
 *
 * Rasm (PNG) ATAYLAB yo'q: Codex 6 MB surat qo'shgan edi, ilova
 * hajmi shuncha oshardi. Bu uchtasi jami ~6 KB. Ranglar — oq, brend
 * to'q sarig'i va ochroq ko'k; fon `color.blue`.
 *
 * Oddiy shakllar — flat uslub (unDraw kabi): odam yo'q, narsalar bor.
 */
import Svg, { Circle, Path, Rect } from "react-native-svg";
import { color } from "@/lib/theme";

const W = 300;
const H = 210;
const soft = "#ffffff55";
const pale = "#c9d8f7";

/** 1 — yuk va transport bir joyda: yuk mashinasi, quti, pin */
export function IlloMarket() {
  return (
    <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      <Circle cx={150} cy={108} r={92} fill={soft} />
      {/* yo'l */}
      <Rect x={30} y={158} width={240} height={8} rx={4} fill={pale} />
      <Path d="M44 162h22M84 162h30M132 162h16M166 162h34M218 162h26" stroke="#ffffff" strokeWidth={2.5} strokeLinecap="round" />
      {/* kuzov */}
      <Rect x={62} y={88} width={112} height={62} rx={8} fill="#ffffff" />
      <Rect x={72} y={100} width={92} height={5} rx={2.5} fill={pale} />
      <Rect x={72} y={112} width={64} height={5} rx={2.5} fill={pale} />
      {/* kabina */}
      <Path d="M174 104h34l22 24v22h-56z" fill={color.brand} />
      <Rect x={184} y={110} width={22} height={14} rx={3} fill="#ffe1d1" />
      {/* g'ildiraklar */}
      <Circle cx={94} cy={154} r={13} fill="#0b1526" />
      <Circle cx={94} cy={154} r={5} fill="#94a3b8" />
      <Circle cx={204} cy={154} r={13} fill="#0b1526" />
      <Circle cx={204} cy={154} r={5} fill="#94a3b8" />
      {/* qutilar */}
      <Rect x={84} y={52} width={30} height={30} rx={5} fill="#ffffff" />
      <Path d="M84 66h30M99 52v30" stroke={pale} strokeWidth={2} />
      <Rect x={120} y={40} width={26} height={26} rx={5} fill={pale} />
      <Path d="M120 52h26M133 40v26" stroke="#ffffff" strokeWidth={2} />
      {/* pin */}
      <Path d="M238 40c-12 0-20 9-20 20 0 15 20 34 20 34s20-19 20-34c0-11-8-20-20-20z" fill={color.brand} />
      <Circle cx={238} cy={60} r={7} fill="#ffffff" />
    </Svg>
  );
}

/** 2 — har bir reys ko'z oldingizda: telefon, marshrut, joylashuv */
export function IlloTracking() {
  return (
    <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      <Circle cx={150} cy={108} r={92} fill={soft} />
      {/* telefon */}
      <Rect x={98} y={22} width={104} height={176} rx={20} fill="#ffffff" />
      <Rect x={108} y={38} width={84} height={144} rx={12} fill="#eef3ff" />
      <Rect x={134} y={28} width={32} height={5} rx={2.5} fill={pale} />
      {/* xarita chiziqlari */}
      <Path d="M108 84h84M108 124h84M140 38v144M170 38v144" stroke="#ffffff" strokeWidth={4} />
      {/* marshrut */}
      <Path
        d="M124 160c14-18 8-40 26-52s34-6 40-30"
        stroke={color.brand}
        strokeWidth={4}
        strokeLinecap="round"
        strokeDasharray="1 0"
        fill="none"
      />
      <Circle cx={124} cy={160} r={7} fill="#ffffff" stroke={color.brand} strokeWidth={3} />
      <Path d="M190 62c-8 0-14 6-14 14 0 10 14 24 14 24s14-14 14-24c0-8-6-14-14-14z" fill={color.brand} />
      <Circle cx={190} cy={76} r={5} fill="#ffffff" />
      {/* mashina belgisi */}
      <Rect x={146} y={104} width={20} height={12} rx={3} fill="#0b1526" />
      <Circle cx={150} cy={117} r={3} fill="#94a3b8" />
      <Circle cx={162} cy={117} r={3} fill="#94a3b8" />
      {/* pulsatsiya */}
      <Circle cx={156} cy={110} r={22} stroke="#ffffff" strokeWidth={2} fill="none" />
      <Circle cx={156} cy={110} r={32} stroke="#ffffff88" strokeWidth={2} fill="none" />
      {/* vaqt kartasi */}
      <Rect x={36} y={60} width={62} height={34} rx={9} fill="#ffffff" />
      <Rect x={46} y={70} width={28} height={5} rx={2.5} fill={color.brand} />
      <Rect x={46} y={80} width={40} height={5} rx={2.5} fill={pale} />
      <Rect x={206} y={124} width={62} height={34} rx={9} fill="#ffffff" />
      <Rect x={216} y={134} width={22} height={5} rx={2.5} fill={color.success} />
      <Rect x={216} y={144} width={40} height={5} rx={2.5} fill={pale} />
    </Svg>
  );
}

/** 3 — hujjat va pul nazorati: hujjat, tasdiq, tanga */
export function IlloDocs() {
  return (
    <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      <Circle cx={150} cy={108} r={92} fill={soft} />
      {/* orqa hujjat */}
      <Rect x={96} y={40} width={96} height={124} rx={12} fill={pale} />
      {/* old hujjat */}
      <Rect x={112} y={28} width={104} height={136} rx={12} fill="#ffffff" />
      <Path d="M186 28v22a8 8 0 0 0 8 8h22" fill={pale} />
      <Rect x={128} y={62} width={56} height={6} rx={3} fill="#0b1526" />
      <Rect x={128} y={78} width={72} height={5} rx={2.5} fill={pale} />
      <Rect x={128} y={90} width={60} height={5} rx={2.5} fill={pale} />
      <Rect x={128} y={102} width={68} height={5} rx={2.5} fill={pale} />
      <Rect x={128} y={122} width={40} height={5} rx={2.5} fill={pale} />
      <Rect x={128} y={134} width={72} height={8} rx={4} fill={color.brand} />
      {/* tasdiq */}
      <Circle cx={216} cy={150} r={26} fill={color.success} />
      <Path d="M204 150l8 8 16-16" stroke="#ffffff" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      {/* tangalar */}
      <Circle cx={64} cy={140} r={22} fill="#ffffff" />
      <Circle cx={64} cy={140} r={14} stroke={color.brand} strokeWidth={3} fill="none" />
      <Path d="M64 132v16M59 136h10M59 144h10" stroke={color.brand} strokeWidth={2.5} strokeLinecap="round" />
      <Circle cx={80} cy={166} r={16} fill={pale} />
      <Circle cx={80} cy={166} r={9} stroke="#ffffff" strokeWidth={3} fill="none" />
    </Svg>
  );
}
