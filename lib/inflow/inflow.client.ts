import { env } from "@/lib/env";

export class InflowClient {
  private baseUrl =
  `${env.INFLOW_API_URL}/${env.INFLOW_COMPANY_ID}`;

  // Helper utility for delays
  private sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async request<T>(
    endpoint: string,
    options?: RequestInit,
    retries = 5,
    delayMs = 1000
  ): Promise<T> {
    try {
      const response = await fetch(
        `${this.baseUrl}${endpoint}`,
        {
          ...options,
          headers: {
            "Authorization": `Bearer ${env.INFLOW_API_KEY}`,
            "Content-Type": "application/json",
            "Accept": "application/json;version=2026-07-10",
            ...options?.headers,
            "X-OverrideAllowNegativeInventory": "TRUE"
          },
          cache: "no-store",
        }
      );

      if ((response.status === 429 || response.status >= 500) && retries > 0) {
        // Respect the Retry-After header if returned by inFlow, otherwise use exponential backoff
        const retryAfterHeader = response.headers.get("Retry-After");
        const backoffMs = retryAfterHeader
          ? parseInt(retryAfterHeader, 10) * 1000
          : delayMs;

        console.warn(
          `[InFlow API] Rate limited/Server Error (${response.status}). Retrying in ${backoffMs}ms... (${retries} retries left)`
        );

        await this.sleep(backoffMs);

        // Exponential backoff with jitter for subsequent retries
        const nextDelayMs = delayMs * 2 + Math.floor(Math.random() * 500);

        return this.request<T>(endpoint, options, retries - 1, nextDelayMs);
      }

      const text = await response.text();

      if (!response.ok) {
        throw new Error(
          `InFlow API Error ${response.status}: ${text}`
        );
      }

      return text ? JSON.parse(text) : ({} as T);
    } catch (error) {
      if (retries > 0 && error instanceof Error && !error.message.includes("InFlow API Error")) {
        console.warn(
          `[InFlow API] Network error: ${error.message}. Retrying in ${delayMs}ms... (${retries} retries left)`
        );
        await this.sleep(delayMs);
        return this.request<T>(endpoint, options, retries - 1, delayMs * 2);
      }
      throw error;
    }
  }

  get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint);
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

export const inflow =
  new InflowClient();


  
    // if (!response.ok) {
    //   const text =
    //     await response.text();

    //   throw new Error(
    //     `InFlow API Error ${response.status}: ${text}`
    //   );
    // }