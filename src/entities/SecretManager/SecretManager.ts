import { SecretManagerServiceClient } from '@google-cloud/secret-manager';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import {
  SecretManagerOptions,
  SecretConfig,
  LoadedSecret,
  SecretLoadResult
} from './SecretManager.types';
import { EngineError } from 'entities/EngineError';
import { LifecycleController } from 'entities/LifecycleController';
import { reportDebug, reportInfo, reportError } from 'utils/report';

const namespace = 'engine:SecretManager';

/**
 * Generic GCP Secret Manager wrapper for managing application secrets
 * Provides methods for loading secrets at startup, runtime fetching, and cleanup
 * 
 * @example
 * ```typescript
 * // Initialize with configuration
 * await SecretManager.init({
 *   enabled: true,
 *   projectId: 'my-project',
 *   prefix: 'my-service',
 *   secrets: ['DB_PASSWORD', { name: 'PRIVATE_KEY', type: 'file' }]
 * });
 * 
 * // Get a cached secret
 * const password = SecretManager.getSecret('DB_PASSWORD');
 * 
 * // Fetch a secret on-demand
 * const apiKey = await SecretManager.fetchSecret('API_KEY');
 * ```
 */
export const SecretManager = {
  /** Singleton client instance */
  client: undefined as SecretManagerServiceClient | undefined,

  /** Configuration options */
  options: undefined as SecretManagerOptions | undefined,

  /** Cache of loaded secrets */
  secretCache: new Map<string, LoadedSecret>(),

  /** Temporary files created by Secret Manager */
  tempFiles: [] as string[],

  /**
   * Initialize the Secret Manager
   * @param config - Secret Manager configuration options
   * @returns Promise with load results
   */
  async init(config: SecretManagerOptions = {}): Promise<SecretLoadResult> {
    reportDebug({ namespace, message: 'Initializing Secret Manager' });

    // Set default options
    this.options = {
      enabled: process.env.NODE_ENV === 'production',
      projectId: process.env.GCP_PROJECT_ID,
      cache: true,
      fallbackToEnv: true,
      tempDir: os.tmpdir(),
      ...config
    };

    // Skip if disabled
    if (!this.options.enabled) {
      reportInfo({
        message: 'Secret Manager disabled - using environment variables',
        data: { nodeEnv: process.env.NODE_ENV }
      });
      return {
        loaded: 0,
        failed: 0,
        fallback: 0,
        details: []
      };
    }

    // Validate configuration
    if (!this.options.projectId) {
      throw new EngineError({
        message: 'GCP_PROJECT_ID is required when Secret Manager is enabled'
      });
    }

    // Create client
    this.client = new SecretManagerServiceClient();

    // Register for shutdown
    LifecycleController.register({ shutdown: () => this.shutdown() });

    // Load secrets
    const result = await this.loadSecrets(this.options);

    reportInfo({
      message: 'Secret Manager initialized',
      data: {
        loaded: result.loaded,
        failed: result.failed,
        fallback: result.fallback
      }
    });

    return result;
  },

  /**
   * Load secrets from Secret Manager
   * @private
   */
  async loadSecrets(config: SecretManagerOptions): Promise<SecretLoadResult> {
    const result: SecretLoadResult = {
      loaded: 0,
      failed: 0,
      fallback: 0,
      details: []
    };

    if (!config.secrets || config.secrets.length === 0) {
      reportInfo('No secrets configured to load');
      return result;
    }

    // Normalize secret configurations
    const secretConfigs: SecretConfig[] = config.secrets.map(this.normalizeSecretConfig);

    // Load each secret
    for (const secretConfig of secretConfigs) {
      try {
        const loaded = await this.loadSecret(secretConfig, config);
        
        if (loaded) {
          result.loaded++;
          result.details.push({
            name: loaded.name,
            type: loaded.config.type,
            source: 'secret-manager',
            filePath: loaded.filePath
          });

          // Cache if enabled
          if (config.cache) {
            this.secretCache.set(loaded.name, loaded);
          }
        }
      } catch (error) {
        reportError(error);
        
        // Try fallback
        if (config.fallbackToEnv && process.env[secretConfig.targetEnvVar || secretConfig.name]) {
          result.fallback++;
          result.details.push({
            name: secretConfig.name,
            type: secretConfig.type,
            source: 'fallback'
          });
          reportInfo(`Using fallback value for secret: ${secretConfig.name}`);
        } else {
          result.failed++;
          reportError(new EngineError({
            message: `Failed to load secret: ${secretConfig.name}`,
            data: { error: (error as Error).message }
          }));
        }
      }
    }

    return result;
  },

  /**
   * Load a single secret from Secret Manager
   * @private
   */
  async loadSecret(
    config: SecretConfig,
    globalConfig: SecretManagerOptions
  ): Promise<LoadedSecret | null> {
    if (!this.client || !globalConfig.projectId) {
      throw new EngineError({ message: 'Secret Manager not initialized' });
    }

    // Build secret name with prefix (unless it's a common secret)
    const secretName = config.common || !globalConfig.prefix
      ? config.name
      : `${globalConfig.prefix}-${config.name}`;

    const version = config.version || 'latest';
    const name = `projects/${globalConfig.projectId}/secrets/${secretName}/versions/${version}`;

    reportDebug({
      namespace,
      message: `Loading secret: ${secretName}`,
      data: { version, type: config.type, common: config.common }
    });

    try {
      // Access the secret
      const [response] = await this.client.accessSecretVersion({ name });
      
      if (!response.payload?.data) {
        throw new EngineError({
          message: `Secret ${secretName} has no data`
        });
      }

      // Convert to string
      const secretValue = response.payload.data.toString('utf8');

      const loaded: LoadedSecret = {
        name: config.name,
        value: secretValue,
        config
      };

      // Handle based on type
      if (config.type === 'env') {
        // Set environment variable
        const envVarName = config.targetEnvVar || config.name;
        process.env[envVarName] = secretValue;
        
        reportDebug({
          namespace,
          message: `Set environment variable: ${envVarName}`
        });
      } else if (config.type === 'file') {
        // Write to temp file
        const filename = config.filename || config.name;
        const filePath = path.join(globalConfig.tempDir!, filename);
        
        await fs.writeFile(filePath, secretValue, {
          mode: config.mode || 0o600
        });
        
        loaded.filePath = filePath;
        this.tempFiles.push(filePath);

        // Update environment variable to point to file
        const envVarName = config.targetEnvVar || `${config.name}_PATH`;
        process.env[envVarName] = filePath;
        
        reportDebug({
          namespace,
          message: `Wrote secret to file: ${filePath}`,
          data: { envVar: envVarName }
        });
      }

      return loaded;
    } catch (error) {
      if ((error as any).code === 5) {
        // NOT_FOUND error
        reportInfo(`Secret not found in Secret Manager: ${secretName}`);
      }
      throw error;
    }
  },

  /**
   * Normalize secret configuration
   * @private
   */
  normalizeSecretConfig(input: SecretConfig | string): SecretConfig {
    if (typeof input === 'string') {
      // Simple string becomes an env type secret
      return {
        name: input,
        type: 'env'
      };
    }
    return input;
  },

  /**
   * Get a secret value from cache (if caching is enabled)
   * @param name - Secret name
   * @returns Secret value or undefined
   */
  getSecret(name: string): string | undefined {
    const cached = this.secretCache.get(name);
    if (cached) {
      return cached.value;
    }
    
    // Fallback to environment variable
    return process.env[name];
  },

  /**
   * Get secret from Secret Manager on-demand (useful for runtime secret rotation)
   * @param name - Secret name
   * @param version - Secret version (default: 'latest')
   * @returns Promise with secret value
   */
  async fetchSecret(
    name: string,
    version: string = 'latest'
  ): Promise<string> {
    if (!this.client || !this.options?.projectId) {
      throw new EngineError({ message: 'Secret Manager not initialized' });
    }

    const secretName = this.options.prefix ? `${this.options.prefix}-${name}` : name;
    const secretPath = `projects/${this.options.projectId}/secrets/${secretName}/versions/${version}`;

    const [response] = await this.client.accessSecretVersion({ name: secretPath });
    
    if (!response.payload?.data) {
      throw new EngineError({ message: `Secret ${secretName} has no data` });
    }

    return response.payload.data.toString('utf8');
  },

  /**
   * Reload all secrets (useful for secret rotation)
   * @returns Promise with reload results
   */
  async reload(): Promise<SecretLoadResult> {
    reportInfo({ message: 'Reloading secrets from Secret Manager' });
    
    if (!this.options) {
      throw new EngineError({ message: 'Secret Manager not initialized' });
    }

    // Clear cache
    this.secretCache.clear();

    // Reload secrets
    return this.loadSecrets(this.options);
  },

  /**
   * Shutdown Secret Manager and cleanup
   * @returns Promise that resolves when cleanup is complete
   */
  async shutdown(): Promise<void> {
    reportDebug({ namespace, message: 'Shutting down Secret Manager' });

    // Delete temporary files
    for (const filePath of this.tempFiles) {
      try {
        await fs.unlink(filePath);
        reportDebug({
          namespace,
          message: `Deleted temporary file: ${filePath}`
        });
      } catch (error) {
        reportInfo(`Failed to delete temporary file: ${filePath}`);
      }
    }

    this.tempFiles.length = 0;
    this.secretCache.clear();

    // Close client
    if (this.client) {
      await this.client.close();
      this.client = undefined;
    }

    this.options = undefined;
    
    reportDebug({ namespace, message: 'Secret Manager shut down' });
  },

  /**
   * Check if Secret Manager is initialized
   * @returns True if initialized
   */
  isInitialized(): boolean {
    return this.client !== undefined;
  },

  /**
   * Get current configuration (without sensitive data)
   * @returns Configuration object or undefined
   */
  getConfig(): Partial<SecretManagerOptions> | undefined {
    if (!this.options) return undefined;
    
    return {
      enabled: this.options.enabled,
      projectId: this.options.projectId,
      prefix: this.options.prefix,
      cache: this.options.cache,
      fallbackToEnv: this.options.fallbackToEnv
    };
  }
};
