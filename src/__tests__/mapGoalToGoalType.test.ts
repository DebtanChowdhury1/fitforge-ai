import { mapGoalToGoalType } from '../types';

describe('mapGoalToGoalType', () => {
  it('maps fat_loss to weight_loss', () => {
    expect(mapGoalToGoalType('fat_loss')).toBe('weight_loss');
  });

  it('passes through muscle_gain unchanged', () => {
    expect(mapGoalToGoalType('muscle_gain')).toBe('muscle_gain');
  });

  it('passes through endurance unchanged', () => {
    expect(mapGoalToGoalType('endurance')).toBe('endurance');
  });

  it('passes through general_fitness unchanged', () => {
    expect(mapGoalToGoalType('general_fitness')).toBe('general_fitness');
  });
});
