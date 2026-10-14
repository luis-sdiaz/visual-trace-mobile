export type SingleFlight<T> = {
  clear: () => void;
  run: (operation: () => Promise<T>) => Promise<T>;
};

export function createSingleFlight<T>(): SingleFlight<T> {
  let activeRequest: Promise<T> | null = null;

  return {
    clear() {
      activeRequest = null;
    },
    run(operation) {
      if (activeRequest) {
        return activeRequest;
      }

      const request = operation().finally(() => {
        if (activeRequest === request) {
          activeRequest = null;
        }
      });

      activeRequest = request;

      return request;
    },
  };
}
