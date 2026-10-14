import { describe, expect, it, vi } from "vitest";

import { createSingleFlight } from "@/utils/singleFlight";

describe("createSingleFlight", () => {
  it("shares one active operation across duplicate requests", async () => {
    let resolveOperation: ((value: string) => void) | undefined;
    const operation = vi.fn(
      () =>
        new Promise<string>((resolve) => {
          resolveOperation = resolve;
        }),
    );
    const singleFlight = createSingleFlight<string>();

    const firstRequest = singleFlight.run(operation);
    const duplicateRequest = singleFlight.run(operation);

    expect(duplicateRequest).toBe(firstRequest);
    expect(operation).toHaveBeenCalledTimes(1);

    resolveOperation?.("available");

    await expect(firstRequest).resolves.toBe("available");
  });

  it("allows a new operation after completion or an explicit clear", async () => {
    const operation = vi.fn().mockResolvedValue("available");
    const singleFlight = createSingleFlight<string>();

    await singleFlight.run(operation);
    await singleFlight.run(operation);
    singleFlight.clear();
    await singleFlight.run(operation);

    expect(operation).toHaveBeenCalledTimes(3);
  });
});
