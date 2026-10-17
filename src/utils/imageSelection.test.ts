import { describe, expect, it, vi } from "vitest";

import {
  getSelectedImageUri,
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
  it("requests camera permission and launches only the camera", async () => {
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

  it("requests library permission and launches only the library", async () => {
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
