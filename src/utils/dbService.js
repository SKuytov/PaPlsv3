/**
 * Database Service
 * Provides HTTP client for communication with backend API
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

class DbService {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  /**
   * Generic request method
   */
  async request(method, endpoint, data = null, config = {}) {
    try {
      const url = endpoint.startsWith('http') ? endpoint : `${this.baseURL}${endpoint}`;
      const options = {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...config.headers,
        },
        ...config,
      };

      if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
        options.body = JSON.stringify(data);
      }

      const response = await fetch(url, options);

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error(error.message || `HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`API Error [${method} ${endpoint}]:`, error);
      throw error;
    }
  }

  /**
   * GET request
   */
  get(endpoint, config = {}) {
    return this.request('GET', endpoint, null, config);
  }

  /**
   * POST request
   */
  post(endpoint, data, config = {}) {
    return this.request('POST', endpoint, data, config);
  }

  /**
   * PUT request
   */
  put(endpoint, data, config = {}) {
    return this.request('PUT', endpoint, data, config);
  }

  /**
   * PATCH request
   */
  patch(endpoint, data, config = {}) {
    return this.request('PATCH', endpoint, data, config);
  }

  /**
   * DELETE request
   */
  delete(endpoint, config = {}) {
    return this.request('DELETE', endpoint, null, config);
  }
}

// Export singleton instance
export const dbService = new DbService();
export default dbService;
