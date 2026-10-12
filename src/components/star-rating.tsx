import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { useTheme } from '@/hooks/use-theme';

const STAR_PATH =
  'M12 2.5l2.94 5.96 6.58.96-4.76 4.64 1.12 6.55L12 17.52l-5.88 3.09 1.12-6.55L2.48 9.42l6.58-.96z';

type StarRatingProps = {
  /** 0–5; fractional values are rounded to the nearest half star. */
  value: number;
  size?: number;
  /** When set, the stars become tappable inputs. */
  onChange?: (value: number) => void;
  /** Allow picking half stars (tap the left half of a star). Default true. */
  allowHalf?: boolean;
};

// Five stars, either as a read-only display or as an input. A half star is a
// full star clipped to half width, layered over an empty one.
export function StarRating({ value, size = 20, onChange, allowHalf = true }: StarRatingProps) {
  const theme = useTheme();
  const rounded = Math.round(value * 2) / 2;

  return (
    <View
      style={styles.row}
      accessible={!onChange}
      accessibilityLabel={onChange ? undefined : `${rounded} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((star) => {
        const fill = rounded >= star ? 1 : rounded >= star - 0.5 ? 0.5 : 0;
        return (
          <View key={star} style={{ width: size, height: size }}>
            {/* Faded secondary text color reads on both plain and card backgrounds. */}
            <View style={styles.emptyStar}>
              <Star size={size} color={theme.textSecondary} />
            </View>
            {fill > 0 ? (
              <View style={[styles.fillClip, { width: size * fill }]}>
                <Star size={size} color={theme.accent} />
              </View>
            ) : null}

            {onChange ? (
              <View style={StyleSheet.absoluteFill}>
                {allowHalf ? (
                  <View style={styles.halves}>
                    <Pressable
                      style={styles.half}
                      onPress={() => onChange(star - 0.5)}
                      accessibilityRole="button"
                      accessibilityLabel={`${star - 0.5} stars`}
                    />
                    <Pressable
                      style={styles.half}
                      onPress={() => onChange(star)}
                      accessibilityRole="button"
                      accessibilityLabel={`${star} stars`}
                    />
                  </View>
                ) : (
                  <Pressable
                    style={StyleSheet.absoluteFill}
                    // Tapping the current score again clears it.
                    onPress={() => onChange(rounded === star ? 0 : star)}
                    accessibilityRole="button"
                    accessibilityLabel={`${star} stars`}
                  />
                )}
              </View>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

function Star({ size, color }: { size: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d={STAR_PATH} fill={color} />
    </Svg>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 2,
  },
  emptyStar: {
    opacity: 0.25,
  },
  fillClip: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  halves: {
    flex: 1,
    flexDirection: 'row',
  },
  half: {
    flex: 1,
  },
});
