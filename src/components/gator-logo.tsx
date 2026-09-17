import Svg, { Circle, Ellipse, Path } from 'react-native-svg';

// Gaitr's mascot: a friendly cartoon alligator face, drawn as vector shapes so
// it stays crisp at any size and always renders in the brand green. Swap this
// out for a designed asset later if desired.
export function GatorLogo({ size = 96 }: { size?: number }) {
  const green = '#2BB56A';
  const greenDark = '#0F7A44';
  const dark = '#0B2016';

  return (
    <Svg width={size} height={size} viewBox="0 0 120 120">
      {/* eye bumps on top of the head */}
      <Circle cx="42" cy="34" r="18" fill={green} stroke={greenDark} strokeWidth={3} />
      <Circle cx="78" cy="34" r="18" fill={green} stroke={greenDark} strokeWidth={3} />

      {/* snout / head, drawn over the lower half of the eye bumps */}
      <Path
        d="M24 60 q0 -22 22 -26 q14 -3 28 0 q22 4 22 26 q0 30 -36 32 q-36 -2 -36 -32 z"
        fill={green}
        stroke={greenDark}
        strokeWidth={3}
        strokeLinejoin="round"
      />

      {/* eyes */}
      <Circle cx="42" cy="32" r="8.5" fill="#ffffff" stroke={greenDark} strokeWidth={2} />
      <Circle cx="78" cy="32" r="8.5" fill="#ffffff" stroke={greenDark} strokeWidth={2} />
      <Circle cx="44" cy="33" r="4" fill={dark} />
      <Circle cx="76" cy="33" r="4" fill={dark} />

      {/* nostrils */}
      <Ellipse cx="52" cy="58" rx="2.6" ry="3.4" fill={greenDark} />
      <Ellipse cx="68" cy="58" rx="2.6" ry="3.4" fill={greenDark} />

      {/* smiling mouth */}
      <Path
        d="M38 74 q22 16 44 0"
        fill="none"
        stroke={greenDark}
        strokeWidth={3}
        strokeLinecap="round"
      />

      {/* teeth */}
      <Path d="M45 77 l3 6 l3 -6 z" fill="#ffffff" />
      <Path d="M55 79 l3 6 l3 -6 z" fill="#ffffff" />
      <Path d="M64 79 l3 6 l3 -6 z" fill="#ffffff" />
      <Path d="M73 77 l3 6 l3 -6 z" fill="#ffffff" />
    </Svg>
  );
}
