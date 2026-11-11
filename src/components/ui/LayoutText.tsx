import {
  StyleSheet,
  Text,
  type TextProps,
  type TextStyle,
} from "react-native";

export type LayoutTextVariant =
  | "atomic"
  | "intrinsic"
  | "fullWidth"
  | "flexible"
  | "stretch";

export function getLayoutTextStyle(
  variant: LayoutTextVariant,
): TextStyle | undefined {
  switch (variant) {
    case "atomic":
      return undefined;
    case "fullWidth":
      return styles.fullWidth;
    case "flexible":
      return styles.flexible;
    case "stretch":
      return styles.stretch;
    case "intrinsic":
      return undefined;
  }
}

export type LayoutTextProps = TextProps & {
  layout?: LayoutTextVariant;
};

export function LayoutText({
  layout = "intrinsic",
  style,
  ...props
}: LayoutTextProps) {
  return (
    <Text
      {...props}
      style={[getLayoutTextStyle(layout), style]}
    />
  );
}

const styles = StyleSheet.create({
  fullWidth: {
    width: "100%",
    minWidth: 0,
    flexShrink: 1,
  },
  flexible: {
    flex: 1,
    minWidth: 0,
    flexShrink: 1,
  },
  stretch: {
    alignSelf: "stretch",
    minWidth: 0,
    flexShrink: 1,
  },
});
