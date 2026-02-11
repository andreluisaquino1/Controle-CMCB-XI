
import { UseQueryResult } from "@tanstack/react-query";

export function createMockQueryResult<T>(data: T, isLoading = false, error = null): UseQueryResult<T, Error> {
    return {
        data,
        isLoading,
        error,
        isError: !!error,
        isPending: false,
        isLoadingError: false,
        isRefetchError: false,
        isSuccess: !isLoading && !error,
        isPlaceholderData: false,
        status: isLoading ? "pending" : error ? "error" : "success",
        fetchStatus: isLoading ? "fetching" : "idle",
        refetch: vi.fn(),
        isFetched: true,
        isFetchedAfterMount: true,
        isStale: false,
        dataUpdatedAt: Date.now(),
        errorUpdatedAt: 0,
        failureCount: 0,
        failureReason: null,
        errorUpdateCount: 0,
        isInitialLoading: isLoading,
        isPaused: false,
        promise: Promise.resolve(data)
    } as unknown as UseQueryResult<T, Error>;
}
