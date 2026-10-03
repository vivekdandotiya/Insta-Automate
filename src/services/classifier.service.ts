import { AiClassifier } from './aiClassifier.js';
import { RuleClassifier } from './ruleClassifier.js';
import { OcrService } from './ocr.service.js';
import { JobClassificationResult } from './classifier.interface.js';
import { logger } from '../utils/logger.js';

export class ClassifierService {
  /**
   * Cost-Controlled Pipeline:
   * 1. Cheap keyword pre-filter check on caption
   * 2. If likely job post, perform OCR on image if available
   * 3. Run AI or Rule-based extraction
   */
  static async processContent(
    caption: string,
    mediaUrls: string[] = []
  ): Promise<JobClassificationResult> {
    // Quick cheap pre-filter (Requirement 34)
    const ruleQuickCheck = RuleClassifier.classify(caption, '');

    // If cheap check finds non-job post and no media images exist, short-circuit
    if (!ruleQuickCheck.isJobPost && mediaUrls.length === 0) {
      logger.info('[CLASSIFIER SERVICE] Pre-filter rejected non-job post without media. Saving API cost.');
      return ruleQuickCheck;
    }

    // OCR step if media is present
    let ocrText = '';
    if (mediaUrls.length > 0) {
      ocrText = await OcrService.extractTextFromImage(mediaUrls[0]);
    }

    // Full classification
    return AiClassifier.classify(caption, ocrText);
  }
}
