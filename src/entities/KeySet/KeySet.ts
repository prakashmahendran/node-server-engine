import { createPublicKey, createHash } from 'crypto';
import { readFileSync } from 'fs';
import { Method } from 'axios';
import { KeySetOptions, KeySetValues, JWKS } from './KeySet.types';
import { LogSeverity } from 'const';
import { EngineError } from 'entities/EngineError';
import { reportDebug, reportError } from 'utils/report';
import { request } from 'utils/request';
import { tlsRequest } from 'utils/tlsRequest';

const namespace = 'engine:keySet';

// Number of seconds between each key refresh
const KEY_REFRESH_INTERVAL = 300;

/**
 * Fetch Json Web Key Sets and cache them
 * Keys can then be used for Json Web Token authentication
 */
export class KeySet {
  /** Latest known value for the keys in the set, indexed by the key id */
  private keySet: KeySetValues = {};
  /** URL at which the key set can be fetched */
  private url: string;
  /** This resource is located on a service inside of our private cluster */
  private internal: boolean;
  /** This URL is actually a path to a local key file encoded in PEM  */
  private file: boolean;
  /** This input is actually a full PEM string representation of a key */
  private pem: boolean;
  /** Timer for the key fetching interval */
  private interval?: NodeJS.Timeout | string | number | undefined;

  /** Create a new Key Set */
  public constructor(url: string, options: KeySetOptions = {}) {
    this.url = url;
    this.internal = options.internal ?? false;
    this.file = options.file ?? false;
    this.pem = options.pem ?? false;
  }

  /** Calculate key ID from PEM string */
  private static calculateKeyId(pem: string): string {
    // We use the md5 hash of the PEM file to defined the key ID
    const hash = createHash('md5');
    hash.update(pem.trim());
    const kid = hash.digest('base64url');
    reportDebug({
      namespace,
      message: `Calculated Key ID: "${kid}"`,
      data: { key: pem }
    });
    return kid;
  }

  /** Initialize a KeySet, should be run on server startup to avoid any misconfiguration */
  public async init(): Promise<void> {
    await this.fetch();
    this.interval = setInterval(() => {
      (async (): Promise<void> => {
        try {
          await this.fetch();
        } catch (error) {
          reportError(error);
        }
      })().catch((error) => {
        reportError(error);
      });
    }, KEY_REFRESH_INTERVAL * 1000);
  }

  /** Clear any pending timers to avoid pending process */
  public shutdown(): void {
    if (this.interval) clearInterval(this.interval);
  }

  /** Get the PEM encoded version of a key by its id */
  public getKey(keyId: string): string | undefined {
    return this.keySet[keyId];
  }

  /** Get all the keys in the set mapped by their ID */
  public getKeys(): KeySetValues {
    return this.keySet;
  }

  /** Fetch the latest version of the key set */
  private async fetch(): Promise<void> {
    reportDebug({
      namespace,
      message: `Fetching JWKS`,
      data: { url: this.url }
    });

    if (this.pem) {
      // Read the key from the parameter directly
      reportDebug({
        namespace,
        message: 'Processing key from given PEM string'
      });

      const kid = KeySet.calculateKeyId(this.url);

      this.keySet = { [kid]: this.url };
    } else if (this.file) {
      // Read the key from a file
      reportDebug({
        namespace,
        message: `Reading key on disk at path "${this.url}"`
      });
      const set = JSON.parse(readFileSync(this.url, 'utf-8'));

      // Check that the returned data has the shape of a JWKS
      if (!(set.keys && set.keys instanceof Array))
        throw new EngineError({
          severity: LogSeverity.ERROR,
          message: 'Fetched key set is not in an appropriate format',
          data: { url: this.url, set }
        });

      // Create a node.crypto public key object for each key in the set
      this.keySet = set.keys.reduce(
        (set: { [x: string]: string; }, key: { kid: string | number; }) => {
          set[key.kid] = createPublicKey({ key, format: 'jwk' }).export({
            format: 'pem',
            type: 'spki'
          }) as string;
          return set;
        },
        {} as Record<string, string>
      );
    } else {
      // Fetch key by making a network request
      reportDebug({
        namespace,
        message: `Making network request to "${this.url}"`
      });

      const requestOptions = { url: this.url, method: 'get' as Method };
      // For services inside of our cluster we use the TLS authenticated request method
      const { data: set } = await (this.internal
        ? tlsRequest<JWKS>(requestOptions)
        : request<JWKS>(requestOptions));

      // Check that the returned data has the shape of a JWKS
      if (!(set.keys && set.keys instanceof Array))
        throw new EngineError({
          severity: LogSeverity.ERROR,
          message: 'Fetched key set is not in an appropriate format',
          data: { url: this.url, set }
        });

      // Create a node.crypto public key object for each key in the set
      this.keySet = set.keys.reduce(
        (set, key) => {
          set[key.kid] = createPublicKey({ key, format: 'jwk' }).export({
            format: 'pem',
            type: 'spki'
          }) as string;
          return set;
        },
        {} as Record<string, string>
      );
    }

    reportDebug({
      namespace,
      message: `Stored ${Object.keys(this.keySet).length} keys`,
      data: { keyIds: Object.keys(this.keySet) }
    });
  }
}
