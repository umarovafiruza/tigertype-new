/**
 * High-accuracy typing calculation metrics conforming to standard typing speed rules (Monkeytype standard).
 * Standard: 1 word = 5 characters (including spaces).
 */

export class Metrics {
  /**
   * Calculate Gross Words Per Minute (Raw WPM)
   * Counts every typed character (correct, incorrect, extra, spaces)
   * @param {number} totalChars - Total characters typed
   * @param {number} timeInSeconds - Elapsed time in seconds
   */
  static getGrossWPM(totalChars, timeInSeconds) {
    if (timeInSeconds <= 0 || totalChars <= 0) return 0;
    const minutes = timeInSeconds / 60;
    return Math.round((totalChars / 5) / minutes);
  }

  /**
   * Calculate Net Words Per Minute conforming to standard typing speed rules.
   * Net WPM only counts accurately typed characters (letters + valid spaces).
   * Supports either (correctChars, timeInSeconds) or (totalChars, uncorrectedErrors, timeInSeconds).
   * @param {number} correctCharsOrTotal - Number of correct characters, or total characters
   * @param {number} errorsOrTime - Uncorrected errors (if 3 args) or time in seconds (if 2 args)
   * @param {number} [optionalTime] - Time in seconds (if 3 args)
   */
  static getNetWPM(correctCharsOrTotal, errorsOrTime, optionalTime) {
    let correctChars = 0;
    let timeInSeconds = 0;

    if (optionalTime !== undefined) {
      // 3 arguments: (totalChars, uncorrectedErrors, timeInSeconds)
      correctChars = Math.max(0, correctCharsOrTotal - errorsOrTime);
      timeInSeconds = optionalTime;
    } else {
      // 2 arguments: (correctChars, timeInSeconds)
      correctChars = Math.max(0, correctCharsOrTotal);
      timeInSeconds = errorsOrTime;
    }

    if (timeInSeconds <= 0 || correctChars <= 0) return 0;
    const minutes = timeInSeconds / 60;
    return Math.round((correctChars / 5) / minutes);
  }

  /**
   * Calculate Characters Per Minute (CPM)
   * Standard typing definition: CPM = (correctChars / minutes) = Net WPM * 5
   * @param {number} correctChars 
   * @param {number} timeInSeconds 
   */
  static getCPM(correctChars, timeInSeconds) {
    if (timeInSeconds <= 0 || correctChars <= 0) return 0;
    const minutes = timeInSeconds / 60;
    return Math.round(correctChars / minutes);
  }

  /**
   * Calculate Accuracy Percentage conforming to standard typing metrics (Monkeytype):
   * accuracy = (correct / (correct + errors)) * 100
   * @param {number} correctChars - Number of correct characters typed
   * @param {number} totalErrorsOrTotalChars - Total errors made, or total characters attempted
   */
  static getAccuracy(correctChars, totalErrorsOrTotalChars) {
    if (correctChars <= 0 && totalErrorsOrTotalChars <= 0) return 100;
    if (correctChars <= 0) return 0;

    let total = 0;
    if (totalErrorsOrTotalChars >= correctChars && totalErrorsOrTotalChars > 0) {
      // Passed as total keystrokes (e.g. 47 where correct is 45)
      total = totalErrorsOrTotalChars;
    } else {
      // Passed as error count (e.g. 2 where correct is 45)
      total = correctChars + Math.max(0, totalErrorsOrTotalChars);
    }

    if (total <= 0) return 100;
    const acc = (correctChars / total) * 100;
    return Math.min(100, Math.max(0, Math.round(acc * 10) / 10));
  }

  /**
   * Calculate Consistency Percentage based on standard deviation of timeline samples
   * @param {Array<number>} speedSamples - Array of WPM recorded each second
   */
  static getConsistency(speedSamples) {
    if (!speedSamples || speedSamples.length < 2) return 100;
    
    // Filter out initial 0 samples if any
    const valid = speedSamples.filter(s => s > 0);
    if (valid.length < 2) return 100;

    const mean = valid.reduce((acc, v) => acc + v, 0) / valid.length;
    if (mean === 0) return 100;

    const variance = valid.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / valid.length;
    const stdDev = Math.sqrt(variance);

    // Coefficient of variation: (stdDev / mean) * 100
    // Consistency % = 100 - CV%
    const cv = (stdDev / mean) * 100;
    const consistency = Math.max(0, Math.min(100, 100 - cv));
    return Math.round(consistency);
  }
}
