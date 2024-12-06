export {};

// Override the Express request object to add the files
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    /** Express request object */
    interface Request {
      /** User that identified using a JWT */
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      user?: Record<string, any>;
    }
  }
}
