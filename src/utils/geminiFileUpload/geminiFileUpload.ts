import { GoogleAIFileManager } from '@google/generative-ai/server';
import fs from 'fs';
import path from 'path';
import tmp from 'tmp';
import { reportError, reportDebug } from 'utils/report';

const namespace = 'engine:utils:geminiFileUpload';

const fileManager = new GoogleAIFileManager(process.env.GOOGLE_AI_KEY || '');

export async function geminiFileUpload(
  buffer: Buffer,
  mimeType: string,
  originalName: string
): Promise<
  | { success: true; originalname: string; fileUri: string; mimeType: string }
  | { success: false; error: unknown }
> {
  let tempFile;
  try {
    // 1. Create Temp File
    tempFile = tmp.fileSync({ postfix: path.extname(originalName) });
    fs.writeFileSync(tempFile.name, buffer);

    // 2. Upload File
    const uploadResult = await fileManager.uploadFile(tempFile.name, {
      mimeType,
      displayName: originalName
    });

    if (!uploadResult || !uploadResult.file) {
      throw new Error('Upload failed: No file returned');
    }

    const file = uploadResult.file;
    reportDebug({
      namespace,
      message: 'Uploaded file successfully',
      data: { displayName: file.displayName, name: file.name }
    });

    reportDebug({
      namespace,
      message: 'Waiting for file processing...'
    });

    // 3. Poll Until File is Processed
    let geminiFile = await fileManager.getFile(file.name);
    while (geminiFile?.state === 'PROCESSING') {
      process.stdout.write('.');
      await new Promise((resolve) => setTimeout(resolve, 10000));
      geminiFile = await fileManager.getFile(file.name);
    }

    if (!geminiFile || geminiFile.state !== 'ACTIVE') {
      const errorMessage = `File processing failed for ${file.name}`;
      reportError(errorMessage);
      return { success: false, error: new Error(errorMessage) };
    }

    reportDebug({
      namespace,
      message: 'File is ready'
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
    return { success: false, error };
  } finally {
    // Ensure cleanup of temp file
    if (tempFile) {
      try {
        tempFile.removeCallback();
      } catch (cleanupError) {
        reportError({
          namespace,
          message: 'Error cleaning up temp file',
          error: cleanupError
        });
      }
    }
  }
}
