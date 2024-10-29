import { bool, num, host, email, port, url, json } from 'envalid';

import {
  envIsIpList,
  envIsPath,
  envIsHostList,
  envIsStringList,
  envIsString
} from './validators';

/**
 * envalid validators to use with checkEnvironment made with evalid.makeValidator and validator.js
 *  is* functions. + Also Added isString, isHost, and isIPList.
 *
 *
 * envalid docs: https://github.com/af/envalid
 */
export const envAssert = {
  isString: envIsString,
  isBoolean: bool,
  isNumber: num,
  isEmail: email,
  isHost: host,
  isPort: port,
  isURL: url,
  isJSON: json,
  isIPList: envIsIpList,
  isPath: envIsPath,
  isHostList: envIsHostList,
  isStringList: envIsStringList
};
