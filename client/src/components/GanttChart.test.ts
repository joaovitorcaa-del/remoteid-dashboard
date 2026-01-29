import { describe, it, expect } from 'vitest';

/**
 * Helper function tests for GanttChart
 */

// Converte Story Points para duração em dias
const storyPointsToDays = (sp: number): number => {
  if (sp <= 3) return 0.5;
  if (sp <= 5) return 1;
  if (sp <= 8) return 2;
  if (sp <= 13) return 3;
  return Math.ceil(sp / 5);
};

// Calcula a data de fim baseada na data de início e duração
const calculateEndDate = (startDate: string, days: number): string => {
  const start = new Date(startDate);
  const end = new Date(start.getTime() + days * 24 * 60 * 60 * 1000);
  return end.toISOString().split('T')[0];
};

describe('GanttChart Helper Functions', () => {
  describe('storyPointsToDays', () => {
    it('should convert 2-3 SP to 0.5 days', () => {
      expect(storyPointsToDays(2)).toBe(0.5);
      expect(storyPointsToDays(3)).toBe(0.5);
    });

    it('should convert 5 SP to 1 day', () => {
      expect(storyPointsToDays(5)).toBe(1);
    });

    it('should convert 8 SP to 2 days', () => {
      expect(storyPointsToDays(8)).toBe(2);
    });

    it('should convert 13 SP to 3 days', () => {
      expect(storyPointsToDays(13)).toBe(3);
    });

    it('should convert larger SP values correctly', () => {
      expect(storyPointsToDays(20)).toBe(4);
      expect(storyPointsToDays(25)).toBe(5);
    });

    it('should handle edge cases', () => {
      expect(storyPointsToDays(1)).toBe(0.5);
      expect(storyPointsToDays(4)).toBe(1);
    });
  });

  describe('calculateEndDate', () => {
    it('should calculate end date for 0.5 days', () => {
      const startDate = '2026-01-29';
      const endDate = calculateEndDate(startDate, 0.5);
      expect(endDate).toBe('2026-01-29');
    });

    it('should calculate end date for 1 day', () => {
      const startDate = '2026-01-29';
      const endDate = calculateEndDate(startDate, 1);
      expect(endDate).toBe('2026-01-30');
    });

    it('should calculate end date for 2 days', () => {
      const startDate = '2026-01-29';
      const endDate = calculateEndDate(startDate, 2);
      expect(endDate).toBe('2026-01-31');
    });

    it('should calculate end date for 3 days', () => {
      const startDate = '2026-01-29';
      const endDate = calculateEndDate(startDate, 3);
      expect(endDate).toBe('2026-02-01');
    });

    it('should handle different start dates', () => {
      const startDate = '2026-02-01';
      const endDate = calculateEndDate(startDate, 1);
      expect(endDate).toBe('2026-02-02');
    });

    it('should handle month boundaries', () => {
      const startDate = '2026-01-31';
      const endDate = calculateEndDate(startDate, 1);
      expect(endDate).toBe('2026-02-01');
    });
  });

  describe('Integration: SP to Duration to End Date', () => {
    it('should convert SP to days and calculate end date', () => {
      const startDate = '2026-01-29';
      const sp = 5;
      const days = storyPointsToDays(sp);
      const endDate = calculateEndDate(startDate, days);
      expect(endDate).toBe('2026-01-30');
    });

    it('should handle complex SP values', () => {
      const startDate = '2026-01-29';
      const sp = 13;
      const days = storyPointsToDays(sp);
      const endDate = calculateEndDate(startDate, days);
      expect(endDate).toBe('2026-02-01');
    });
  });
});
