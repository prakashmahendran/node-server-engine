import { stub } from 'sinon';
import { PubSub } from 'entities/PubSub';

/** Create a stub for Pub/Sub entity */
export function stubPubSub(): void {
  stub(PubSub, 'init').resolves();
}
