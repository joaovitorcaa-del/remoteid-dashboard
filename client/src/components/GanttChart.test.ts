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

// Calcula a data de fim baseada na data de início e duração em dias úteis
// Retorna o ÚLTIMO dia útil ocupado (não o dia seguinte)
const calculateEndDate = (startDate: string, days: number): string => {
  const start = new Date(startDate + 'T00:00:00Z');
  let current = new Date(start);
  let daysAdded = 0;
  
  while (daysAdded < days) {
    const dayOfWeek = current.getUTCDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      daysAdded++;
      if (daysAdded === days) {
        return current.toISOString().split('T')[0];
      }
    }
    current.setUTCDate(current.getUTCDate() + 1);
  }
  
  return current.toISOString().split('T')[0];
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

  describe('calculateEndDate - NEW LOGIC: returns last working day occupied', () => {
    it('should return the last working day occupied (not the next day)', () => {
      // 2 dias úteis começando em segunda (2026-02-02)
      // Dia 1: 2026-02-02 (segunda)
      // Dia 2: 2026-02-03 (terça)
      // dataFim DEVE SER: 2026-02-03 (último dia ocupado)
      const startDate = '2026-02-02';
      const endDate = calculateEndDate(startDate, 2);
      expect(endDate).toBe('2026-02-03');
    });

    it('should skip weekends correctly', () => {
      // Começa em sexta (2026-02-06)
      // Dia 1: 2026-02-06 (sexta)
      // Dia 2: 2026-02-09 (segunda, pulando sábado e domingo)
      const startDate = '2026-02-06';
      const endDate = calculateEndDate(startDate, 2);
      expect(endDate).toBe('2026-02-09');
    });

    it('should return the same day for 1 working day', () => {
      // 1 dia útil começando em segunda
      // Dia 1: 2026-02-02 (segunda)
      const startDate = '2026-02-02';
      const endDate = calculateEndDate(startDate, 1);
      expect(endDate).toBe('2026-02-02');
    });

    it('should calculate correctly for 3 working days', () => {
      // Começa em segunda (2026-02-02)
      // Dia 1: 2026-02-02 (segunda)
      // Dia 2: 2026-02-03 (terça)
      // Dia 3: 2026-02-04 (quarta)
      const startDate = '2026-02-02';
      const endDate = calculateEndDate(startDate, 3);
      expect(endDate).toBe('2026-02-04');
    });

    it('should skip a complete weekend', () => {
      // Começa em quinta (2026-02-05)
      // Dia 1: 2026-02-05 (quinta)
      // Dia 2: 2026-02-06 (sexta)
      // Dia 3: 2026-02-09 (segunda, pulando sábado e domingo)
      // Dia 4: 2026-02-10 (terça)
      const startDate = '2026-02-05';
      const endDate = calculateEndDate(startDate, 4);
      expect(endDate).toBe('2026-02-10');
    });
  });

  describe('Integration: SP to Duration to End Date', () => {
    it('should convert SP to days and calculate end date', () => {
      const startDate = '2026-02-02';
      const sp = 5;
      const days = storyPointsToDays(sp);
      const endDate = calculateEndDate(startDate, days);
      expect(endDate).toBe('2026-02-02');
    });

    it('should handle complex SP values', () => {
      const startDate = '2026-02-02';
      const sp = 13;
      const days = storyPointsToDays(sp);
      const endDate = calculateEndDate(startDate, days);
      expect(endDate).toBe('2026-02-04');
    });

    it('REM-3570 case: 8 SP starting on Monday', () => {
      // REM-3570: 8 SP = 2 dias úteis
      // Começa em segunda (2026-02-02)
      // Dia 1: 2026-02-02 (segunda)
      // Dia 2: 2026-02-03 (terça)
      // dataFim DEVE SER: 2026-02-03 (não 2026-02-04)
      const startDate = '2026-02-02';
      const sp = 8;
      const days = storyPointsToDays(sp);
      const endDate = calculateEndDate(startDate, days);
      expect(endDate).toBe('2026-02-03');
    });
  });
});
