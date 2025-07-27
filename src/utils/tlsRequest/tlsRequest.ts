import { AxiosRequestConfig, AxiosResponse } from 'axios';
import { request } from 'utils/request';
import { getHttpsAgent } from 'utils/tlsConfig/httpsAgent';
/** Make a network request using TLS, this exposes the server client certificates to the destination */
export const tlsRequest = async <T = unknown>(
  options: AxiosRequestConfig
): Promise<AxiosResponse<T>> => {
  return request<T>({
    httpsAgent: getHttpsAgent(),
    ...options
  });
};
