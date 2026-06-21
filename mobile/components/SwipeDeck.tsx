import React, { useCallback, useState } from "react";
import { Dimensions, Pressable, StyleSheet, Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { colors, font, radius } from "@/theme/tokens";
import { SwipeCard } from "./SwipeCard";
import { haptic } from "@/lib/haptics";
import type { Candidate, SwipeDirection } from "@/lib/types";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");
const SWIPE_X = SCREEN_W * 0.26; // horizontal commit threshold
const SWIPE_UP = 130; // vertical (super-like) commit threshold
const OUT_X = SCREEN_W * 1.4;
const OUT_Y = SCREEN_H * 1.1;

type Props = {
  candidates: Candidate[];
  onDecision: (candidate: Candidate, direction: SwipeDirection) => void;
  onExhausted?: () => void;
};

/**
 * Full-screen card deck with native gestures (PanGestureHandler + Reanimated).
 * Swipe right = like, left = pass, up = super-like. The control bar mirrors the
 * gestures for accessibility and one-handed use.
 */
export function SwipeDeck({ candidates, onDecision, onExhausted }: Props) {
  const [index, setIndex] = useState(0);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);

  const current = candidates[index];
  const next = candidates[index + 1];

  const advance = useCallback(
    (candidate: Candidate, direction: SwipeDirection) => {
      onDecision(candidate, direction);
      tx.value = 0;
      ty.value = 0;
      setIndex((i) => {
        const ni = i + 1;
        if (ni >= candidates.length) onExhausted?.();
        return ni;
      });
    },
    [candidates.length, onDecision, onExhausted, tx, ty],
  );

  // Programmatic fling (used by the buttons and accepted gestures alike).
  const fling = useCallback(
    (candidate: Candidate, direction: SwipeDirection) => {
      haptic.tap();
      const toX = direction === "left" ? -OUT_X : direction === "right" ? OUT_X : 0;
      const toY = direction === "up" ? -OUT_Y : 0;
      ty.value = withTiming(toY, { duration: 240 });
      tx.value = withTiming(toX, { duration: 240 }, (finished) => {
        if (finished) runOnJS(advance)(candidate, direction);
      });
    },
    [advance, tx, ty],
  );

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      tx.value = e.translationX;
      ty.value = e.translationY;
    })
    .onEnd((e) => {
      "worklet";
      const up = ty.value < -SWIPE_UP && Math.abs(ty.value) > Math.abs(tx.value);
      const right = tx.value > SWIPE_X;
      const left = tx.value < -SWIPE_X;
      if (current && (up || right || left)) {
        const dir: SwipeDirection = up ? "up" : right ? "right" : "left";
        const toX = dir === "left" ? -OUT_X : dir === "right" ? OUT_X : 0;
        const toY = dir === "up" ? -OUT_Y : 0;
        ty.value = withTiming(toY, { duration: 200 });
        tx.value = withTiming(toX, { duration: 200 }, (finished) => {
          if (finished) runOnJS(advance)(current, dir);
        });
        runOnJS(haptic.tap)();
      } else {
        tx.value = withSpring(0, { damping: 18 });
        ty.value = withSpring(0, { damping: 18 });
      }
    });

  const topStyle = useAnimatedStyle(() => {
    const rotate = interpolate(tx.value, [-SCREEN_W, SCREEN_W], [-9, 9], Extrapolation.CLAMP);
    return {
      transform: [
        { translateX: tx.value },
        { translateY: ty.value },
        { rotateZ: `${rotate}deg` },
      ],
    };
  });

  const nextStyle = useAnimatedStyle(() => {
    const progress = Math.min(
      1,
      (Math.abs(tx.value) / SWIPE_X + Math.abs(ty.value) / SWIPE_UP) / 2,
    );
    const scale = interpolate(progress, [0, 1], [0.94, 1], Extrapolation.CLAMP);
    return { transform: [{ scale }], opacity: interpolate(progress, [0, 1], [0.85, 1]) };
  });

  const likeStyle = useAnimatedStyle(() => ({
    opacity: interpolate(tx.value, [20, SWIPE_X], [0, 1], Extrapolation.CLAMP),
  }));
  const nopeStyle = useAnimatedStyle(() => ({
    opacity: interpolate(tx.value, [-20, -SWIPE_X], [0, 1], Extrapolation.CLAMP),
  }));
  const superStyle = useAnimatedStyle(() => ({
    opacity: interpolate(ty.value, [-40, -SWIPE_UP], [0, 1], Extrapolation.CLAMP),
  }));

  if (!current) return null;

  return (
    <View style={styles.wrap}>
      <View style={styles.deck}>
        {next ? (
          <Animated.View style={[styles.cardLayer, nextStyle]} pointerEvents="none">
            <SwipeCard candidate={next} />
          </Animated.View>
        ) : null}

        <GestureDetector gesture={pan}>
          <Animated.View style={[styles.cardLayer, topStyle]}>
            <SwipeCard candidate={current} />

            <Animated.View style={[styles.stamp, styles.stampLike, likeStyle]}>
              <Text style={[styles.stampText, { color: colors.ok }]}>LIKE</Text>
            </Animated.View>
            <Animated.View style={[styles.stamp, styles.stampNope, nopeStyle]}>
              <Text style={[styles.stampText, { color: colors.danger }]}>PASS</Text>
            </Animated.View>
            <Animated.View style={[styles.stamp, styles.stampSuper, superStyle]}>
              <Text style={[styles.stampText, { color: colors.gold }]}>INTRO</Text>
            </Animated.View>
          </Animated.View>
        </GestureDetector>
      </View>

      <View style={styles.controls}>
        <CircleButton icon="close" color={colors.danger} onPress={() => fling(current, "left")} />
        <CircleButton
          icon="star"
          color={colors.gold}
          size={56}
          onPress={() => fling(current, "up")}
        />
        <CircleButton icon="heart" color={colors.ok} onPress={() => fling(current, "right")} />
      </View>
    </View>
  );
}

function CircleButton({
  icon,
  color,
  onPress,
  size = 64,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  onPress: () => void;
  size?: number;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.circle,
        { width: size, height: size, borderRadius: size / 2, borderColor: color },
        pressed && { transform: [{ scale: 0.92 }] },
      ]}
    >
      <Ionicons name={icon} size={size * 0.42} color={color} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  deck: { flex: 1, marginBottom: 12 },
  cardLayer: { ...StyleSheet.absoluteFillObject },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 22,
    paddingVertical: 8,
  },
  circle: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    backgroundColor: colors.card,
  },
  stamp: {
    position: "absolute",
    top: 26,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.sm,
    borderWidth: 3,
    backgroundColor: "rgba(16,11,22,0.5)",
  },
  stampLike: { left: 22, borderColor: colors.ok, transform: [{ rotate: "-12deg" }] },
  stampNope: { right: 22, borderColor: colors.danger, transform: [{ rotate: "12deg" }] },
  stampSuper: {
    alignSelf: "center",
    left: 0,
    right: 0,
    top: 60,
    marginHorizontal: "auto",
    borderColor: colors.gold,
    width: 120,
    alignItems: "center",
  },
  stampText: { fontSize: font.size.xl, fontWeight: font.weight.bold, letterSpacing: 2 },
});
