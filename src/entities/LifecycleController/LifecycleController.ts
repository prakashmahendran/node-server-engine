import { LifecycleControlledInstance } from './LifecycleController.types';

/**  List of initialized entities */
export const runningInstances: Set<LifecycleControlledInstance> = new Set();

/** LifecycleController is used to shutdown all the entities on server shutdown */
export const LifecycleController = {
  /** Add the initialized instances into the runningInstance property */
  register(instance: LifecycleControlledInstance): void {
    runningInstances.add(instance);
  },

  /** Shutdown all the running instances */
  async shutdownRunningInstances(): Promise<void> {
    const promises = [];
    for (const instance of runningInstances) {
      if (instance) {
        promises.push(instance.shutdown.bind(instance)());
      }
    }
    await Promise.all(promises);
    runningInstances.clear();
  }
};
