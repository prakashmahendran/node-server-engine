/** Service instance that can be auto-shutdown by the Lifecycle Controller */
export interface LifecycleControlledInstance {
  /** Function that will be called on server shutdown, should trigger the instance cleanup */
  shutdown: () => void | Promise<void>;
}
