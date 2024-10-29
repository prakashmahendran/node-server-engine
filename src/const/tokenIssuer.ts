/** Enum to identify access tokens JWT issuers */
export enum TokenIssuer {
  /** For tokens issued by the auth service */
  AUTH_SERVICE,
  /** For tokens issued by the admin API */
  ADMIN_API
}

export const TOKEN_ISSUERS = Object.values(TokenIssuer);
