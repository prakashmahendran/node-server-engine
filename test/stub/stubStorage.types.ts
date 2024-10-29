import { SinonStub } from 'sinon';

/** Stubbed Storage module */
export interface StubbedStorage {
  /** upload stub */
  upload: SinonStub;
  /** remove stub */
  remove: SinonStub;
  /** download stub */
  download: SinonStub;
}
