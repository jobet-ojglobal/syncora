import { env } from "@/lib/local.env";

export class InflowClient {
  private baseUrl =
  `${env.LOCAL001_API_URL}/api`;

  private async request<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<T> {
    const response = await fetch(
      `${this.baseUrl}${endpoint}`,
      {
        ...options,
        headers: {
          "Authorization": `Bearer ${env.LOCAL001_API_KEY}`,
          "Content-Type": "application/json",
          ...options?.headers,
        },
        cache: "no-store",
      }
    );

    if (!response.ok) {
      const text =
        await response.text();

      throw new Error(
        `InFlow API Error ${response.status}: ${text}`
      );
    }

    return response.json();
  }

  get<T>(
    endpoint: string
  ): Promise<T> {
    return this.request<T>(
      endpoint
    );
  }

  post<T>(
    endpoint: string,
    body: unknown
  ): Promise<T> {
    return this.request<T>(
      endpoint,
      {
        method: "POST",
        body: JSON.stringify(
          body
        ),
      }
    );
  }

  put<T>(
    endpoint: string,
    body: unknown
  ): Promise<T> {
    return this.request<T>(
      endpoint,
      {
        method: "PUT",
        body: JSON.stringify(body),
      }
    );
  }

  patch<T>(
    endpoint: string,
    body: unknown
  ): Promise<T> {
    return this.request<T>(
      endpoint,
      {
        method: "PATCH",
        body: JSON.stringify(
          body
        ),
      }
    );
  }

  delete<T>(
    endpoint: string
  ): Promise<T> {
    return this.request<T>(
      endpoint,
      {
        method: "DELETE",
      }
    );
  }
}

export const inflow =
  new InflowClient();