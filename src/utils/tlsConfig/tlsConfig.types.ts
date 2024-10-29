/** TLS properties */
export interface TlsConfig {
  /** Path to the private key file */
  key: string;
  /** Path to the certificate file */
  cert: string;
  /** Path to the CA certificate file */
  ca: string;
  /** Passphrase to use to unwrap the private key */
  passphrase?: string;
}
