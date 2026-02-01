import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    // Clone response to read body twice if needed
    const resClone = res.clone();

    try {
      // Try to parse as JSON first
      const errorData = await res.json();
      const message = errorData.message || errorData.error || `HTTP ${res.status}`;
      throw new Error(message);
    } catch (jsonError) {
      // If JSON parsing fails, try getting text
      try {
        const text = await resClone.text();
        if (text && text.trim()) {
          throw new Error(text);
        }
      } catch {
        // Ignore text parsing errors
      }
      // Fallback with status code
      throw new Error(`HTTP ${res.status}`);
    }
  }
}

export async function apiRequest(
  url: string,
  method: string = "GET",
  data?: unknown | undefined,
): Promise<any> {
  console.log(`[apiRequest] ${method} ${url}`, data);
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  if (res.status === 204) {
    return null;
  }
  return await res.json();
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
    async ({ queryKey }) => {
      const res = await fetch(queryKey.join("/") as string, {
        credentials: "include",
      });

      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        return null;
      }

      await throwIfResNotOk(res);
      return await res.json();
    };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
