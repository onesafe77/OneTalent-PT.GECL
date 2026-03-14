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
  // Defensive check for swapped arguments
  let actualUrl = url;
  let actualMethod = method;
  let actualData = data;

  if (url && typeof url === 'string' && !url.startsWith('/') && method && typeof method === 'string' && method.startsWith('/')) {
    console.warn(`[apiRequest] Swapped: url="${url}", method="${method}"`);
    actualUrl = method;
    actualMethod = url;
  }

  if (typeof actualMethod === 'string') {
    actualMethod = actualMethod.trim().toUpperCase();
  }

  // Final check for method being a URL
  if (typeof actualMethod === 'string' && actualMethod.includes('/')) {
    actualMethod = actualData ? "POST" : "GET";
  }

  const isFormData = actualData instanceof FormData;

  const options: RequestInit = {
    method: actualMethod,
    credentials: "include",
  };

  if (actualData) {
    if (isFormData) {
      // For FormData, we let fetch set the Content-Type header with the boundary
      options.body = actualData as FormData;
    } else {
      options.headers = { "Content-Type": "application/json" };
      options.body = JSON.stringify(actualData);
    }
  }

  console.log(`[apiRequest] Fetching: ${actualMethod} ${actualUrl}`);

  const res = await fetch(actualUrl, options);

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
