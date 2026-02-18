import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ServiceClientConfig {
  baseURL: string;
  serviceName: string;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  circuitBreaker?: CircuitBreakerConfig;
}

export interface CircuitBreakerConfig {
  failureThreshold?: number;
  resetTimeout?: number;
  halfOpenRequests?: number;
}

export interface RequestOptions extends AxiosRequestConfig {
  skipCircuitBreaker?: boolean;
  correlationId?: string;
  authToken?: string;
  userId?: string;
}

export type CircuitState = 'closed' | 'open' | 'half-open';

// ─── Circuit Breaker ─────────────────────────────────────────────────────────

class CircuitBreaker {
  private state: CircuitState = 'closed';
  private failures = 0;
  private successes = 0;
  private lastFailureTime = 0;
  private halfOpenRequests = 0;

  private readonly failureThreshold: number;
  private readonly resetTimeout: number;
  private readonly maxHalfOpenRequests: number;

  constructor(config: CircuitBreakerConfig = {}) {
    this.failureThreshold = config.failureThreshold ?? 5;
    this.resetTimeout = config.resetTimeout ?? 30000; // 30 seconds
    this.maxHalfOpenRequests = config.halfOpenRequests ?? 3;
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime >= this.resetTimeout) {
        this.state = 'half-open';
        this.halfOpenRequests = 0;
        this.successes = 0;
      } else {
        throw new CircuitBreakerError('Circuit breaker is open');
      }
    }

    if (this.state === 'half-open' && this.halfOpenRequests >= this.maxHalfOpenRequests) {
      throw new CircuitBreakerError('Circuit breaker is half-open, too many requests');
    }

    if (this.state === 'half-open') {
      this.halfOpenRequests++;
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    if (this.state === 'half-open') {
      this.successes++;
      if (this.successes >= this.maxHalfOpenRequests) {
        this.state = 'closed';
        this.failures = 0;
      }
    } else {
      this.failures = 0;
    }
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.state === 'half-open' || this.failures >= this.failureThreshold) {
      this.state = 'open';
    }
  }

  getState(): CircuitState {
    return this.state;
  }

  reset(): void {
    this.state = 'closed';
    this.failures = 0;
    this.successes = 0;
    this.halfOpenRequests = 0;
  }
}

export class CircuitBreakerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CircuitBreakerError';
  }
}

// ─── Service Client ──────────────────────────────────────────────────────────

export class ServiceClient {
  private client: AxiosInstance;
  private circuitBreaker: CircuitBreaker;
  private config: ServiceClientConfig;

  constructor(config: ServiceClientConfig) {
    this.config = {
      timeout: 10000,
      retries: 3,
      retryDelay: 1000,
      ...config,
    };

    this.client = axios.create({
      baseURL: config.baseURL,
      timeout: this.config.timeout,
    });

    this.circuitBreaker = new CircuitBreaker(config.circuitBreaker);

    // Add request interceptor for correlation ID
    this.client.interceptors.request.use((config) => {
      config.headers['x-service-name'] = this.config.serviceName;
      return config;
    });
  }

  // ─── HTTP Methods ────────────────────────────────────────────────────────────

  async get<T>(path: string, options?: RequestOptions): Promise<T> {
    return this.request<T>({ method: 'GET', url: path, ...options });
  }

  async post<T>(path: string, data?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>({ method: 'POST', url: path, data, ...options });
  }

  async put<T>(path: string, data?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>({ method: 'PUT', url: path, data, ...options });
  }

  async patch<T>(path: string, data?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>({ method: 'PATCH', url: path, data, ...options });
  }

  async delete<T>(path: string, options?: RequestOptions): Promise<T> {
    return this.request<T>({ method: 'DELETE', url: path, ...options });
  }

  // ─── Core Request Method ─────────────────────────────────────────────────────

  private async request<T>(options: RequestOptions): Promise<T> {
    const { skipCircuitBreaker, correlationId, authToken, userId, ...axiosConfig } = options;

    // Add headers
    const headers: Record<string, string> = {
      ...(axiosConfig.headers as Record<string, string>),
    };

    if (correlationId) {
      headers['x-correlation-id'] = correlationId;
    }

    if (authToken) {
      headers['authorization'] = `Bearer ${authToken}`;
      headers['x-auth-token'] = authToken;
    }

    if (userId) {
      headers['x-user-id'] = userId;
    }

    axiosConfig.headers = headers;

    const makeRequest = async (): Promise<T> => {
      let lastError: Error | null = null;

      for (let attempt = 0; attempt < (this.config.retries ?? 3); attempt++) {
        try {
          const response: AxiosResponse<T> = await this.client.request(axiosConfig);
          return response.data;
        } catch (error) {
          lastError = error as Error;

          // Don't retry on client errors (4xx)
          if (axios.isAxiosError(error) && error.response?.status && error.response.status < 500) {
            throw error;
          }

          // Wait before retry
          if (attempt < (this.config.retries ?? 3) - 1) {
            await this.sleep((this.config.retryDelay ?? 1000) * (attempt + 1));
          }
        }
      }

      throw lastError;
    };

    if (skipCircuitBreaker) {
      return makeRequest();
    }

    return this.circuitBreaker.execute(makeRequest);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // ─── Utilities ───────────────────────────────────────────────────────────────

  getCircuitState(): CircuitState {
    return this.circuitBreaker.getState();
  }

  resetCircuit(): void {
    this.circuitBreaker.reset();
  }

  getBaseURL(): string {
    return this.config.baseURL;
  }
}

// ─── Service Registry ────────────────────────────────────────────────────────

export interface ServiceConfig {
  name: string;
  url: string;
}

class ServiceRegistry {
  private clients: Map<string, ServiceClient> = new Map();
  private sourceName: string = 'unknown';

  setSourceName(name: string): void {
    this.sourceName = name;
  }

  register(service: ServiceConfig): ServiceClient {
    const client = new ServiceClient({
      baseURL: service.url,
      serviceName: this.sourceName,
    });

    this.clients.set(service.name, client);
    return client;
  }

  get(serviceName: string): ServiceClient | undefined {
    return this.clients.get(serviceName);
  }

  getOrThrow(serviceName: string): ServiceClient {
    const client = this.clients.get(serviceName);
    if (!client) {
      throw new Error(`Service "${serviceName}" not registered`);
    }
    return client;
  }

  getAll(): Map<string, ServiceClient> {
    return this.clients;
  }
}

// ─── Singleton Registry ──────────────────────────────────────────────────────

export const serviceRegistry = new ServiceRegistry();

// ─── Factory Functions ───────────────────────────────────────────────────────

export function createServiceClient(config: ServiceClientConfig): ServiceClient {
  return new ServiceClient(config);
}

export function createUsersClient(baseURL: string, serviceName: string): ServiceClient {
  return new ServiceClient({ baseURL, serviceName });
}

export function createArtisanClient(baseURL: string, serviceName: string): ServiceClient {
  return new ServiceClient({ baseURL, serviceName });
}

export function createTransactionClient(baseURL: string, serviceName: string): ServiceClient {
  return new ServiceClient({ baseURL, serviceName });
}

export function createMessagingClient(baseURL: string, serviceName: string): ServiceClient {
  return new ServiceClient({ baseURL, serviceName });
}

export function createPlatformClient(baseURL: string, serviceName: string): ServiceClient {
  return new ServiceClient({ baseURL, serviceName });
}

// ─── Exports ─────────────────────────────────────────────────────────────────

export default ServiceClient;
