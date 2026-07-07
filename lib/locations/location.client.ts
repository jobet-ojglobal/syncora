// lib/partner/partner.client.ts
import { env } from "@/lib/local.env";

export class BranchClient {
  private baseUrl: string;

  // Initialize with the location-specific URL from the database
  constructor(locationUrl: string) {
    // Ensure the URL is formatted correctly (stripping trailing slashes if necessary)
    const sanitizedUrl = locationUrl.endsWith("/") ? locationUrl.slice(0, -1) : locationUrl;
    
    // Check if the saved URL already includes /api, otherwise append it
    this.baseUrl = sanitizedUrl.includes("/api") ? sanitizedUrl : `${sanitizedUrl}/api`;
  }

  private async request<T>(
    endpoint: string,
    options?: RequestInit & { timeout?: number } // Accept optional timeout override
  ): Promise<T> {
    const timeoutMs = options?.timeout ?? 2500; // Default: 2.5 second cutoff limit
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(
        `${this.baseUrl}${endpoint}`,
        {
          ...options,
          signal: controller.signal, // Attach abort signal
          headers: {
            "Authorization": `Bearer ${env.PARTNER_API_KEY}`,
            "Content-Type": "application/json",
            ...options?.headers,
          },
          cache: "no-store",
        }
      );

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`InFlow API Error ${response.status}: ${text}`);
      }

      return await response.json();
    } catch (error: any) {
      if (error.name === "AbortError") {
        throw new Error(`Partner API connection timed out after ${timeoutMs}ms ${this.baseUrl}`);
      }
      throw error;
    } finally {
      clearTimeout(timeoutId); // Clean up memory reference
    }
  }

  get<T>(endpoint: string, options?: { timeout?: number }): Promise<T> {
    return this.request<T>(endpoint, { method: "GET", ...options });
  }
  post<T>(endpoint: string, body: unknown): Promise<T> { return this.request<T>(endpoint, { method: "POST", body: JSON.stringify(body) }); }
  put<T>(endpoint: string, body: unknown): Promise<T> { return this.request<T>(endpoint, { method: "PUT", body: JSON.stringify(body) }); }
  patch<T>(endpoint: string, body: unknown): Promise<T> { return this.request<T>(endpoint, { method: "PATCH", body: JSON.stringify(body) }); }
  delete<T>(endpoint: string): Promise<T> { return this.request<T>(endpoint, { method: "DELETE" }); }
}