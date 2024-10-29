// Override the Express request object to add the files
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    /** Express request object */
    interface Request {
      /** User that identified using a JWT */
      user?: RequestUser;
    }
  }
}

/** User properties of the request object */
export interface RequestUser {
  /** ID of the user */
  id: string;
  /** ID of the token used to identify */
  tokenId: string;
  /** ID of the device used by the client to obtain the token */
  deviceId: string;
  /** Name of the user */
  name: string;
  /** Email of the user */
  email: string;
}
