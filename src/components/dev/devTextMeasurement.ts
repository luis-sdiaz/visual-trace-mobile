import type { TextProps } from "react-native";

export function getDevTextMeasurementProps(
  id: string,
  content: string,
): Pick<TextProps, "onLayout" | "onTextLayout"> {
  if (!__DEV__) {
    return {};
  }

  return {
    onLayout: (event) => {
      console.info("[TextDiagnostics]", id, {
        content,
        textLayout: {
          width: event.nativeEvent.layout.width,
          height: event.nativeEvent.layout.height,
        },
      });
    },
    onTextLayout: (event) => {
      console.info("[TextDiagnostics]", id, {
        content,
        lines: event.nativeEvent.lines.map((line) => ({
          text: line.text,
          width: line.width,
          height: line.height,
        })),
      });
    },
  };
}
