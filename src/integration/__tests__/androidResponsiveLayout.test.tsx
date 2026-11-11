import React from "react";
// @ts-expect-error react-dom/server type declarations are not in devDependencies
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.hoisted(() => ({
  isLoading: false,
  signOut: vi.fn(),
  user: null as null | { id: string; user_metadata: Record<string, unknown> },
}));

vi.mock("expo-localization", () => ({
  getLocales: () => [{ languageCode: "es" }],
}));

vi.mock("expo-image-picker", () => ({}));

vi.mock("expo-router", () => ({
  router: {
    back: vi.fn(),
    push: vi.fn(),
    replace: vi.fn(),
  },
  useRouter: () => ({
    back: vi.fn(),
    push: vi.fn(),
    replace: vi.fn(),
  }),
  useFocusEffect: vi.fn(),
  Stack: {
    Screen: () => null,
  },
}));

vi.mock("@expo/vector-icons", () => ({
  Ionicons: () => null,
}));

vi.mock("react-native-safe-area-context", () => ({
  SafeAreaView: ({ children, style }: { children: React.ReactNode; style?: unknown }) =>
    React.createElement("div", { style }, children),
  useSafeAreaInsets: () => ({ top: 40, bottom: 20, left: 0, right: 0 }),
}));

vi.mock("@/context/AuthContext", () => ({
  useAuth: () => authMock,
}));

vi.mock("@/context/ComparisonContext", () => ({
  useComparison: () => ({
    comparisonId: null,
    initialImageIsDirty: false,
    initialImagePath: null,
    initialImageUri: null,
    name: "",
    markInitialImageSaved: vi.fn(),
    restoreSavedImage: vi.fn(),
    setComparisonId: vi.fn(),
    setInitialImageUri: vi.fn(),
    setName: vi.fn(),
  }),
}));

vi.mock("@/services/comparisonService", () => ({
  createComparisonDraft: vi.fn(),
  fetchComparisonPage: vi.fn(),
  isComparisonComplete: vi.fn(() => false),
  mergeComparisonPages: vi.fn(),
  updateComparisonName: vi.fn(),
}));

vi.mock("@/services/comparisonRecoveryService", () => ({
  recoverComparison: vi.fn(),
}));

vi.mock("@/services/comparisonImageLifecycleService", () => ({
  getComparisonImageSaveErrorMessage: vi.fn(() => "image error"),
  restoreSavedComparisonImage: vi.fn(),
  saveComparisonImage: vi.fn(),
  shouldUploadComparisonImage: vi.fn(() => false),
}));

vi.mock("@/utils/imageSelection", () => ({
  selectComparisonPhoto: vi.fn(),
}));

vi.mock("@/components/comparison/ImagePickerModal", () => ({
  ImagePickerModal: ({ visible }: { visible: boolean }) =>
    visible ? React.createElement("div", { "data-testid": "initial-image-picker-modal" }) : null,
}));

vi.mock("@/components/ui/PhotoPreviewModal", () => ({
  PhotoPreviewModal: () => null,
}));

vi.mock("@/components/ui/HeroVisualAnimation", () => ({
  HeroVisualAnimation: () => React.createElement("div", { "data-testid": "hero-animation" }),
}));

vi.mock("@/components/ui/ThemeToggle", () => ({
  ThemeToggle: () => React.createElement("div", { "data-testid": "theme-toggle" }),
}));

vi.mock("@/components/ui/LanguageToggle", () => ({
  LanguageToggle: () => React.createElement("div", { "data-testid": "language-toggle" }),
}));

import { Button } from "@/components/ui/Button";
import { ComparisonPreview } from "@/components/ui/ComparisonPreview";
import WelcomeScreen from "@/app/index";
import HomeScreen from "@/app/home";
import InitialStateScreen from "@/app/initial-state";
import NewComparisonScreen from "@/app/new-comparison";
import SettingsScreen from "@/app/settings";
import { ThemeProvider } from "@/context/ThemeContext";
import i18n from "@/i18n";

