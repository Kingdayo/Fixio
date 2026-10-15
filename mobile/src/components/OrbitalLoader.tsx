import React, { useEffect, useRef } from "react";
import { View, Text, Animated, StyleSheet, Easing } from "react-native";
import { useTheme } from "../context/ThemeContext";

type OrbitalLoaderProps = {
  label?: string;
  sublabel?: string;
  className?: string;
};

export const OrbitalLoader: React.FC<OrbitalLoaderProps> = ({
  label = "Loading Fixio…",
  sublabel = "Preparing your QA documentation workspace",
}) => {
  const { colors } = useTheme();
  const spinValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 2000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  }, [spinValue]);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <View style={styles.container}>
      <View style={styles.spinnerContainer}>
        <Animated.View
          style={[
            styles.outerRing,
            { borderColor: colors.brand, transform: [{ rotate: spin }] },
          ]}
        >
          <View style={[styles.dot, { backgroundColor: colors.brand }]} />
        </Animated.View>
        <View style={[styles.innerBadge, { backgroundColor: colors.brand }]}>
          <Text style={styles.badgeText}>F</Text>
        </View>
      </View>
      <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
      {Boolean(sublabel) && (
        <Text style={[styles.sublabel, { color: colors.textMuted }]}>{sublabel}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  spinnerContainer: {
    width: 64,
    height: 64,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  outerRing: {
    position: "absolute",
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 3,
    borderTopColor: "transparent",
    alignItems: "flex-end",
    padding: 2,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  innerBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 18,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  sublabel: {
    fontSize: 13,
    marginTop: 4,
    textAlign: "center",
  },
});
