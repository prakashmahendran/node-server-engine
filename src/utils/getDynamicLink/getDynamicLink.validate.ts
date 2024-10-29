import { assertEnvironment, envAssert } from 'utils';

/** Environment variable validator for get dynamic link from LinkService */
export function validateDynamicLinkEnvironment(): void {
  assertEnvironment({ LINKS_SERVICE_URL: envAssert.isURL() });
}
