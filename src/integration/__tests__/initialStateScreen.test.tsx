import React from "react";
// @ts-expect-error react-dom/server type declarations are not in devDependencies
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const routerMock = vi.hoisted(() => ({
  push: vi.fn(),
  replace: vi.fn(),
}));
const comparisonMock = vi.hoisted(() => ({
  comparisonId: "comparison-1" as string | null,
  initialImageIsDirty: false,
  initialImagePath: null as string | null,
  initialImageUri: null as string | null,
  markInitialImageSaved: vi.fn(),
  restoreSavedImage: vi.fn(),
  setInitialImageUri: vi.fn(),
}));
const buttonCapture = vi.hoisted(() => ({
  disabled: true,
  onPress: null as null | (() => void | Promise<void>),
}));
const pickerModalCapture = vi.hoisted(() => ({
  onClose: null as null | (() => void),
  onSelectSource: null as null | ((source: "camera" | "gallery") => void),
  visible: false,
}));
const selectComparisonPhotoMock = vi.hoisted(() => vi.fn());
const shouldUploadComparisonImageMock = vi.hoisted(() => vi.fn(() => false));

vi.mock("expo-image-picker", () => ({}));
vi.mock("expo-router", () => ({ router: routerMock }));
vi.mock("react-native-safe-area-context", () => ({
  SafeAreaView: ({ children, style }: { children: React.ReactNode; style?: unknown }) =>
    React.createElement("div", { style }, children),
}));
vi.mock("@/context/ComparisonContext", () => ({
  useComparison: () => comparisonMock,
}));
vi.mock("@/components/ui/Button", () => ({
  Button: ({
    disabled,
    label,
    onPress,
  }: {
    disabled: boolean;
    label: string;
    onPress: () => void | Promise<void>;
  }) => {
    buttonCapture.disabled = disabled;
    buttonCapture.onPress = onPress;
    return React.createElement("button", { disabled }, label);
  },
}));
vi.mock("@/components/comparison/ImagePickerModal", () => ({
  ImagePickerModal: ({
    onClose,
    onSelectSource,
    visible,
  }: {
    onClose: () => void;
    onSelectSource: (source: "camera" | "gallery") => void;
    visible: boolean;
  }) => {
    pickerModalCapture.onClose = onClose;
    pickerModalCapture.onSelectSource = onSelectSource;
    pickerModalCapture.visible = visible;
    return null;
  },
}));
vi.mock("@/components/ui/PhotoPreviewModal", () => ({
  PhotoPreviewModal: () => null,
}));
vi.mock("@/services/comparisonImageLifecycleService", () => ({
  getComparisonImageSaveErrorMessage: vi.fn(() => "image error"),
  restoreSavedComparisonImage: vi.fn(),
  saveComparisonImage: vi.fn(),
  shouldUploadComparisonImage: shouldUploadComparisonImageMock,
}));
vi.mock("@/utils/imageSelection", () => ({
  selectComparisonPhoto: selectComparisonPhotoMock,
}));

import InitialStateScreen from "@/app/initial-state";
import { ThemeProvider } from "@/context/ThemeContext";

function renderScreen() {
  return renderToStaticMarkup(
    <ThemeProvider>
      <InitialStateScreen />
    </ThemeProvider>,
  );
}

describe("InitialStateScreen photo flow", () => {
  beforeEach(() => {
    comparisonMock.comparisonId = "comparison-1";
    comparisonMock.initialImageIsDirty = false;
    comparisonMock.initialImagePath = null;
    comparisonMock.initialImageUri = null;
    comparisonMock.markInitialImageSaved.mockReset();
    comparisonMock.restoreSavedImage.mockReset();
    comparisonMock.setInitialImageUri.mockReset();
    routerMock.push.mockReset();
    routerMock.replace.mockReset();
    selectComparisonPhotoMock.mockReset();
    shouldUploadComparisonImageMock.mockReset();
    shouldUploadComparisonImageMock.mockReturnValue(false);
    buttonCapture.disabled = true;
    buttonCapture.onPress = null;
    pickerModalCapture.onClose = null;
    pickerModalCapture.onSelectSource = null;
    pickerModalCapture.visible = false;
  });

  it("keeps Continue disabled until a valid image URI exists", () => {
    renderScreen();
    expect(buttonCapture.disabled).toBe(true);

    comparisonMock.initialImageUri = "file:///initial.jpg";
    renderScreen();
    expect(buttonCapture.disabled).toBe(false);
  });

  it("continues to final state when an existing valid photo needs no upload", async () => {
    comparisonMock.initialImageUri = "file:///initial.jpg";
    comparisonMock.initialImagePath = "user/comparison/initial.jpg";
    renderScreen();

    await buttonCapture.onPress?.();

    expect(shouldUploadComparisonImageMock).toHaveBeenCalledWith(
      "user/comparison/initial.jpg",
      false,
    );
    expect(routerMock.push).toHaveBeenCalledWith("/final-state");
  });

  it("reuses the library action and preserves state when selection is canceled", async () => {
    selectComparisonPhotoMock.mockResolvedValue({ status: "canceled" });
    renderScreen();

    pickerModalCapture.onSelectSource?.("gallery");
    await vi.waitFor(() => {
      expect(selectComparisonPhotoMock).toHaveBeenCalledWith(
        "library",
        expect.anything(),
      );
    });

    expect(comparisonMock.setInitialImageUri).not.toHaveBeenCalled();
  });

  it("reuses the camera action and stores the selected local URI", async () => {
    selectComparisonPhotoMock.mockResolvedValue({
      status: "selected",
      uri: "file:///camera.jpg",
    });
    renderScreen();

    pickerModalCapture.onSelectSource?.("camera");
    await vi.waitFor(() => {
      expect(comparisonMock.setInitialImageUri).toHaveBeenCalledWith(
        "file:///camera.jpg",
      );
    });
  });
});
