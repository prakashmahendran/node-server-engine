import { GoogleAIFileManager } from '@google/generative-ai/server';
import fs from 'fs';
import path from 'path';
import tmp from 'tmp';
import { reportError, reportDebug } from 'utils/report';

const namespace = 'engine:middleware:geminiFileUploader';

const apiKey = process.env.GOOGLE_AI_KEY ?? '';
const fileManager = new GoogleAIFileManager(apiKey);

async function uploadToGemini(
  buffer: Buffer,
  mimeType: string,
  originalName: string
): Promise<
  | { success: true; originalname: string; fileUri: string; mimeType: string }
  | { success: false; error: unknown }
> {
  try {
    // 1. Upload File
    const tempFile = tmp.fileSync({ postfix: path.extname(originalName) });
    fs.writeFileSync(tempFile.name, buffer);

    const uploadResult = await fileManager.uploadFile(tempFile.name, {
      mimeType,
      displayName: originalName
    });

    tempFile.removeCallback();

    const file = uploadResult.file;
    reportDebug({
      namespace,
      message: 'Uploaded file',
      data: { displayName: file.displayName, name: file.name }
    });

    reportDebug({
      namespace,
      message: 'Waiting for file processing...'
    });

    let geminiFile = await fileManager.getFile(file.name);
    while (geminiFile.state === 'PROCESSING') {
      process.stdout.write('.');
      await new Promise((resolve) => setTimeout(resolve, 10_000));
      geminiFile = await fileManager.getFile(file.name);
    }

    if (geminiFile.state !== 'ACTIVE') {
      const errorMessage = `File ${geminiFile.name} failed to process`;
      reportError(errorMessage);
      return { success: false, error: new Error(errorMessage) };
    }

    reportDebug({
      namespace,
      message: 'file ready...\n'
    });
    return {
      success: true,
      originalname: file.name,
      fileUri: file.uri,
      mimeType: file.mimeType
    };
  } catch (error) {
    reportError({
      namespace,
      message: 'Error during Gemini file upload and processing',
      error
    });
    return { success: false, error: error };
  }
}

export { uploadToGemini };
