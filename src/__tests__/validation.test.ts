import {
  validateBodyWeight,
  validateWeightGoal,
  validateWorkoutFrequency,
  validateSleepGoal,
} from '../lib/validation/healthGoals';

describe('validateBodyWeight', () => {
  it('accepts a normal weight in kg', () => {
    expect(validateBodyWeight(75).valid).toBe(true);
  });

  it('rejects weight below minimum (20 kg)', () => {
    expect(validateBodyWeight(15).valid).toBe(false);
  });

  it('rejects weight above maximum (500 kg)', () => {
    expect(validateBodyWeight(501).valid).toBe(false);
  });

  it('rejects NaN', () => {
    expect(validateBodyWeight(NaN).valid).toBe(false);
  });

  it('rejects zero', () => {
    expect(validateBodyWeight(0).valid).toBe(false);
  });
});

describe('validateWeightGoal', () => {
  it('accepts a modest weight loss target', () => {
    expect(validateWeightGoal(80, 75).valid).toBe(true);
  });

  it('rejects extreme deficit (>40% body weight)', () => {
    expect(validateWeightGoal(100, 50).valid).toBe(false);
  });

  it('accepts a muscle gain target', () => {
    expect(validateWeightGoal(70, 75).valid).toBe(true);
  });

  it('rejects goal weight below 40 kg', () => {
    expect(validateWeightGoal(80, 35).valid).toBe(false);
  });

  it('warns on aggressive weekly rate with timeframe', () => {
    const result = validateWeightGoal(80, 60, 4); // 5 kg/week — too fast
    expect(result.valid).toBe(false);
  });
});

describe('validateWorkoutFrequency', () => {
  it('accepts 4 days per week', () => {
    expect(validateWorkoutFrequency(4).valid).toBe(true);
  });

  it('rejects 0 days', () => {
    expect(validateWorkoutFrequency(0).valid).toBe(false);
  });

  it('rejects more than 7 days', () => {
    expect(validateWorkoutFrequency(8).valid).toBe(false);
  });

  it('accepts 7 days with low intensity', () => {
    expect(validateWorkoutFrequency(7, 'low').valid).toBe(true);
  });
});

describe('validateSleepGoal', () => {
  it('accepts 8 hours', () => {
    expect(validateSleepGoal(8).valid).toBe(true);
  });

  it('rejects less than 4 hours as error', () => {
    const result = validateSleepGoal(3);
    expect(result.valid).toBe(false);
    expect(result.severity).toBe('error');
  });

  it('returns warning for 5 hours (below recommended)', () => {
    const result = validateSleepGoal(5);
    expect(result.valid).toBe(true);
    expect(result.severity).toBe('warning');
  });

  it('rejects zero hours', () => {
    expect(validateSleepGoal(0).valid).toBe(false);
  });
});
