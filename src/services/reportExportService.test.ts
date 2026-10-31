import { beforeEach, describe, expect, it, vi } from "vitest";
import * as FileSystem from "expo-file-system/legacy";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";

import { GEMINI_ANALYSIS_CONTRACT_VERSION } from "@/contracts/geminiAnalysis";
import type { ExportReportData } from "@/contracts/reportExport";
import {
  checkStorageAndSharingCapabilities,
  generatePdfReport,
  prepareReportExportData,
  resolveImageToBase64,
  sharePdfReport,
} from "./reportExportService";

vi.mock("expo-print", () => ({
  printToFileAsync: vi.fn(),
}));

vi.mock("expo-sharing", () => ({
  isAvailableAsync: vi.fn(),
  shareAsync: vi.fn(),
}));

vi.mock("expo-file-system/legacy", () => ({
  readAsStringAsync: vi.fn(),
  EncodingType: {
    Base64: "base64",
  },
}));

const mockReportData: ExportReportData = {
  metadata: {
    comparisonId: "comp-456",
    comparisonName: "Inspección de Muro",
    createdAt: "2026-10-26T12:00:00Z",
  },
  images: {
    initialImageUri: "file:///data/user/0/cache/initial.jpg",
    finalImageUri: "file:///data/user/0/cache/final.png",
  },
  report: {
    contractVersion: GEMINI_ANALYSIS_CONTRACT_VERSION,
    hasVisibleChanges: true,
    summary: "Se detectó fisura en el muro.",
    differences: [
      {
        category: "modified",
        description: "Fisura visible.",
      },
    ],
    observations: [],
    uncertainties: [],
  },
};

