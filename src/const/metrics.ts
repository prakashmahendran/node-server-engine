import { Registry } from 'prom-client';

// Registry for metrics that apply to this specific instance of the service
export const instanceRegistry = new Registry();
// Registry for metrics that apply to the service as a whole
export const serviceRegistry = new Registry();
