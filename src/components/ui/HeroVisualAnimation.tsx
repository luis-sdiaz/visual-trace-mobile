import LottieView from "lottie-react-native";
import { Dimensions, StyleSheet, View } from "react-native";

export function HeroVisualAnimation() {
  const { height, width } = Dimensions.get("window");
  const animationSize = Math.min(width * 0.65, height * 0.26, 210);

  return (
    <View style={styles.container} testID="hero-visual-animation">
      <LottieView
        autoPlay
        loop
        source={require("../../../assets/animations/scan-hero.json")}
        style={[styles.animation, { height: animationSize, width: animationSize }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    flexShrink: 1,
    justifyContent: "center",
    marginVertical: 4,
  },
  animation: {},
});
