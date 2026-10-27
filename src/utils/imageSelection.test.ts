import { describe, expect, it, vi } from "vitest";

import {
  DEFAULT_IMAGE_COMPRESSION_QUALITY,
  MAX_IMAGE_COMPRESSION_QUALITY,
  MIN_IMAGE_COMPRESSION_QUALITY,
  getSelectedImageUri,
  sanitizeCompressionQuality,
  selectComparisonPhoto,
} from "@/utils/imageSelection";

function createPicker() {
  return {
    requestCameraPermissionsAsync: vi.fn().mockResolvedValue({ granted: true }),
    requestMediaLibraryPermissionsAsync: vi.fn().mockResolvedValue({ granted: true }),
    launchCameraAsync: vi.fn().mockResolvedValue({
      canceled: false as const,
      assets: [{ uri: "file:///camera.jpg" }],
    }),
    launchImageLibraryAsync: vi.fn().mockResolvedValue({
      canceled: false as const,
      assets: [{ uri: "file:///library.jpg" }],
    }),
  };
}

describe("sanitizeCompressionQuality", () => {
  it("returns default quality when undefined, null or NaN", () => {
    expect(sanitizeCompressionQuality()).toBe(DEFAULT_IMAGE_COMPRESSION_QUALITY);
    expect(sanitizeCompressionQuality(null)).toBe(DEFAULT_IMAGE_COMPRESSION_QUALITY);
    expect(sanitizeCompressionQuality(NaN)).toBe(DEFAULT_IMAGE_COMPRESSION_QUALITY);
  });

  it("clamps values lower than minimum quality threshold", () => {
    expect(sanitizeCompressionQuality(0.1)).toBe(MIN_IMAGE_COMPRESSION_QUALITY);
    expect(sanitizeCompressionQuality(-1)).toBe(MIN_IMAGE_COMPRESSION_QUALITY);
  });

  it("clamps values higher than maximum quality threshold", () => {
    expect(sanitizeCompressionQuality(1.0)).toBe(MAX_IMAGE_COMPRESSION_QUALITY);
    expect(sanitizeCompressionQuality(1.5)).toBe(MAX_IMAGE_COMPRESSION_QUALITY);
  });

  it("preserves valid qualities within range", () => {
    expect(sanitizeCompressionQuality(0.7)).toBe(0.7);
    expect(sanitizeCompressionQuality(0.85)).toBe(0.85);
  });
});

describe("getSelectedImageUri", () => {
  it("returns no image when selection is canceled", () => {
    expect(getSelectedImageUri({ canceled: true })).toBeNull();
  });

  it("returns the local URI only after a completed selection", () => {
    expect(
      getSelectedImageUri({
        canceled: false,
        assets: [{ uri: "file:///replacement.jpg" }],
      }),
    ).toBe("file:///replacement.jpg");
  });
});

describe("selectComparisonPhoto", () => {
  it("requests camera permission and launches only the camera with default quality", async () => {
    const picker = createPicker();

    await expect(selectComparisonPhoto("camera", picker)).resolves.toEqual({
      status: "selected",
      uri: "file:///camera.jpg",
    });
    expect(picker.launchCameraAsync).toHaveBeenCalledWith({
      mediaTypes: ["images"],
      quality: 0.8,
    });
    expect(picker.requestMediaLibraryPermissionsAsync).not.toHaveBeenCalled();
    expect(picker.launchImageLibraryAsync).not.toHaveBeenCalled();
  });

  it("requests library permission and launches only the library with default quality", async () => {
    const picker = createPicker();

    await expect(selectComparisonPhoto("library", picker)).resolves.toEqual({
      status: "selected",
      uri: "file:///library.jpg",
    });
    expect(picker.launchImageLibraryAsync).toHaveBeenCalledWith({
      mediaTypes: ["images"],
      quality: 0.8,
    });
    expect(picker.requestCameraPermissionsAsync).not.toHaveBeenCalled();
    expect(picker.launchCameraAsync).not.toHaveBeenCalled();
  });

  it("applies custom compression quality within safe limits", async () => {
    const picker = createPicker();

    await expect(
      selectComparisonPhoto("camera", picker, { quality: 0.65 }),
    ).resolves.toEqual({
      status: "selected",
      uri: "file:///camera.jpg",
    });
    expect(picker.launchCameraAsync).toHaveBeenCalledWith({
      mediaTypes: ["images"],
      quality: 0.65,
    });
  });

  it("clamps excessive quality passed in options", async () => {
    const picker = createPicker();

    await expect(
      selectComparisonPhoto("library", picker, { quality: 1.2 }),
    ).resolves.toEqual({
      status: "selected",
      uri: "file:///library.jpg",
    });
    expect(picker.launchImageLibraryAsync).toHaveBeenCalledWith({
      mediaTypes: ["images"],
      quality: MAX_IMAGE_COMPRESSION_QUALITY,
    });
  });

  it("does not open a picker when permission is denied", async () => {
    const picker = createPicker();
    picker.requestCameraPermissionsAsync.mockResolvedValue({ granted: false });

    await expect(selectComparisonPhoto("camera", picker)).resolves.toEqual({
      status: "permission_denied",
    });
    expect(picker.launchCameraAsync).not.toHaveBeenCalled();
  });

  it("reports cancellation without selecting a URI", async () => {
    const picker = createPicker();
    picker.launchImageLibraryAsync.mockResolvedValue({
      canceled: true as const,
      assets: [],
    });

    await expect(selectComparisonPhoto("library", picker)).resolves.toEqual({
      status: "canceled",
    });
  });

  it("propagates picker exceptions for the screen to handle", async () => {
    const picker = createPicker();
    picker.launchCameraAsync.mockRejectedValue(new Error("picker unavailable"));

    await expect(selectComparisonPhoto("camera", picker)).rejects.toThrow(
      "picker unavailable",
    );
  });
});
