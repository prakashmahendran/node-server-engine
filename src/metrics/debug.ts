import { Gauge } from 'prom-client';
import { instanceRegistry } from 'const';

export const debugActivated = new Gauge({
  name: 'debug_activated',
  help: 'Debug is activated',
  registers: [instanceRegistry]
});

debugActivated.set(process.env.DEBUG?.length ? 1 : 0);
