export type AuthorizedUser = { id: string };

export type AuthorizedComparison = {
  id: string;
  user_id: string;
  initial_image_path: string | null;
  final_image_path: string | null;
};

export type AnalyzeDependencies = {
  authenticate: (authorization: string) => Promise<AuthorizedUser | null>;
  findComparison: (
    comparisonId: string,
    userId: string,
    authorization: string,
  ) => Promise<AuthorizedComparison | null>;
  loadImages: (
    comparison: AuthorizedComparison,
    authorization: string,
  ) => Promise<{ initial: unknown; final: unknown }>;
  analyzeImages: (images: { initial: unknown; final: unknown }) => Promise<{
    model: string;
    report: { contractVersion: string } & Record<string, unknown>;
  }>;
  persistReport: (input: {
    comparison: AuthorizedComparison;
    analysis: { model: string; report: { contractVersion: string } & Record<string, unknown> };
  }) => Promise<unknown>;
  reserveUsage: (comparison: AuthorizedComparison) => Promise<
    | { action: "reserved"; attemptId: string }
    | { action: "cached"; report: unknown }
    | { action: "limited"; scope: string }
    | { action: "in_progress"; attemptId: string }
  >;
  completeUsage: (
    attemptId: string,
    status: "succeeded" | "failed_uncertain",
  ) => Promise<void>;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const JSON_HEADERS = {
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Origin": "*",
  "Content-Type": "application/json",
};

function jsonResponse(
  status: number,
  code: string,
  message: string,
  extra: Record<string, unknown> = {},
): Response {
  return new Response(JSON.stringify({ code, message, ...extra }), {
    status,
    headers: JSON_HEADERS,
  });
}

export function createAnalyzeComparisonHandler(dependencies: AnalyzeDependencies) {
  return async function handleAnalyzeComparison(request: Request): Promise<Response> {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: JSON_HEADERS });
    }

    if (request.method !== "POST") {
      return jsonResponse(405, "method_not_allowed", "Solo se admite POST.");
    }

    const authorization = request.headers.get("Authorization")?.trim();

    if (!authorization?.startsWith("Bearer ")) {
      return jsonResponse(401, "unauthorized", "Se requiere una sesión válida.");
    }

    let user: AuthorizedUser | null;

    try {
      user = await dependencies.authenticate(authorization);
    } catch {
      return jsonResponse(401, "unauthorized", "La sesión no es válida.");
    }

    if (!user) {
      return jsonResponse(401, "unauthorized", "La sesión no es válida.");
    }

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return jsonResponse(400, "invalid_request", "El cuerpo debe ser JSON válido.");
    }

    const comparisonId =
      typeof body === "object" && body !== null && "comparisonId" in body
        ? (body as { comparisonId?: unknown }).comparisonId
        : undefined;

    if (typeof comparisonId !== "string" || !UUID_PATTERN.test(comparisonId)) {
      return jsonResponse(400, "invalid_comparison_id", "comparisonId no es válido.");
    }

    let comparison: AuthorizedComparison | null;

    try {
      comparison = await dependencies.findComparison(
        comparisonId,
        user.id,
        authorization,
      );
    } catch {
      return jsonResponse(
        500,
        "comparison_lookup_failed",
        "No fue posible comprobar la comparación.",
      );
    }

    if (!comparison || comparison.user_id !== user.id) {
      return jsonResponse(
        404,
        "comparison_not_found",
        "La comparación no existe o no está disponible.",
      );
    }

    if (!comparison.initial_image_path || !comparison.final_image_path) {
      return jsonResponse(
        409,
        "comparison_incomplete",
        "La comparación necesita las dos fotografías.",
      );
    }

    let images: { initial: unknown; final: unknown };
    try {
      images = await dependencies.loadImages(comparison, authorization);
    } catch (error) {
      const code =
        typeof error === "object" && error !== null && "code" in error
          ? String(error.code)
          : "image_load_failed";
      const status = code === "image_not_found" ? 404 : code === "image_too_large" ? 413 : 422;
      return jsonResponse(status, code, "No fue posible preparar las fotografías para el análisis.");
    }

    let reservation: Awaited<ReturnType<AnalyzeDependencies["reserveUsage"]>>;
    try {
      reservation = await dependencies.reserveUsage(comparison);
    } catch {
      return jsonResponse(503, "usage_limits_unavailable", "El control de uso no está disponible.");
    }

    if (reservation.action === "cached") {
      return new Response(JSON.stringify(reservation.report), { status: 200, headers: JSON_HEADERS });
    }
    if (reservation.action === "limited") {
      return jsonResponse(429, "usage_limit_reached", "Se alcanzó el límite de análisis.", {
        scope: reservation.scope,
      });
    }
    if (reservation.action === "in_progress") {
      return jsonResponse(409, "analysis_in_progress", "Este análisis ya está en curso.");
    }

    const attemptId = reservation.attemptId;

    let analysis: Awaited<ReturnType<AnalyzeDependencies["analyzeImages"]>>;
    try {
      analysis = await dependencies.analyzeImages(images);
    } catch (error) {
      await dependencies.completeUsage(attemptId, "failed_uncertain").catch(() => undefined);
      const code =
        typeof error === "object" && error !== null && "code" in error
          ? String(error.code)
          : "gemini_network_error";
      const status = code === "provider_quota_exceeded" ? 429 : code === "gemini_timeout" ? 504 : 502;
      return jsonResponse(status, code, "No fue posible completar el análisis visual.");
    }

    try {
      const persisted = await dependencies.persistReport({ comparison, analysis });
      await dependencies.completeUsage(attemptId, "succeeded");
      return new Response(JSON.stringify(persisted), { status: 200, headers: JSON_HEADERS });
    } catch (error) {
      await dependencies.completeUsage(attemptId, "failed_uncertain").catch(() => undefined);
      const message = error instanceof Error ? error.message : "";
      const stale = message.includes("comparison_images_changed");
      return jsonResponse(
        stale ? 409 : 500,
        stale ? "analysis_stale" : "analysis_persistence_failed",
        stale
          ? "Las fotografías cambiaron durante el análisis."
          : "El informe no pudo guardarse.",
      );
    }
  };
}
