import { AxiosRequestConfig, AxiosResponse } from 'axios';
import { request } from 'utils/request';
import { httpsAgent, loadTlsConfig } from 'utils/tlsConfig';

/** Make a network request using TLS, this exposes the server client certificates to the destination */
export async function tlsRequest<T = unknown>(
  options: AxiosRequestConfig
): Promise<AxiosResponse<T>> {
  // if the config is not initial, will do that.
  if (!httpsAgent) loadTlsConfig();
  return request<T>({ httpsAgent, ...options });
}
