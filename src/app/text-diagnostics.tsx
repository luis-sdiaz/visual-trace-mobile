import { Redirect } from "expo-router";

import { TextRenderingDiagnostics } from "@/components/dev/TextRenderingDiagnostics";

export default function TextDiagnosticsRoute() {
  if (!__DEV__) {
    return <Redirect href="/home" />;
  }

  return <TextRenderingDiagnostics />;
}
