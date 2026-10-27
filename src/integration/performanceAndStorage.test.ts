import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("Performance, Cache and Storage Integration Safeguards", () => {
  it("ensures home screen configures FlatList with performance optimization parameters", () => {
    const homeCode = readFileSync(
      resolve(process.cwd(), "src/app/home.tsx"),
      "utf8",
    );

    expect(homeCode).toContain("FlatList");
    expect(homeCode).toContain("maxToRenderPerBatch={8}");
    expect(homeCode).toContain("windowSize={5}");
    expect(homeCode).toContain("removeClippedSubviews={true}");
    expect(homeCode).toContain("initialNumToRender={6}");
  });

  it("ensures ComparisonPreview is memoized with React.memo", () => {
    const previewCode = readFileSync(
      resolve(process.cwd(), "src/components/ui/ComparisonPreview.tsx"),
      "utf8",
    );

    expect(previewCode).toContain("memo(");
    expect(previewCode).toContain("ComparisonPreview.displayName");
  });

  it("ensures AuthContext integrates session cache purge on boot and sign out", () => {
    const authCode = readFileSync(
      resolve(process.cwd(), "src/context/AuthContext.tsx"),
      "utf8",
    );

    expect(authCode).toContain("handleSessionCachePurge");
    expect(authCode).toContain("purgeOldImageCache");
  });

  it("ensures imageSelection applies sanitized quality limits", () => {
    const imageSelectionCode = readFileSync(
      resolve(process.cwd(), "src/utils/imageSelection.ts"),
      "utf8",
    );

    expect(imageSelectionCode).toContain("DEFAULT_IMAGE_COMPRESSION_QUALITY");
    expect(imageSelectionCode).toContain("sanitizeCompressionQuality");
    expect(imageSelectionCode).toContain("MIN_IMAGE_COMPRESSION_QUALITY");
    expect(imageSelectionCode).toContain("MAX_IMAGE_COMPRESSION_QUALITY");
  });
});

