export type ValidationSeverity = 'ok' | 'warning' | 'error';

export interface ValidationResult {
  valid: boolean;
  severity: ValidationSeverity;
  message?: string;
  suggestedValue?: number;
}

export function validateBodyWeight(weightKg: number): ValidationResult {
  if (!isFinite(weightKg) || weightKg <= 0) {
    return { valid: false, severity: 'error', message: 'Weight must be a positive number.' };
  }
  if (weightKg < 20) {
    return { valid: false, severity: 'error', message: `${weightKg} kg is below any plausible adult body weight.` };
  }
  if (weightKg > 500) {
    return { valid: false, severity: 'error', message: `${weightKg} kg is not a realistic body weight. Check your entry.` };
  }
  return { valid: true, severity: 'ok' };
}

/**
 * Validate a weight goal.
 * currentKg and goalKg must always be in kg regardless of display units.
 * timeframeWeeks is optional — if provided, the implied weekly rate is also checked.
 */
export function validateWeightGoal(
  currentKg: number,
  goalKg: number,
  timeframeWeeks?: number,
): ValidationResult {
  const curCheck = validateBodyWeight(currentKg);
  if (!curCheck.valid) return { ...curCheck, message: `Current weight — ${curCheck.message}` };

  const goalCheck = validateBodyWeight(goalKg);
  if (!goalCheck.valid) return { ...goalCheck, message: `Goal weight — ${goalCheck.message}` };

  if (goalKg < 40) {
    return {
      valid: false,
      severity: 'error',
      message: `A goal weight of ${goalKg} kg is below safe ranges for adults. Most healthy adults weigh at least 45-55 kg.`,
      suggestedValue: Math.max(Math.round(currentKg * 0.75), 45),
    };
  }

  const lossRatio = (currentKg - goalKg) / currentKg;
  if (goalKg < currentKg && lossRatio > 0.40) {
    const suggested = Math.round(currentKg * 0.78);
    return {
      valid: false,
      severity: 'error',
      message: `Losing ${Math.round(lossRatio * 100)}% of body weight (${(currentKg - goalKg).toFixed(1)} kg) is outside safe planning ranges. Sustainable fat loss is 0.5-1 kg/week. A realistic initial target might be around ${suggested} kg.`,
      suggestedValue: suggested,
    };
  }

  if (timeframeWeeks && timeframeWeeks > 0 && goalKg < currentKg) {
    const kgToLose = currentKg - goalKg;
    const weeklyRate = kgToLose / timeframeWeeks;
    if (weeklyRate > 1.5) {
      const suggestedWeeks = Math.ceil(kgToLose / 0.8);
      return {
        valid: false,
        severity: 'error',
        message: `Losing ${kgToLose.toFixed(1)} kg in ${timeframeWeeks} weeks requires ${weeklyRate.toFixed(1)} kg/week — above safe limits (0.5-1 kg/week). A safer pace needs about ${suggestedWeeks} weeks.`,
        suggestedValue: suggestedWeeks,
      };
    }
    if (weeklyRate > 1.0) {
      const suggestedWeeks = Math.ceil(kgToLose / 0.75);
      return {
        valid: true,
        severity: 'warning',
        message: `${weeklyRate.toFixed(1)} kg/week is at the upper edge of sustainable. ${suggestedWeeks} weeks would give a healthier pace.`,
        suggestedValue: suggestedWeeks,
      };
    }
  }

  return { valid: true, severity: 'ok' };
}

export function validateWorkoutFrequency(
  daysPerWeek: number,
  intensity?: 'low' | 'moderate' | 'high',
): ValidationResult {
  if (!isFinite(daysPerWeek) || daysPerWeek < 1) {
    return { valid: false, severity: 'error', message: 'Training frequency must be at least 1 day per week.' };
  }
  if (daysPerWeek > 7) {
    return { valid: false, severity: 'error', message: 'Training frequency cannot exceed 7 days per week.' };
  }
  if (daysPerWeek >= 6 && intensity === 'high') {
    return {
      valid: true,
      severity: 'warning',
      message: '6-7 days at high intensity raises overtraining risk. 4-5 days with planned recovery is typically more effective.',
      suggestedValue: 5,
    };
  }
  return { valid: true, severity: 'ok' };
}

export function validateSleepGoal(hours: number): ValidationResult {
  if (!isFinite(hours) || hours <= 0) {
    return { valid: false, severity: 'error', message: 'Sleep goal must be a positive number.' };
  }
  if (hours < 4) {
    return {
      valid: false,
      severity: 'error',
      message: `${hours} hours is dangerously below safe sleep for adults. 7-9 hours is recommended for recovery.`,
      suggestedValue: 7,
    };
  }
  if (hours < 6) {
    return {
      valid: true,
      severity: 'warning',
      message: `${hours} hours is below recommended recovery sleep (7-9 hours). Chronic sleep restriction limits training adaptation.`,
      suggestedValue: 7,
    };
  }
  if (hours > 12) {
    return {
      valid: true,
      severity: 'warning',
      message: `${hours} hours regularly is above typical adult needs (7-9 hours) and may signal an underlying issue.`,
    };
  }
  return { valid: true, severity: 'ok' };
}
