import { Counter, Histogram } from 'prom-client';
import { instanceRegistry } from 'const';

export const httpRequestCount = new Counter({
  name: 'http_requests_total',
  help: 'Total count of request received',
  registers: [instanceRegistry],
  labelNames: ['service', 'path', 'method', 'status']
});

export const httpRequestDuration = new Histogram({
  name: 'http_requests_duration',
  help: 'Duration of the request received',
  registers: [instanceRegistry],
  labelNames: ['service', 'path', 'method', 'status'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 0.5, 1, 2.5, 5, 10]
});
