import { beforeEach, describe, expect, it, vi } from "vitest";

const supabaseMock = vi.hoisted(() => ({
  from: vi.fn(),
  getUser: vi.fn(),
}));

vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      getUser: supabaseMock.getUser,
    },
    from: supabaseMock.from,
  },
}));

import {
  ComparisonNotFoundError,
  fetchComparisonById,
  fetchComparisonPage,
  fetchRecentComparisons,
  markComparisonReady,
  mergeComparisonPages,
  type ComparisonRecord,
  updateComparisonImagePath,
} from "@/services/comparisonService";

type QueryResult = {
  data: unknown;
  error: unknown;
};

function createQuery(result: QueryResult) {
  const query = {
    eq: vi.fn(),
    is: vi.fn(),
    limit: vi.fn(),
    maybeSingle: vi.fn().mockResolvedValue(result),
    not: vi.fn(),
    order: vi.fn(),
    or: vi.fn(),
    select: vi.fn(),
    then: (
      resolve: (value: QueryResult) => unknown,
      reject: (reason: unknown) => unknown,
    ) => Promise.resolve(result).then(resolve, reject),
    update: vi.fn(),
  };

  query.eq.mockReturnValue(query);
  query.is.mockReturnValue(query);
  query.limit.mockReturnValue(query);
  query.not.mockReturnValue(query);
  query.order.mockReturnValue(query);
  query.or.mockReturnValue(query);
  query.select.mockReturnValue(query);
  query.update.mockReturnValue(query);

  return query;
}

function createComparison(
  overrides: Partial<ComparisonRecord> = {},
): ComparisonRecord {
  return {
    id: "comparison-1",
    user_id: "user-1",
    name: "Sala",
    initial_image_path: "user-1/comparison-1/initial.jpg",
    final_image_path: "user-1/comparison-1/final.jpg",
    status: "draft",
    created_at: "2026-10-13T12:00:00.000Z",
    updated_at: "2026-10-13T12:00:00.000Z",
    ...overrides,
  };
}

