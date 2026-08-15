import { env } from "@/lib/env";

export class InflowApiError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    public body: string
  ) {
    super(`InFlow API Error ${status}: ${body}`);
    this.name = "InflowApiError";
  }
}

export class InflowClient {
  private baseUrl: string;

  constructor() {
    // Normalize base URL to ensure no trailing slash
    const base = `${env.INFLOW_API_URL}/${env.INFLOW_COMPANY_ID}`;
    this.baseUrl = base.endsWith("/") ? base.slice(0, -1) : base;
  }

  private sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private parseRetryAfter(headerValue: string | null, fallbackDelayMs: number): number {
    if (!headerValue) return fallbackDelayMs;

    // Check if numeric (seconds)
    const seconds = Number(headerValue);
    if (!Number.isNaN(seconds)) {
      return seconds * 1000;
    }

    // Check if HTTP-Date string
    const dateMs = Date.parse(headerValue);
    if (!Number.isNaN(dateMs)) {
      const diff = dateMs - Date.now();
      return diff > 0 ? diff : fallbackDelayMs;
    }

    return fallbackDelayMs;
  }

  private async request<T>(
    endpoint: string,
    options?: RequestInit,
    retries = 5,
    delayMs = 1000
  ): Promise<T> {
    const formattedEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
    const url = `${this.baseUrl}${formattedEndpoint}`;

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          "Authorization": `Bearer ${env.INFLOW_API_KEY}`,
          "Content-Type": "application/json",
          "Accept": "application/json;version=2026-07-10",
          ...options?.headers,
        },
        cache: "no-store",
      });

      // Retry on Rate Limit (429), Request Timeout (408), or Server Errors (5xx)
      const isRetryableStatus =
        response.status === 429 || response.status === 408 || response.status >= 500;

      if (isRetryableStatus && retries > 0) {
        const retryAfterHeader = response.headers.get("Retry-After");
        let backoffMs = this.parseRetryAfter(retryAfterHeader, delayMs);

        // Add random jitter (0-500ms)
        backoffMs += Math.floor(Math.random() * 500);

        console.warn(
          `[InFlow API] Status ${response.status}. Retrying in ${backoffMs}ms... (${retries} retries left)`
        );

        await this.sleep(backoffMs);

        const MAX_DELAY = 30_000;
        const nextDelayMs = Math.min(
          delayMs * 2 + Math.floor(Math.random() * 1000),
          MAX_DELAY
        );

        return this.request<T>(endpoint, options, retries - 1, nextDelayMs);
      }

      const text = await response.text();

      if (!response.ok) {
        throw new InflowApiError(response.status, response.statusText, text);
      }

      // Handle empty bodies (204 No Content or empty string)
      if (!text || response.status === 204) {
        return {} as T;
      }

      return JSON.parse(text) as T;
    } catch (error) {
      // Re-throw non-retryable HTTP API errors directly
      if (error instanceof InflowApiError) {
        throw error;
      }

      // Retry network-level failures (DNS, timeout, connection dropped)
      if (retries > 0) {
        console.warn(
          `[InFlow API] Network error: ${(error as Error).message}. Retrying in ${delayMs}ms... (${retries} retries left)`
        );
        await this.sleep(delayMs);
        return this.request<T>(endpoint, options, retries - 1, delayMs * 2);
      }

      throw error;
    }
  }

  get<T>(endpoint: string, retries?: number, delay?: number): Promise<T> {
    return this.request<T>(endpoint, undefined, retries, delay);
  }

  post<T>(endpoint: string, body: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  put<T>(endpoint: string, body: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: "PUT",
      body: JSON.stringify(body),
    });
  }

  patch<T>(endpoint: string, body: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
  }

  delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, {
      method: "DELETE",
    });
  }
}

export const inflow = new InflowClient();



// import { env } from "@/lib/env";

// export class InflowClient {
//   private baseUrl =
//   `${env.INFLOW_API_URL}/${env.INFLOW_COMPANY_ID}`;

//   // Helper utility for delays
//   private sleep(ms: number) {
//     return new Promise((resolve) => setTimeout(resolve, ms));
//   }

//   private async request<T>(
//     endpoint: string,
//     options?: RequestInit,
//     retries = 5,
//     delayMs = 1000
//   ): Promise<T> {
//     try {
//       const response = await fetch(
//         `${this.baseUrl}${endpoint}`,
//         {
//           ...options,
//           headers: {
//             "Authorization": `Bearer ${env.INFLOW_API_KEY}`,
//             "Content-Type": "application/json",
//             "Accept": "application/json;version=2026-07-10",
//             ...options?.headers
//           },
//           cache: "no-store",
//         }
//       );

//       if ((response.status === 429 || response.status >= 500) && retries > 0) {
//         // Respect the Retry-After header if returned by inFlow, otherwise use exponential backoff
//         const retryAfterHeader = response.headers.get("Retry-After");
//         const backoffMs = retryAfterHeader
//           ? parseInt(retryAfterHeader, 10) * 1000
//           : delayMs;

//         console.warn(
//           `[InFlow API] Rate limited/Server Error (${response.status}). Retrying in ${backoffMs}ms... (${retries} retries left)`
//         );

//         await this.sleep(backoffMs);

//         // Exponential backoff with jitter for subsequent retries
//         const nextDelayMs = delayMs * 2 + Math.floor(Math.random() * 500);

//         return this.request<T>(endpoint, options, retries - 1, nextDelayMs);
//       }

//       const text = await response.text();

//       if (!response.ok) {
//         throw new Error(
//           `InFlow API Error ${response.status}: ${text}`
//         );
//       }

//       return text ? JSON.parse(text) : ({} as T);
//     } catch (error) {
//       if (retries > 0 && error instanceof Error && !error.message.includes("InFlow API Error")) {
//         console.warn(
//           `[InFlow API] Network error: ${error.message}. Retrying in ${delayMs}ms... (${retries} retries left)`
//         );
//         await this.sleep(delayMs);
//         return this.request<T>(endpoint, options, retries - 1, delayMs * 2);
//       }
//       throw error;
//     }
//   }

//   get<T>(endpoint: string, retries?: number, delay?: number): Promise<T> {
//     return this.request<T>(endpoint, undefined, retries, delay);
//   }

//   post<T>(endpoint: string, body: unknown): Promise<T> {
//     return this.request<T>(endpoint, {
//       method: "POST",
//       body: JSON.stringify(body),
//     });
//   }

//   put<T>(endpoint: string, body: unknown, options?: RequestInit): Promise<T> {
//     return this.request<T>(endpoint, {
//       method: "PUT",
//       body: JSON.stringify(body),
//       headers: {
//         ...options?.headers,
//       },
//     });
//   }

//   patch<T>(endpoint: string, body: unknown): Promise<T> {
//     return this.request<T>(endpoint, {
//       method: "PATCH",
//       body: JSON.stringify(body),
//     });
//   }

//   delete<T>(endpoint: string): Promise<T> {
//     return this.request<T>(endpoint, {
//       method: "DELETE",
//     });
//   }
// }

// export const inflow =
//   new InflowClient();


  
//     // if (!response.ok) {
//     //   const text =
//     //     await response.text();

//     //   throw new Error(
//     //     `InFlow API Error ${response.status}: ${text}`
//     //   );
//     // }