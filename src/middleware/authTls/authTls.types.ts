// Override the Express request object to add the files
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    /** Express HTTP request */
    interface Request {
      /** Host names provided by the mTLS authenticated client */
      hosts?: Array<string>;
    }
  }
}

export {};
