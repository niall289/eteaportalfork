import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  url: string,
  options: RequestInit = {}
): Promise<any> {
  const res = await fetch(url, {
    ...options,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res.json();
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const [baseUrl, ...params] = queryKey;
    const url = new URL(baseUrl as string, window.location.origin);
    
    // If the second parameter is an object, use it as query parameters
    if (params[0] && typeof params[0] === 'object') {
      Object.entries(params[0]).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.set(key, String(value));
        }
      });
    }
    
    const res = await fetch(url.toString(), {
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
      refetchInterval: 30000, // Refetch every 30 seconds for real-time data
      refetchOnWindowFocus: true, // Refetch when window gains focus
      staleTime: 10000, // Data becomes stale after 10 seconds
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
