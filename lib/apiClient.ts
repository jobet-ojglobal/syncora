export class APIClient {
  private baseUrl =
  `${process.env.NEXT_PUBLIC_SITE_URL}`;

  private async request<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<T> {
    const response = await fetch(
      `${this.baseUrl}${endpoint}`,
      {
        ...options,
        headers: {
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
        `App API Error ${response.status}: ${text}`
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

export const appAPI =
  new APIClient();