import { RequestUser } from "middleware/authJwt/authJwt.types";

/** Content of the payload of user authentication tokens */
export interface UserTokenPayload {
  /** ID of the user */
  sub: string;
  /** URL of the service that issued the token */
  iss: string;
  /** URL of the services that can consume the token */
  aud: Array<string> | string;
  /** Unique ID of the token */
  jti: string;
  /** ID of the device the token was issued to */
  dev: string;
  /** Timestamp at which the token will expire */
  exp: number;
  /** List of permissions that the user has (only on the admin API) */
  per?: Array<string> | string;
  /** User */
  user: RequestUser;
}
