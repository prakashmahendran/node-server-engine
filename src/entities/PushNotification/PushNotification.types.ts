/** Notification to send to the user's device */
export interface PushNotificationNotification {
  /** Title of the notification */
  title?: string;
  /** Body of the notification */
  body?: string;
  /** Data payload of the notification */
  payload?: unknown;
  /** Indicates that the notification is a VOIP notification */
  voip?: boolean;
  /** Indicate that it is a background notification (data only, low priority) */
  background?: boolean;
  /** Push token can be specified here is we want to send to a given user */
  token?: string;
  /** Indicates that the data content can be mutated by the client (iOS) */
  mutable?: boolean;
  /** Indicates that the notification requires some client side processing to be displayed (iOS) */
  contentAvailable?: boolean;
  /** Time to live of the notification in seconds. After this the notification will not be distributed */
  ttl?: number;
  /** Indicate that it is a high priority notification */
  priority?: boolean;
  /** Notifications with the same string here will be collapsed in the system tray */
  collapseId?: string;
}
