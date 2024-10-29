import { BinaryToTextEncoding } from 'crypto';

/** HMAC calculation options  */
export interface HmacOptions {
  /** Secret used to sign the payload */
  secret?: string;
  /** Hashing algorithm to use (default: SHA-512) */
  algorithm?: string;
  /** Should the object keys be sorted alphabetically (default: true) */
  sort?: boolean;
  /** The encoding of the signature (default: base64) */
  encode?: BinaryToTextEncoding;
}
