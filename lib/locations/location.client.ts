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
    options?: RequestInit
  ): Promise<T> {
    const response = await fetch(
      `${this.baseUrl}${endpoint}`,
      {
        ...options,
        headers: {
          "Authorization": `Bearer ${env.PARTNER_API_KEY}`, // Assuming global key, or move to DB if needed
          "Content-Type": "application/json",
          ...options?.headers,
        },
        cache: "no-store",
      }
    );

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Partner API Error [${response.status}] from ${this.baseUrl}: ${text}`);
    }

    return response.json();
  }

  get<T>(endpoint: string): Promise<T> { return this.request<T>(endpoint); }
  post<T>(endpoint: string, body: unknown): Promise<T> { return this.request<T>(endpoint, { method: "POST", body: JSON.stringify(body) }); }
  put<T>(endpoint: string, body: unknown): Promise<T> { return this.request<T>(endpoint, { method: "PUT", body: JSON.stringify(body) }); }
  patch<T>(endpoint: string, body: unknown): Promise<T> { return this.request<T>(endpoint, { method: "PATCH", body: JSON.stringify(body) }); }
  delete<T>(endpoint: string): Promise<T> { return this.request<T>(endpoint, { method: "DELETE" }); }
}