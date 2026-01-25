import {
  verify,
  JwtHeader,
  SigningKeyCallback,
  Algorithm,
  VerifyOptions,
  sign
} from 'jsonwebtoken';
import fs from 'fs';
import { UserTokenPayload } from './jwt.types';
import { TokenIssuer } from 'const';
import { EngineError } from 'entities/EngineError';
import { KeySet } from 'entities/KeySet';
import { WebError } from 'entities/WebError';
import { assertEnvironment } from 'utils/checkEnvironment';
import { envAssert } from 'utils/envAssert';
import { reportDebug } from 'utils/report';

export let keySet: KeySet | undefined;

const namespace = 'engine:utils:jwt';

/** Initiate key fetching mechanism */
export async function initKeySets(): Promise<void> {
  // Create the KeySet instance
  // The auth-service fetches its key from its disk and not from a network request
  // This prevents fetch failures the first time the auth-service is started
  if (process.env.CHART === 'auth-service') {
    if (!process.env.ECDSA_PUBLIC_KEY)
      throw new EngineError({
        message: 'Environment variable "ECDSA_PUBLIC_KEY" is not defined'
      });
    keySet = new KeySet(process.env.ECDSA_PUBLIC_KEY, { file: true });
  } else {
    if (process.env.AUTH_SERVICE_URL)
      keySet = new KeySet(
        `${process.env.AUTH_SERVICE_URL}/.well-known/jwks.json`,
        { internal: true }
      );
    else
      keySet = new KeySet(`./keys/jwks.json`, { internal: true, file: true });

    if (!keySet)
      throw new EngineError({
        message:
          'Environment variable "AUTH_SERVICE_URL" is not defined or JWKS not found'
      });
  }
  const promise = [keySet.init.bind(keySet)()];

  await Promise.all(promise);
}

/** Stop fetching keys regularly */
export function shutdownKeySets(): void {
  if (keySet) keySet.shutdown.bind(keySet)();
}

/** Get the JWT public key */
function jwtGetKey(header: JwtHeader, callback: SigningKeyCallback): void {
  // In test environment we return the symmetric signature secret
  if (process.env.NODE_ENV === 'test') {
    callback(null, process.env.JWT_SECRET);
    return;
  }
  // Check that KeySet has been initialized
  if (!keySet) {
    callback(new EngineError({ message: 'KeySet has not been initialized' }));
    return;
  }
  // Check that the token has a key ID
  if (!header.kid) {
    callback(
      new EngineError({
        message:
          'Token has not key ID in header, impossible to match with known key',
        data: header
      })
    );
    return;
  }

  // In test environment we use a symmetrical secret bases signature
  if (process.env.NODE_ENV === 'test') {
    callback(null, process.env.JWT_SECRET);
    return;
  }
  reportDebug({
    namespace,
    message: `Looking for key with ID "${header.kid}"`
  });
  // Go through each key set to check if the token's key is in one of them
  let key;
  try {
    key = keySet.getKey(header.kid);
  } catch (error: Error | null | unknown) {
    callback(error instanceof Error ? error : null);
    return;
  }

  if (key) {
    reportDebug({ namespace, message: `Found key with ID "${header.kid}"` });
    callback(null, key);
    return;
  }
  callback(
    new WebError({
      statusCode: 401,
      errorCode: 'unauthorized',
      message: 'Could not find the tokens key in any key set',
      data: { kid: header.kid }
    })
  );
}

/** Verify an user Json Web Token */
export async function jwtVerify(
  token: string,
  issuer: TokenIssuer = TokenIssuer.AUTH_SERVICE
): Promise<UserTokenPayload> {
  let algorithms = ['ES256' as Algorithm];
  if (process.env.NODE_ENV === 'test') {
    assertEnvironment({ JWT_SECRET: envAssert.isString() });
    algorithms = ['HS256' as Algorithm];
  }
  assertEnvironment({
    ACCESS_TOKEN_AUDIENCE: envAssert.isString(),
    ACCESS_TOKEN_ISSUER: envAssert.isString(),
    ACCESS_TOKEN_EXPIRATION_TIME: envAssert.isString()
  });
  let options: VerifyOptions | undefined;

  switch (issuer) {
    case TokenIssuer.AUTH_SERVICE:
      options = {
        audience: [process.env.ACCESS_TOKEN_AUDIENCE as string],
        issuer: [process.env.ACCESS_TOKEN_ISSUER as string],
        algorithms
      };
      break;
    default:
      throw new EngineError({
        message: `Invalid token issuer specified "${issuer as string}"`
      });
  }

  return new Promise<UserTokenPayload>((resolve, reject) => {
    verify(token, jwtGetKey, options, (error, result) => {
      if (error) {
        reject(
          new WebError({
            errorCode: 'unauthorized',
            statusCode: 401,
            message: 'Invalid token supplied',
            data: { token },
            error: error instanceof Error ? error : undefined
          })
        );
        return;
      }
      resolve(result as UserTokenPayload);
    });
  });
}

export function generateJwtToken(user: unknown) {
  const signOptions = {
    algorithm: 'ES256' as const, // or 'ES256' as Algorithm
    expiresIn: process.env.ACCESS_TOKEN_EXPIRATION_TIME
      ? parseInt(process.env.ACCESS_TOKEN_EXPIRATION_TIME, 10)
      : 3600,
    issuer: process.env.ACCESS_TOKEN_ISSUER,
    audience: process.env.ACCESS_TOKEN_AUDIENCE,
    keyid: Object.keys(keySet?.getKeys() ?? {})[0]
  };

  // Get private key - can be either the key content directly or a file path
  let privateKey: string;
  
  if (process.env.PRIVATE_KEY) {
    // Direct key content in environment variable
    privateKey = process.env.PRIVATE_KEY;
  } else if (process.env.PRIVATE_KEY_PATH) {
    // File path in environment variable - read the file
    try {
      privateKey = fs.readFileSync(process.env.PRIVATE_KEY_PATH, 'utf8');
    } catch (error) {
      throw new EngineError({
        message: `Failed to read private key from path: ${process.env.PRIVATE_KEY_PATH}`,
        data: { error: error instanceof Error ? error.message : String(error) }
      });
    }
  } else {
    throw new EngineError({ 
      message: 'Neither PRIVATE_KEY nor PRIVATE_KEY_PATH environment variable is set' 
    });
  }

  const token = sign({ user }, privateKey, signOptions);

  return token;
}
