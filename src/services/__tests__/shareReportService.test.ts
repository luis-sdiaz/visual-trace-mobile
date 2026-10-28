import * as Sharing from "expo-sharing";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  isShareAvailable,
  sharePdfReport,
  ShareReportError,
} from "../shareReportService";

describe("shareReportService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("checks platform availability and returns boolean status correctly", async () => {
    vi.spyOn(Sharing, "isAvailableAsync").mockResolvedValueOnce(true);
    const available = await isShareAvailable();
    expect(available).toBe(true);

    vi.spyOn(Sharing, "isAvailableAsync").mockResolvedValueOnce(false);
    const unavailable = await isShareAvailable();
    expect(unavailable).toBe(false);

    vi.spyOn(Sharing, "isAvailableAsync").mockRejectedValueOnce(new Error("Platform error"));
    const errorFallback = await isShareAvailable();
    expect(errorFallback).toBe(false);
  });

  it("triggers native share sheet with default options when sharing is available", async () => {
    vi.spyOn(Sharing, "isAvailableAsync").mockResolvedValueOnce(true);
    const shareSpy = vi.spyOn(Sharing, "shareAsync").mockResolvedValueOnce(undefined);

    const success = await sharePdfReport("file:///mock/report.pdf");

    expect(success).toBe(true);
    expect(shareSpy).toHaveBeenCalledWith("file:///mock/report.pdf", {
      dialogTitle: "Compartir Reporte VisualTrace",
      mimeType: "application/pdf",
      UTI: "com.adobe.pdf",
    });
  });

  it("triggers native share sheet with custom options when provided", async () => {
    vi.spyOn(Sharing, "isAvailableAsync").mockResolvedValueOnce(true);
    const shareSpy = vi.spyOn(Sharing, "shareAsync").mockResolvedValueOnce(undefined);

    const success = await sharePdfReport("file:///mock/custom.pdf", {
      dialogTitle: "Enviar Auditoría a Supervisor",
      mimeType: "application/pdf",
      UTI: "public.composite-content",
    });

    expect(success).toBe(true);
    expect(shareSpy).toHaveBeenCalledWith("file:///mock/custom.pdf", {
      dialogTitle: "Enviar Auditoría a Supervisor",
      mimeType: "application/pdf",
      UTI: "public.composite-content",
    });
  });

  it("returns false gracefully without calling shareAsync when sharing is unavailable on platform", async () => {
    vi.spyOn(Sharing, "isAvailableAsync").mockResolvedValueOnce(false);
    const shareSpy = vi.spyOn(Sharing, "shareAsync");

    const success = await sharePdfReport("file:///mock/report.pdf");

    expect(success).toBe(false);
    expect(shareSpy).not.toHaveBeenCalled();
  });

  it("throws ShareReportError when fileUri is empty or invalid", async () => {
    await expect(sharePdfReport("")).rejects.toThrow(ShareReportError);
    await expect(sharePdfReport("   ")).rejects.toThrow(
      "La ruta del archivo es obligatoria para compartir el reporte.",
    );
    // @ts-expect-error Testing null input
    await expect(sharePdfReport(null)).rejects.toThrow(ShareReportError);
  });

  it("wraps and throws ShareReportError when Sharing.shareAsync throws", async () => {
    vi.spyOn(Sharing, "isAvailableAsync").mockResolvedValueOnce(true);
    vi.spyOn(Sharing, "shareAsync").mockRejectedValueOnce(new Error("Activity cancelled or denied"));

    await expect(sharePdfReport("file:///mock/report.pdf")).rejects.toThrow(ShareReportError);
  });
});