describe("comparisonService", () => {
  beforeEach(() => {
    supabaseMock.getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });
  });

  it("marks an owned draft as ready only when both image paths exist", async () => {
    const draft = createComparison();
    const ready = createComparison({ status: "ready" });
    const readQuery = createQuery({ data: draft, error: null });
    const updateQuery = createQuery({ data: ready, error: null });

    supabaseMock.from
      .mockReturnValueOnce(readQuery)
      .mockReturnValueOnce(updateQuery);

    await expect(markComparisonReady(draft.id)).resolves.toEqual(ready);

    expect(updateQuery.update).toHaveBeenCalledWith({ status: "ready" });
    expect(updateQuery.eq).toHaveBeenCalledWith("user_id", "user-1");
    expect(updateQuery.eq).toHaveBeenCalledWith("status", "draft");
    expect(updateQuery.not).toHaveBeenCalledWith(
      "initial_image_path",
      "is",
      null,
    );
    expect(updateQuery.not).toHaveBeenCalledWith(
      "final_image_path",
      "is",
      null,
    );
  });

  it("rejects an incomplete comparison without issuing an update", async () => {
    const readQuery = createQuery({
      data: createComparison({ final_image_path: null }),
      error: null,
    });

    supabaseMock.from.mockReturnValueOnce(readQuery);

    await expect(markComparisonReady("comparison-1")).rejects.toThrow(
      "Both comparison images are required.",
    );
    expect(supabaseMock.from).toHaveBeenCalledTimes(1);
  });

  it("leaves analyzed comparisons unchanged", async () => {
    const analyzed = createComparison({ status: "analyzed" });
    const readQuery = createQuery({ data: analyzed, error: null });

    supabaseMock.from.mockReturnValueOnce(readQuery);

    await expect(markComparisonReady(analyzed.id)).resolves.toEqual(analyzed);
    expect(supabaseMock.from).toHaveBeenCalledTimes(1);
  });

  it("fetches recent comparisons for only the authenticated user", async () => {
    const records = [createComparison()];
    const query = createQuery({ data: records, error: null });

    supabaseMock.from.mockReturnValueOnce(query);

    await expect(fetchRecentComparisons(5)).resolves.toEqual(records);
    expect(query.eq).toHaveBeenCalledWith("user_id", "user-1");
    expect(query.order).toHaveBeenCalledWith("created_at", {
      ascending: false,
    });
    expect(query.limit).toHaveBeenCalledWith(5);
  });

  it("returns an empty recent list and propagates query errors", async () => {
    const emptyQuery = createQuery({ data: [], error: null });
    const queryError = new Error("network unavailable");
    const failedQuery = createQuery({ data: null, error: queryError });

    supabaseMock.from
      .mockReturnValueOnce(emptyQuery)
      .mockReturnValueOnce(failedQuery);

    await expect(fetchRecentComparisons()).resolves.toEqual([]);
    await expect(fetchRecentComparisons()).rejects.toBe(queryError);
  });

  it("paginates with a deterministic owned cursor and one-row lookahead", async () => {
    const first = createComparison({ id: "comparison-3" });
    const second = createComparison({ id: "comparison-2" });
    const lookahead = createComparison({ id: "comparison-1" });
    const query = createQuery({ data: [first, second, lookahead], error: null });
    supabaseMock.from.mockReturnValueOnce(query);

    await expect(fetchComparisonPage({ limit: 2 })).resolves.toEqual({
      comparisons: [first, second],
      hasMore: true,
      nextCursor: { createdAt: second.created_at, id: second.id },
    });
    expect(query.eq).toHaveBeenCalledWith("user_id", "user-1");
    expect(query.order).toHaveBeenNthCalledWith(1, "created_at", {
      ascending: false,
    });
    expect(query.order).toHaveBeenNthCalledWith(2, "id", { ascending: false });
    expect(query.limit).toHaveBeenCalledWith(3);
  });

  it("applies both cursor fields and reports the final page", async () => {
    const record = createComparison({ id: "comparison-1" });
    const query = createQuery({ data: [record], error: null });
    supabaseMock.from.mockReturnValueOnce(query);
    const cursor = {
      createdAt: "2026-10-14T12:00:00.000Z",
      id: "comparison-2",
    };

    await expect(fetchComparisonPage({ cursor, limit: 2 })).resolves.toEqual({
      comparisons: [record],
      hasMore: false,
      nextCursor: { createdAt: record.created_at, id: record.id },
    });
    expect(query.or).toHaveBeenCalledWith(
      `created_at.lt.${cursor.createdAt},and(created_at.eq.${cursor.createdAt},id.lt.${cursor.id})`,
    );
  });

  it("deduplicates records when pages overlap", () => {
    const first = createComparison({ id: "comparison-1" });
    const second = createComparison({ id: "comparison-2" });
    expect(mergeComparisonPages([first], [first, second])).toEqual([first, second]);
  });

  it("loads an owned incomplete comparison by ID", async () => {
    const incomplete = createComparison({ final_image_path: null });
    const query = createQuery({ data: incomplete, error: null });

    supabaseMock.from.mockReturnValueOnce(query);

    await expect(fetchComparisonById(incomplete.id)).resolves.toEqual(
      incomplete,
    );
    expect(query.eq).toHaveBeenCalledWith("id", incomplete.id);
    expect(query.eq).toHaveBeenCalledWith("user_id", "user-1");
  });

  it("reports a missing or inaccessible comparison", async () => {
    const query = createQuery({ data: null, error: null });

    supabaseMock.from.mockReturnValueOnce(query);

    await expect(fetchComparisonById("missing")).rejects.toBeInstanceOf(
      ComparisonNotFoundError,
    );
  });

  it("updates the image and derived status in one owned row", async () => {
    const query = createQuery({ data: { id: "comparison-1" }, error: null });
    const replacementPath =
      "user-1/comparison-1/final-version-2.png";

    supabaseMock.from.mockReturnValueOnce(query);

    await expect(
      updateComparisonImagePath(
        "comparison-1",
        "final",
        replacementPath,
        "user-1/comparison-1/final.jpg",
        "ready",
      ),
    ).resolves.toBeUndefined();

    expect(query.update).toHaveBeenCalledWith({
      final_image_path: replacementPath,
      status: "ready",
    });
    expect(query.eq).toHaveBeenCalledWith("user_id", "user-1");
    expect(query.eq).toHaveBeenCalledWith(
      "final_image_path",
      "user-1/comparison-1/final.jpg",
    );
  });

  it("rejects a cross-user image path before issuing an update", async () => {
    await expect(
      updateComparisonImagePath(
        "comparison-1",
        "initial",
        "user-2/comparison-1/initial-version.jpg",
      ),
    ).rejects.toThrow("Image path does not match this comparison.");

    expect(supabaseMock.from).not.toHaveBeenCalled();
  });
});
