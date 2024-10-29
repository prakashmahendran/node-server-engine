/** Options for HMAC auth */
export interface HmacPayload {
  /** Generic object payload */
  [key: string]: unknown;
  /** HMAC signature of the whole payload */
  signature?: string;
}
