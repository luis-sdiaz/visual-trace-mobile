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

    return jsonResponse(501, "analysis_not_configured", "El análisis aún no está configurado.", {
      comparisonId: comparison.id,
    });
  };
}
