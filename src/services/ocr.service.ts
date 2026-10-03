import { createWorker } from 'tesseract.js';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

export class OcrService {
  /**
   * Extract text from image URL using Tesseract.js OCR engine
   */
  static async extractTextFromImage(imageUrl: string): Promise<string> {
    if (!config.ocrEnabled || !imageUrl) {
      return '';
    }

    logger.info(`[OCR SERVICE] Processing image for text extraction: ${imageUrl.substring(0, 60)}...`);

    let worker;
    try {
      worker = await createWorker('eng');
      const ret = await worker.recognize(imageUrl);
      await worker.terminate();

      const extractedText = ret.data.text.trim();
      logger.info(`[OCR SERVICE] OCR extraction complete (${extractedText.length} characters extracted)`);
      return extractedText;
    } catch (error: any) {
      logger.error(`[OCR SERVICE] OCR recognition error: ${error.message}`);
      if (worker) {
        try {
          await worker.terminate();
        } catch (_) {}
      }
      return '';
    }
  }
}
