/**
 * Configuration for a single secret to be loaded
 */
export interface SecretConfig {
  /** Name of the secret in Secret Manager (without prefix) */
  name: string;
  /** Type of secret - 'env' for environment variable, 'file' for file-based secret */
  type: 'env' | 'file';
  /** Target environment variable name (defaults to secret name) */
  targetEnvVar?: string;
  /** For file type: filename to write (optional, uses secret name if not provided) */
  filename?: string;
  /** For file type: file permissions in octal (default: 0o600 for security) */
  mode?: number;
  /** Version of the secret to fetch (default: 'latest') */
  version?: string;
  /** Common secret shared across all services (no prefix) - e.g., PRIVATE_KEY, JWKS */
  common?: boolean;
}

/**
 * Options for initializing Secret Manager
 */
export interface SecretManagerOptions {
  /** Enable Secret Manager (default: true in production, false otherwise) */
  enabled?: boolean;
  /** GCP project ID */
  projectId?: string;
  /** Prefix for secret names (e.g., 'omg-identity-service') */
  prefix?: string;
  /** List of secrets to load */
  secrets?: Array<SecretConfig | string>;
  /** Load all secrets matching the prefix */
  loadAll?: boolean;
  /** Cache secrets in memory after loading */
  cache?: boolean;
  /** Fall back to process.env if secret not found in Secret Manager */
  fallbackToEnv?: boolean;
  /** Directory to write file-based secrets (default: OS temp directory) */
  tempDir?: string;
}

/**
 * Internal representation of a loaded secret
 */
export interface LoadedSecret {
  /** Secret name */
  name: string;
  /** Secret value (string content) */
  value: string;
  /** Configuration used to load this secret */
  config: SecretConfig;
  /** Path to file if written to disk */
  filePath?: string;
}

/**
 * Result of secret loading operation
 */
export interface SecretLoadResult {
  /** Number of secrets successfully loaded */
  loaded: number;
  /** Number of secrets failed to load */
  failed: number;
  /** Number of secrets using fallback values */
  fallback: number;
  /** Details of loaded secrets (without values for security) */
  details: Array<{
    name: string;
    type: 'env' | 'file';
    source: 'secret-manager' | 'fallback';
    filePath?: string;
  }>;
}
