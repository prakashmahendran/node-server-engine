import { AxiosRequestConfig } from 'axios';
import {
  getDynamicLinksOptions,
  DynamicLinkResponseBody
} from './getDynamicLink.types';
import { validateDynamicLinkEnvironment } from './getDynamicLink.validate';
import { tlsRequest } from 'utils/tlsRequest';

/** Fetch a dynamic link from the links service */
export async function getDynamicLink(
  path: string,
  options: getDynamicLinksOptions = {}
): Promise<string> {
  validateDynamicLinkEnvironment();
  const option: AxiosRequestConfig = {
    method: 'get',
    url: '/link',
    baseURL: process.env.LINKS_SERVICE_URL,
    params: {
      path,
      short: options.short ?? true
    }
  };
  const {
    data: { link }
  } = await tlsRequest<DynamicLinkResponseBody>(option);
  return link;
}
