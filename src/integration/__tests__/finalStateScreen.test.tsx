import React, { type ReactElement, type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const hookState = vi.hoisted(() => ({
  cursor: 0,
  values: [] as unknown[],
}));
const routerMock = vi.hoisted(() => ({
  push: vi.fn(),
  replace: vi.fn(),
}));
const comparisonMock = vi.hoisted(() => ({
  comparisonId: "comparison-1" as string | null,
  initialImageUri: "file:///initial.jpg" as string | null,
  finalImageUri: null as string | null,
  finalImagePath: null as string | null,
  finalImageIsDirty: false,
  markFinalImageSaved: vi.fn(),
  restoreSavedImage: vi.fn(),
  setFinalImageUri: vi.fn((uri: string | null) => {
    comparisonMock.finalImageUri = uri;
  }),
  setInitialImageUri: vi.fn(),
}));
const selectComparisonPhotoMock = vi.hoisted(() => vi.fn());
const shouldUploadComparisonImageMock = vi.hoisted(() => vi.fn(() => false));
const markComparisonReadyMock = vi.hoisted(() => vi.fn());

vi.mock("react", async (importOriginal) => {
  const actual = (await importOriginal()) as object;

  return {
    ...actual,
    useMemo: (factory: () => unknown) => factory(),
    useRef: (initialValue: unknown) => ({ current: initialValue }),
    useState: (initialValue: unknown) => {
      const index = hookState.cursor++;
      if (hookState.values.length <= index) {
        hookState.values[index] = initialValue;
      }

      const setValue = (
        nextValue: unknown | ((previous: unknown) => unknown),
      ) => {
        const previous = hookState.values[index];
        hookState.values[index] =
          typeof nextValue === "function"
            ? nextValue(previous)
            : nextValue;
      };

      return [hookState.values[index], setValue] as const;
    },
  };
});
vi.mock("expo-image-picker", () => ({}));
vi.mock("expo-router", () => ({ router: routerMock }));
vi.mock("react-native-safe-area-context", () => ({
  SafeAreaView: "safe-area-view",
}));
vi.mock("@/components/comparison/ImagePickerModal", () => ({
  ImagePickerModal: "image-picker-modal",
}));
vi.mock("@/components/dev/devTextMeasurement", () => ({
  getDevTextMeasurementProps: vi.fn(() => ({})),
}));
vi.mock("@/components/ui/Button", () => ({ Button: "app-button" }));
vi.mock("@/components/ui/LayoutText", () => ({
  LayoutText: "layout-text",
}));
vi.mock("@/components/ui/PhotoPreviewModal", () => ({
  PhotoPreviewModal: "photo-preview-modal",
}));
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) =>
      ({
        "flow.addFinalPhoto": "Agrega la fotografía final",
        "flow.back": "Volver",
        "flow.compareStates": "Comparar estados",
        "flow.finalTitle": "Estado final",
        "flow.step3": "PASO 3 DE 3",
      })[key] ?? key,
  }),
}));
vi.mock("@/context/ComparisonContext", () => ({
  useComparison: () => comparisonMock,
}));
vi.mock("@/context/ThemeContext", () => ({
  useTheme: () => ({
    colors: {
      background: "#fff",
      border: "#ddd",
      borderStrong: "#bbb",
      danger: "#f00",
      primary: "#00f",
      primarySoft: "#eef",
      surface: "#fff",
      textPrimary: "#111",
      textSecondary: "#555",
    },
  }),
}));
vi.mock("@/services/comparisonImageLifecycleService", () => ({
  getComparisonImageSaveErrorMessage: vi.fn(() => "image error"),
  restoreSavedComparisonImage: vi.fn(),
  saveComparisonImage: vi.fn(),
  shouldUploadComparisonImage: shouldUploadComparisonImageMock,
}));
vi.mock("@/services/comparisonService", () => ({
  markComparisonReady: markComparisonReadyMock,
}));
vi.mock("@/utils/imageSelection", () => ({
  selectComparisonPhoto: selectComparisonPhotoMock,
}));

import FinalStateScreen from "@/app/final-state";

type ElementProps = Record<string, unknown> & { children?: ReactNode };

function renderScreenTree() {
  hookState.cursor = 0;
  return FinalStateScreen();
}

function findElement(
  node: ReactNode,
  predicate: (element: ReactElement<ElementProps>) => boolean,
): ReactElement<ElementProps> {
  if (React.isValidElement<ElementProps>(node)) {
    if (predicate(node)) return node;

    for (const child of React.Children.toArray(node.props.children)) {
      try {
        return findElement(child, predicate);
      } catch {
        // Continue searching the remaining siblings.
      }
    }
  }

  throw new Error("Element not found");
}

function findByTestId(tree: ReactNode, testID: string) {
  return findElement(tree, (element) => element.props.testID === testID);
}

function findActionButton(tree: ReactNode) {
  return findElement(
    tree,
    (element) => element.props.label === "Comparar estados",
  );
}

function callElementProp(
  element: ReactElement<ElementProps>,
  propName: string,
  ...args: unknown[]
) {
  const callback = element.props[propName];
  expect(callback).toBeTypeOf("function");
  return (callback as (...callbackArgs: unknown[]) => unknown)(...args);
}

