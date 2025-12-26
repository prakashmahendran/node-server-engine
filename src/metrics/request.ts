import { Counter, Histogram, Gauge } from 'prom-client';
import { instanceRegistry, serviceRegistry } from 'const';

// Register metrics to both the instance-level registry and the service-level
// registry so `/metrics/service` can expose aggregated/service-wide metrics.
export const httpRequestCount = new Counter({
  name: 'http_requests_total',
  help: 'Total count of request received',
  registers: [instanceRegistry, serviceRegistry],
  labelNames: ['service', 'path', 'method', 'status']
});

export const httpRequestDuration = new Histogram({
  name: 'http_requests_duration',
  help: 'Duration of the request received',
  registers: [instanceRegistry, serviceRegistry],
  labelNames: ['service', 'path', 'method', 'status'],
  // Reduced buckets to lower cardinality while keeping useful latency ranges
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 5]
});

// Gauge for currently in-flight requests (simple, no labels to reduce cardinality)
export const httpInFlight = new Gauge({
  name: 'http_requests_in_flight',
  help: 'Number of requests currently being processed by this instance',
  registers: [instanceRegistry]
});

// Counter for errors (4xx/5xx) — aggregated by status class and method
export const httpErrorCount = new Counter({
  name: 'http_requests_errors_total',
  help: 'Total count of error responses',
  registers: [instanceRegistry, serviceRegistry],
  labelNames: ['service', 'status', 'method']
});

// Response size histogram (bytes). Uses instance + service registries.
export const httpResponseSize = new Histogram({
  name: 'http_response_size_bytes',
  help: 'Size of HTTP responses in bytes',
  registers: [instanceRegistry, serviceRegistry],
  labelNames: ['service', 'path', 'method', 'status'],
  buckets: [200, 500, 1500, 5000]
});
