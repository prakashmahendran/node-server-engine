/** Enum to identify access tokens JWT issuers */
export enum TokenIssuer {
  /** For tokens issued by the auth service */
  AUTH_SERVICE
}

export const TOKEN_ISSUERS = Object.values(TokenIssuer);
