// Override the Express request object to add the files
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    /** Express request object */
    interface Request {
      /** User that identified using a JWT */
      admin?: RequestAdminProps;
    }
  }
}

/** Admin auth properties of the request */
export interface RequestAdminProps {
  /** Email address of the user */
  email: string;
  /** List of permissions that the user has */
  permissions: Array<string>;
}
