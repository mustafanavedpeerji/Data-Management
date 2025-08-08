import API_BASE_URL from './api';

interface ApiOptions extends RequestInit {
  retries?: number;
  retryDelay?: number;
}

class ApiClient {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  async request(endpoint: string, options: ApiOptions = {}): Promise<Response> {
    const { retries = 3, retryDelay = 1000, ...fetchOptions } = options;
    const url = `${this.baseURL}${endpoint}`;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await fetch(url, {
          ...fetchOptions,
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            ...fetchOptions.headers,
          },
        });

        // If successful or client error (4xx), don't retry
        if (response.ok || (response.status >= 400 && response.status < 500)) {
          return response;
        }

        // For server errors (5xx), retry if not the last attempt
        if (attempt < retries) {
          console.warn(`API call failed (${response.status}), retrying in ${retryDelay}ms... (attempt ${attempt + 1}/${retries})`);
          await this.delay(retryDelay);
          continue;
        }

        return response;
      } catch (error) {
        // Network errors, connection timeouts, etc.
        if (attempt < retries) {
          console.warn(`Network error, retrying in ${retryDelay}ms... (attempt ${attempt + 1}/${retries}):`, error);
          await this.delay(retryDelay);
          continue;
        }
        throw error;
      }
    }

    throw new Error('Max retries exceeded');
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Convenience methods
  async get(endpoint: string, options: ApiOptions = {}): Promise<Response> {
    return this.request(endpoint, { ...options, method: 'GET' });
  }

  async post(endpoint: string, data?: any, options: ApiOptions = {}): Promise<Response> {
    return this.request(endpoint, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put(endpoint: string, data?: any, options: ApiOptions = {}): Promise<Response> {
    return this.request(endpoint, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete(endpoint: string, options: ApiOptions = {}): Promise<Response> {
    return this.request(endpoint, { ...options, method: 'DELETE' });
  }
}

// Create and export a singleton instance
const apiClient = new ApiClient(API_BASE_URL);

export default apiClient;
export { ApiClient };