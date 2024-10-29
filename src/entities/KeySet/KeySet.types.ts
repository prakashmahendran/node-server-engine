import { JsonWebKey } from 'crypto';

/** KeySet initialization options */
export interface KeySetOptions {
  /** This resource is located on a service inside of our private cluster */
  internal?: boolean;
  /** This URL is actually a path to a local key file encoded in PEM  */
  file?: boolean;
  /** This input is actually a full PEM string representation of a key */
  pem?: boolean;
}

/** Keep a mapping ok keyId => PEM */
export interface KeySetValues {
  [id: string]: string;
}

/** Object holding JWK keys */
export interface JWKS {
  /** Key set is JWKS format */
  keys: Array<JWK>;
}

/** JWK key with custom claims */
interface JWK extends JsonWebKey {
  /** ID of the key */
  kid: string;
}
