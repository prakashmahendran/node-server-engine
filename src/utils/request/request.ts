import axios, { AxiosResponse, AxiosRequestConfig } from 'axios';
import { LogSeverity } from 'const';
import { EngineError, EngineErrorOptions } from 'entities/EngineError';

/** Make a http(s) request through axios with proper error handling */
export async function request<T = unknown>(
  options: AxiosRequestConfig,
  tryCount = 1
): Promise<AxiosResponse<T>> {
  try {
    return await axios.request<T, AxiosResponse<T>>(options);
  } catch (error: unknown) {
    // In case of networking error, we attempt to retry the connection if we did less than 5 attempts
    if (
      tryCount < 5 &&
      axios.isAxiosError(error) &&
      error.code &&
      ['ECONNABORTED', 'ECONNREFUSED', 'ECONNRESET', 'EAI_AGAIN'].includes(
        error.code
      )
    ) {
      return request<T>(options, tryCount + 1);
    }
    const errorOptions: EngineErrorOptions = {
      message:
        error instanceof Error
          ? error.message
          : typeof error === 'string'
            ? error
            : 'An unknown error occurred',
      severity: LogSeverity.CRITICAL,
      data: { error }
    };
    if (error instanceof Error) {
      errorOptions.message = error.message;
      errorOptions.error = error;
    }
    // A response was returned but it was not a 200
    if (axios.isAxiosError(error) && error.response) {
      errorOptions.data = {
        data: error.response.data as unknown,
        status: error.response.status,
        headers: error.response.headers as unknown
      };
    }
    throw new EngineError(errorOptions);
  }
}