describe("reportExportService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("resolveImageToBase64", () => {
    it("returns null for empty, null, or undefined uri", async () => {
      expect(await resolveImageToBase64(null)).toBeNull();
      expect(await resolveImageToBase64(undefined)).toBeNull();
      expect(await resolveImageToBase64("   ")).toBeNull();
    });

    it("returns data URIs and http(s) URLs as-is", async () => {
      const dataUri = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA";
      expect(await resolveImageToBase64(dataUri)).toBe(dataUri);

      const httpUrl = "https://images.example.com/test.jpg";
      expect(await resolveImageToBase64(httpUrl)).toBe(httpUrl);
    });

    it("reads local file using FileSystem and returns base64 data URI", async () => {
      vi.mocked(FileSystem.readAsStringAsync).mockResolvedValueOnce(
        "BASE64_JPEG_CONTENT",
      );

      const result = await resolveImageToBase64(
        "file:///path/to/test.jpg",
      );
      expect(result).toBe("data:image/jpeg;base64,BASE64_JPEG_CONTENT");
      expect(FileSystem.readAsStringAsync).toHaveBeenCalledWith(
        "file:///path/to/test.jpg",
        { encoding: "base64" },
      );
    });

    it("detects png mime type for .png files", async () => {
      vi.mocked(FileSystem.readAsStringAsync).mockResolvedValueOnce(
        "BASE64_PNG_CONTENT",
      );

      const result = await resolveImageToBase64(
        "file:///path/to/test.png",
      );
      expect(result).toBe("data:image/png;base64,BASE64_PNG_CONTENT");
    });

    it("returns null gracefully if FileSystem throws", async () => {
      vi.mocked(FileSystem.readAsStringAsync).mockRejectedValueOnce(
        new Error("File not found or permission denied"),
      );

      const result = await resolveImageToBase64("file:///missing.jpg");
      expect(result).toBeNull();
    });
  });

  describe("prepareReportExportData", () => {
    it("converts initial and final images to base64", async () => {
      vi.mocked(FileSystem.readAsStringAsync)
        .mockResolvedValueOnce("IMG_INITIAL_B64")
        .mockResolvedValueOnce("IMG_FINAL_B64");

      const prepared = await prepareReportExportData(mockReportData);

      expect(prepared.images?.initialImageBase64).toBe(
        "data:image/jpeg;base64,IMG_INITIAL_B64",
      );
      expect(prepared.images?.finalImageBase64).toBe(
        "data:image/png;base64,IMG_FINAL_B64",
      );
    });

    it("preserves already defined base64 images without reading files", async () => {
      const dataWithBase64: ExportReportData = {
        ...mockReportData,
        images: {
          initialImageBase64: "data:image/jpeg;base64,EXISTING_INIT",
          finalImageBase64: "data:image/jpeg;base64,EXISTING_FINAL",
        },
      };

      const prepared = await prepareReportExportData(dataWithBase64);

      expect(prepared.images?.initialImageBase64).toBe(
        "data:image/jpeg;base64,EXISTING_INIT",
      );
      expect(prepared.images?.finalImageBase64).toBe(
        "data:image/jpeg;base64,EXISTING_FINAL",
      );
      expect(FileSystem.readAsStringAsync).not.toHaveBeenCalled();
    });

    it("returns data unchanged if no images property exists", async () => {
      const dataWithoutImages: ExportReportData = {
        report: mockReportData.report,
      };

      const prepared = await prepareReportExportData(dataWithoutImages);
      expect(prepared.images).toBeUndefined();
    });
  });

  describe("generatePdfReport", () => {
    it("generates a PDF file successfully and returns uri and pages", async () => {
      vi.mocked(Print.printToFileAsync).mockResolvedValueOnce({
        uri: "file:///mock/cache/report.pdf",
        numberOfPages: 2,
      });

      const result = await generatePdfReport(mockReportData, {
        includeImages: false,
      });

      expect(result.success).toBe(true);
      expect(result.uri).toBe("file:///mock/cache/report.pdf");
      expect(result.numberOfPages).toBe(2);
      expect(Print.printToFileAsync).toHaveBeenCalled();
    });

    it("returns error result if data fails contract validation", async () => {
      const invalidData = {
        report: { invalid: true },
      } as unknown as ExportReportData;

      const result = await generatePdfReport(invalidData);
      expect(result.success).toBe(false);
      expect(result.error).toContain("no cumplen con el contrato");
      expect(Print.printToFileAsync).not.toHaveBeenCalled();
    });

    it("returns error result if Print.printToFileAsync rejects", async () => {
      vi.mocked(Print.printToFileAsync).mockRejectedValueOnce(
        new Error("Error de motor de impresión nativo"),
      );

      const result = await generatePdfReport(mockReportData, {
        includeImages: false,
      });
      expect(result.success).toBe(false);
      expect(result.error).toBe("Error de motor de impresión nativo");
    });
  });

  describe("sharePdfReport", () => {
    it("generates PDF and calls Sharing.shareAsync when available", async () => {
      vi.mocked(Print.printToFileAsync).mockResolvedValueOnce({
        uri: "file:///mock/cache/report.pdf",
        numberOfPages: 1,
      });
      vi.mocked(Sharing.isAvailableAsync).mockResolvedValueOnce(true);
      vi.mocked(Sharing.shareAsync).mockResolvedValueOnce();

      const result = await sharePdfReport(mockReportData, {
        includeImages: false,
        filename: "Inspeccion_Muro",
      });

      expect(result.success).toBe(true);
      expect(result.uri).toBe("file:///mock/cache/report.pdf");
      expect(Sharing.shareAsync).toHaveBeenCalledWith(
        "file:///mock/cache/report.pdf",
        expect.objectContaining({
          mimeType: "application/pdf",
          dialogTitle: "Inspeccion_Muro.pdf",
          UTI: "com.adobe.pdf",
        }),
      );
    });

    it("falls back gracefully when sharing is not available on platform", async () => {
      vi.mocked(Print.printToFileAsync).mockResolvedValueOnce({
        uri: "file:///mock/cache/report.pdf",
        numberOfPages: 1,
      });
      vi.mocked(Sharing.isAvailableAsync).mockResolvedValueOnce(false);

      const result = await sharePdfReport(mockReportData, {
        includeImages: false,
      });

      expect(result.success).toBe(true);
      expect(result.uri).toBe("file:///mock/cache/report.pdf");
      expect(Sharing.shareAsync).not.toHaveBeenCalled();
    });

    it("handles user cancellation of sharing dialog without error", async () => {
      vi.mocked(Print.printToFileAsync).mockResolvedValueOnce({
        uri: "file:///mock/cache/report.pdf",
        numberOfPages: 1,
      });
      vi.mocked(Sharing.isAvailableAsync).mockResolvedValueOnce(true);
      vi.mocked(Sharing.shareAsync).mockRejectedValueOnce(
        new Error("User dismissed the share sheet"),
      );

      const result = await sharePdfReport(mockReportData, {
        includeImages: false,
      });

      expect(result.success).toBe(false);
      expect(result.cancelled).toBe(true);
    });

    it("returns error result when sharing fails with unhandled error", async () => {
      vi.mocked(Print.printToFileAsync).mockResolvedValueOnce({
        uri: "file:///mock/cache/report.pdf",
        numberOfPages: 1,
      });
      vi.mocked(Sharing.isAvailableAsync).mockResolvedValueOnce(true);
      vi.mocked(Sharing.shareAsync).mockRejectedValueOnce(
        new Error("Failed to write to external intent"),
      );

      const result = await sharePdfReport(mockReportData, {
        includeImages: false,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Failed to write to external intent");
    });
  });

  describe("checkStorageAndSharingCapabilities", () => {
    it("reports sharing capability and OS platform", async () => {
      vi.mocked(Sharing.isAvailableAsync).mockResolvedValueOnce(true);
      const caps = await checkStorageAndSharingCapabilities();
      expect(caps.canShare).toBe(true);
      expect(typeof caps.platform).toBe("string");
    });

    it("handles exceptions gracefully by returning canShare: false", async () => {
      vi.mocked(Sharing.isAvailableAsync).mockRejectedValueOnce(
        new Error("Capability check failed"),
      );
      const caps = await checkStorageAndSharingCapabilities();
      expect(caps.canShare).toBe(false);
    });
  });
});