describe("Android Compatibility and Responsive Layout Safeguards", () => {
  beforeEach(() => {
    authMock.user = null;
  });

  describe("Home text integrity", () => {
    it("renders complete top-bar, filter and sorting labels in Spanish", async () => {
      await i18n.changeLanguage("es");
      authMock.user = { id: "user-1", user_metadata: {} };

      const html = renderToStaticMarkup(
        <ThemeProvider>
          <HomeScreen />
        </ThemeProvider>,
      );

      for (const label of [
        "VisualTrace",
        "Salir",
        "Tus comparaciones",
        "Historial de comparaciones",
        "Todas",
        "En curso",
        "Listas",
        "Analizadas",
        "Más recientes",
        "Más antiguas",
      ]) {
        expect(html).toContain(label);
      }
    });
  });

  describe("Button Component Text Integrity", () => {
    it("renders full labels without horizontal clipping on critical actions", () => {
      const labels = [
        "Continuar",
        "Elegir de la galería",
        "Tomar foto",
        "Cerrar sesión",
        "Iniciar sesión",
      ];

      for (const label of labels) {
        const html = renderToStaticMarkup(
          <ThemeProvider>
            <Button label={label} onPress={vi.fn()} />
          </ThemeProvider>,
        );
        expect(html).toContain(label);
      }
    });
  });

  describe("Settings screen Android stability", () => {
    it("renders as a dedicated route with inline language and theme controls", () => {
      const html = renderToStaticMarkup(
        <ThemeProvider>
          <SettingsScreen />
        </ThemeProvider>,
      );

      expect(html).toContain('data-testid="settings-preferences"');
      expect(html).toContain('data-testid="settings-back-button"');
      expect(html).toContain('data-testid="settings-language-es"');
      expect(html).toContain('data-testid="settings-language-en"');
      expect(html).toContain('data-testid="settings-theme-light"');
      expect(html).toContain('data-testid="settings-theme-dark"');
      expect(html).toContain('aria-label="Español"');
      expect(html).toContain('aria-label="Inglés"');
      expect(html).not.toContain('role="dialog"');
    });

    it("renders complete settings labels in English", async () => {
      await i18n.changeLanguage("en");
      const html = renderToStaticMarkup(
        <ThemeProvider>
          <SettingsScreen />
        </ThemeProvider>,
      );

      expect(html).toContain("Settings");
      expect(html).toContain("Back to your comparisons");
      expect(html).toContain('aria-label="Spanish"');
      expect(html).toContain('aria-label="English"');
      expect(html).toContain("Light mode");
      expect(html).toContain("Dark mode");

      await i18n.changeLanguage("es");
    });
  });

  describe("WelcomeScreen Layout and Android Header Alignment", () => {
    it("renders full brand title, responsive intro and top margin spacing", () => {
      const html = renderToStaticMarkup(
        <ThemeProvider>
          <WelcomeScreen />
        </ThemeProvider>,
      );

      // Verify the brand title 'VisualTrace' is rendered intact
      expect(html).toContain("VisualTrace");

      // Verify welcome title 'Detecta lo que cambió' is rendered
      expect(html).toContain("Detecta lo que cambió");

      // Verify navigation actions
      expect(html).toContain("data-testid=\"hero-animation\"");
      expect(html).toContain("data-testid=\"language-toggle\"");
      expect(html).toContain("data-testid=\"theme-toggle\"");
    });

    it("renders the complete brand and welcome actions in Spanish and English", async () => {
      for (const [language, login, register] of [
        ["es", "Iniciar sesión", "Crear cuenta"],
        ["en", "Sign in", "Create account"],
      ] as const) {
        await i18n.changeLanguage(language);

        const html = renderToStaticMarkup(
          <ThemeProvider>
            <WelcomeScreen />
          </ThemeProvider>,
        );

        expect(html).toContain("VisualTrace");
        expect(html).toContain(login);
        expect(html).toContain(register);
      }
    });
  });

  describe("New comparison labels", () => {
    it("renders complete step metadata and recommendation numbers in both languages", async () => {
      for (const [language, expectedStep, expectedInfo] of [
        ["es", "PASO 1 DE 3", "Información"],
        ["en", "STEP 1 OF 3", "Basic information"],
      ] as const) {
        await i18n.changeLanguage(language);

        const html = renderToStaticMarkup(
          <ThemeProvider>
            <NewComparisonScreen />
          </ThemeProvider>,
        );

        expect(html).toContain(expectedStep);
        expect(html).toContain(expectedInfo);
        expect(html).toContain("01");
        expect(html).toContain("02");
      }
    });
  });

  describe("Initial-state photo entry", () => {
    it("renders complete labels and an accessible photo-picker trigger", async () => {
      for (const [language, back, step, addPhoto, camera, gallery, continueLabel] of [
        [
          "es",
          "Volver",
          "PASO 2 DE 3",
          "Agrega una fotografía",
          "Tomar fotografía",
          "Elegir de la galería",
          "Continuar",
        ],
        [
          "en",
          "Back",
          "STEP 2 OF 3",
          "Add a photo",
          "Take photo",
          "Choose from gallery",
          "Continue",
        ],
      ] as const) {
        await i18n.changeLanguage(language);

        const html = renderToStaticMarkup(
          <ThemeProvider>
            <InitialStateScreen />
          </ThemeProvider>,
        );

        expect(html).toContain(back);
        expect(html).toContain(step);
        expect(html).toContain(addPhoto);
        expect(html).toContain(camera);
        expect(html).toContain(gallery);
        expect(html).toContain(continueLabel);
        expect(html).toContain('data-testid="initial-photo-picker-trigger"');
        expect(html).toContain('aria-disabled="true"');
      }
    });
  });

  describe("ComparisonPreview card labels", () => {
    it("renders complete atomic labels for state badges and photo markers", () => {
      const html = renderToStaticMarkup(
        <ThemeProvider>
          <ComparisonPreview />
        </ThemeProvider>,
      );

      expect(html).toContain("Inicial");
      expect(html).toContain("Final");
      expect(html).toContain("Antes");
      expect(html).toContain("Después");
    });
  });
});
