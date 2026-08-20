import { env } from "@/lib/local.env";
import { inflowQueue } from "@/utils/inflow-queue";
import { setInflowCooldown, waitForInflowCooldown } from "@/utils/rate-limit";

export class InflowApiError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    public body: string
  ) {
    super(`Local InFlow API Error ${status}: ${body}`);
    this.name = "InflowApiError";
  }
}

export class LocationClient {
  private baseUrl: string;

  constructor(locationUrl: string) {
    const sanitizedUrl = locationUrl.endsWith("/") ? locationUrl.slice(0, -1) : locationUrl;
    this.baseUrl = sanitizedUrl.includes("/api") ? sanitizedUrl : `${sanitizedUrl}/api`;
  }

  private sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async request<T>(
    endpoint: string,
    options?: RequestInit,
    retries = 5,
    delayMs = 1000
  ): Promise<T> {
    return inflowQueue.add(async () => {
      return this.executeRequest<T>(
        endpoint,
        options,
        retries,
        delayMs
      );
    }) as Promise<T>;
  }

  private async executeRequest<T>(
    endpoint: string,
    options?: RequestInit,
    retries = 5,
    delayMs = 1000
  ): Promise<T> {
    await waitForInflowCooldown();

    try {
      const response = await fetch(
        `${this.baseUrl}${endpoint}`,
        {
          ...options,
          headers: {
            Authorization: `Bearer ${env.PARTNER_API_KEY}`,
            "Content-Type": "application/json",
            Accept: "application/json;version=2026-07-10",
            ...options?.headers,
          },
          cache: "no-store",
        }
      );

      if (
        (response.status === 429 ||
          response.status >= 500) &&
        retries > 0
      ) {
        const retryAfterHeader =
          response.headers.get("Retry-After");

        const retryAfterSeconds =
          retryAfterHeader
            ? Number(retryAfterHeader)
            : NaN;

        const backoffMs =
          !Number.isNaN(retryAfterSeconds)
            ? retryAfterSeconds * 1000
            : Math.min(
                delayMs +
                  Math.floor(Math.random() * 500),
                30_000
              );

        console.warn(
          `[InFlow API] Status ${response.status}. ` +
          `Retrying in ${backoffMs}ms... ` +
          `(${retries} retries left)`
        );

        setInflowCooldown(backoffMs);

        await this.sleep(backoffMs);

        return this.executeRequest<T>(
          endpoint,
          options,
          retries - 1,
          Math.min(delayMs * 2, 30_000)
        );
      }

      const text = await response.text();

      if (!response.ok) {
        throw new Error(
          `InFlow API Error ${response.status}: ${text}`
        );
      }

      return text
        ? JSON.parse(text)
        : ({} as T);
    } catch (error) {
      if (
        retries > 0 &&
        error instanceof Error &&
        !error.message.includes("InFlow API Error")
      ) {
        await this.sleep(delayMs);

        return this.executeRequest<T>(
          endpoint,
          options,
          retries - 1,
          Math.min(delayMs * 2, 30_000)
        );
      }

      throw error;
    }
  }

  get<T>(
    endpoint: string,
    options?: RequestInit,
    retries?: number,
    delay?: number
  ): Promise<T> {
    return this.request<T>(
      endpoint,
      {
        ...options,
        method: "GET",
      },
      retries,
      delay
    );
  }

  post<T>(
    endpoint: string,
    body: unknown,
    options?: RequestInit
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  put<T>(
    endpoint: string,
    body: unknown,
    options?: RequestInit
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: "PUT",
      body: JSON.stringify(body),
    });
  }

  patch<T>(
    endpoint: string,
    body: unknown,
    options?: RequestInit
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: "PATCH",
      body: JSON.stringify(body),
    });
  }

  delete<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: "DELETE",
    });
  }
}