import { GoogleGenAI, File as GeminiFile, FileState } from '@google/genai';
import { setTimeout as setTimeoutPromise } from 'timers/promises';
import { reportError, reportDebug } from 'utils/report';

const namespace = 'engine:utils:geminiFileUpload';

/** Delay between two checks of the file processing state */
export const GEMINI_POLL_INTERVAL_MS = 10_000;
/** Maximum time to wait for Gemini to process an uploaded file */
const GEMINI_PROCESSING_TIMEOUT_MS =
  Number(process.env.GEMINI_PROCESSING_TIMEOUT_MS) || 10 * 60 * 1000;

let client: GoogleGenAI | undefined;
let clientKey: string | undefined;

/**
 * Get the Gemini client
 * The client is created lazily so that GOOGLE_AI_KEY can be loaded at startup (e.g. by the Secret Manager)
 */
export function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GOOGLE_AI_KEY ?? '';
  if (!client || clientKey !== apiKey) {
    client = new GoogleGenAI({ apiKey });
    clientKey = apiKey;
  }
  return client;
}

/** Upload a file to Gemini and wait until it is ready to be used in prompts */
export async function geminiFileUpload(
  buffer: Buffer,
  mimeType: string,
  originalName: string,
  pollIntervalMs: number = GEMINI_POLL_INTERVAL_MS
): Promise<
  | { success: true; originalname: string; fileUri: string; mimeType: string }
  | { success: false; error: unknown }
> {
  try {
    const { files } = getGeminiClient();

    // 1. Upload the file straight from memory
    const file = await files.upload({
      file: new Blob([new Uint8Array(buffer)], { type: mimeType }),
      config: { mimeType, displayName: originalName }
    });

    if (!file?.name) {
      throw new Error('Upload failed: No file returned');
    }

    reportDebug({
      namespace,
      message: 'Uploaded file successfully, waiting for file processing',
      data: { displayName: file.displayName, name: file.name }
    });

    // 2. Poll until the file is processed, with an upper bound on the wait
    const deadline = Date.now() + GEMINI_PROCESSING_TIMEOUT_MS;
    let geminiFile: GeminiFile | undefined = await files.get({
      name: file.name
    });
    while (geminiFile?.state === FileState.PROCESSING) {
      if (Date.now() > deadline) {
        throw new Error(`Timed out waiting for Gemini to process ${file.name}`);
      }
      await setTimeoutPromise(pollIntervalMs);
      geminiFile = await files.get({ name: file.name });
    }

    if (geminiFile?.state !== FileState.ACTIVE) {
      const errorMessage = `File processing failed for ${file.name}`;
      reportError(errorMessage);
      return { success: false, error: new Error(errorMessage) };
    }

    reportDebug({ namespace, message: 'File is ready' });

    return {
      success: true,
      originalname: file.name,
      fileUri: geminiFile.uri ?? file.uri ?? '',
      mimeType: geminiFile.mimeType ?? file.mimeType ?? mimeType
    };
  } catch (error) {
    reportError({
      namespace,
      message: 'Error during Gemini file upload and processing',
      error
    });
    return { success: false, error };
  }
}