function collectText(node: ReactNode): string[] {
  if (typeof node === "string") return [node];
  if (!React.isValidElement<ElementProps>(node)) return [];
  return React.Children.toArray(node.props.children).flatMap(collectText);
}

describe("FinalStateScreen photo flow", () => {
  beforeEach(() => {
    hookState.cursor = 0;
    hookState.values = [];
    comparisonMock.comparisonId = "comparison-1";
    comparisonMock.initialImageUri = "file:///initial.jpg";
    comparisonMock.finalImageUri = null;
    comparisonMock.finalImagePath = null;
    comparisonMock.finalImageIsDirty = false;
    comparisonMock.markFinalImageSaved.mockReset();
    comparisonMock.restoreSavedImage.mockReset();
    comparisonMock.setFinalImageUri.mockClear();
    comparisonMock.setInitialImageUri.mockReset();
    routerMock.push.mockReset();
    routerMock.replace.mockReset();
    selectComparisonPhotoMock.mockReset();
    shouldUploadComparisonImageMock.mockReset();
    shouldUploadComparisonImageMock.mockReturnValue(false);
    markComparisonReadyMock.mockReset();
    markComparisonReadyMock.mockResolvedValue(undefined);
  });

  it("keeps the complete navigation and step labels and returns without clearing images", () => {
    const tree = renderScreenTree();

    expect(collectText(tree)).toEqual(
      expect.arrayContaining(["Volver", "PASO 3 DE 3"]),
    );
    callElementProp(findByTestId(tree, "final-back-button"), "onPress");

    expect(routerMock.replace).toHaveBeenCalledWith("/initial-state");
    expect(comparisonMock.setFinalImageUri).not.toHaveBeenCalled();
    expect(comparisonMock.setInitialImageUri).not.toHaveBeenCalled();
  });

  it("opens and cancels the existing picker modal without changing either image", () => {
    let tree = renderScreenTree();
    expect(findByTestId(tree, "final-image-picker-modal").props.visible).toBe(
      false,
    );

    callElementProp(
      findByTestId(tree, "final-photo-picker-trigger"),
      "onPress",
    );
    tree = renderScreenTree();
    const modal = findByTestId(tree, "final-image-picker-modal");
    expect(modal.props.visible).toBe(true);

    callElementProp(modal, "onClose");
    tree = renderScreenTree();
    expect(findByTestId(tree, "final-image-picker-modal").props.visible).toBe(
      false,
    );
    expect(comparisonMock.setFinalImageUri).not.toHaveBeenCalled();
    expect(comparisonMock.setInitialImageUri).not.toHaveBeenCalled();
  });

  it.each([
    ["camera", "camera"],
    ["gallery", "library"],
  ] as const)(
    "maps the modal %s option to the %s photo source",
    async (modalSource, selectionSource) => {
      selectComparisonPhotoMock.mockResolvedValue({ status: "canceled" });
      const modal = findByTestId(
        renderScreenTree(),
        "final-image-picker-modal",
      );

      callElementProp(modal, "onSelectSource", modalSource);

      await vi.waitFor(() => {
        expect(selectComparisonPhotoMock).toHaveBeenCalledWith(
          selectionSource,
          expect.anything(),
        );
      });
      expect(comparisonMock.setFinalImageUri).not.toHaveBeenCalled();
    },
  );

  it("stores a selected photo in the final field and updates the preview URI", async () => {
    selectComparisonPhotoMock.mockResolvedValue({
      status: "selected",
      uri: "file:///final.jpg",
    });
    const modal = findByTestId(
      renderScreenTree(),
      "final-image-picker-modal",
    );

    callElementProp(modal, "onSelectSource", "gallery");

    await vi.waitFor(() => {
      expect(comparisonMock.setFinalImageUri).toHaveBeenCalledWith(
        "file:///final.jpg",
      );
    });
    expect(comparisonMock.setInitialImageUri).not.toHaveBeenCalled();

    const preview = findElement(
      renderScreenTree(),
      (element) => element.props.uri === "file:///final.jpg",
    );
    expect(preview.props.visible).toBe(false);
  });

  it("enables comparison only when both required photos exist", () => {
    comparisonMock.initialImageUri = null;
    comparisonMock.finalImageUri = "file:///final.jpg";
    expect(findActionButton(renderScreenTree()).props.disabled).toBe(true);

    comparisonMock.initialImageUri = "file:///initial.jpg";
    expect(findActionButton(renderScreenTree()).props.disabled).toBe(false);
  });

  it("prevents duplicate comparison requests", async () => {
    comparisonMock.finalImageUri = "file:///final.jpg";
    const action = findActionButton(renderScreenTree());

    const firstPress = callElementProp(action, "onPress");
    const secondPress = callElementProp(action, "onPress");
    await Promise.all([firstPress, secondPress]);

    expect(markComparisonReadyMock).toHaveBeenCalledTimes(1);
    expect(routerMock.push).toHaveBeenCalledTimes(1);
    expect(routerMock.push).toHaveBeenCalledWith("/comparison-result");
  });
});
