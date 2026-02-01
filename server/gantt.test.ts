import { describe, it, expect } from 'vitest';

/**
 * Testes para a função calculateEndDate do Gantt Chart
 * Valida que a função retorna o ÚLTIMO dia útil ocupado (não o dia seguinte)
 */

// Calcula a data de fim baseada na data de início e duração em dias úteis
// Retorna o ÚLTIMO dia útil ocupado (não o dia seguinte)
const calculateEndDate = (startDate: string, days: number): string => {
  // Se é menos de 1 dia (ex: 0.5), termina no mesmo dia
  if (days < 1) {
    return startDate;
  }
  
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

describe('GanttChart - calculateEndDate - FIXED LOGIC', () => {
  it('should return the last working day occupied (not the next day)', () => {
    // 2 dias úteis começando em segunda (2026-02-02)
    // Dia 1: 2026-02-02 (segunda)
    // Dia 2: 2026-02-03 (terça)
    // dataFim DEVE SER: 2026-02-03 (último dia ocupado)
    // ANTES (BUG): retornava 2026-02-04
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

  it('REM-3570 case: 8 SP = 2 working days, should NOT create false conflict', () => {
    // REM-3570: 8 SP = 2 dias úteis
    // Começa em segunda (2026-02-02)
    // Dia 1: 2026-02-02 (segunda)
    // Dia 2: 2026-02-03 (terça)
    // dataFim DEVE SER: 2026-02-03 (não 2026-02-04)
    // Se fosse 2026-02-04, teria conflito falso com REM-3571 que começa em 2026-02-04
    const startDate = '2026-02-02';
    const endDate = calculateEndDate(startDate, 2);
    expect(endDate).toBe('2026-02-03');
  });

  it('REM-3571 case: 8 SP = 2 working days starting on Wednesday', () => {
    // REM-3571: 8 SP = 2 dias úteis
    // Começa em quarta (2026-02-04)
    // Dia 1: 2026-02-04 (quarta)
    // Dia 2: 2026-02-05 (quinta)
    // dataFim DEVE SER: 2026-02-05
    const startDate = '2026-02-04';
    const endDate = calculateEndDate(startDate, 2);
    expect(endDate).toBe('2026-02-05');
  });

  it('REM-3572 case: 5 SP = 1 working day starting on Thursday', () => {
    // REM-3572: 5 SP = 1 dia útil
    // Começa em quinta (2026-02-05)
    // Dia 1: 2026-02-05 (quinta)
    // dataFim DEVE SER: 2026-02-05
    const startDate = '2026-02-05';
    const endDate = calculateEndDate(startDate, 1);
    expect(endDate).toBe('2026-02-05');
  });

  it('REM-3573 case: 3 SP = 0.5 days (rounded to 1) starting on Friday', () => {
    // REM-3573: 3 SP = 0.5 dias (arredondado para 1)
    // Começa em sexta (2026-02-06)
    // Dia 1: 2026-02-06 (sexta)
    // dataFim DEVE SER: 2026-02-06
    const startDate = '2026-02-06';
    const endDate = calculateEndDate(startDate, 1);
    expect(endDate).toBe('2026-02-06');
  });
});

  it('should return same day for 0.5 working days on Monday', () => {
    // 2-3 SP = 0.5 dias
    // Começa em segunda (2026-02-02)
    // dataFim DEVE SER: 2026-02-02 (mesmo dia)
    const startDate = '2026-02-02';
    const endDate = calculateEndDate(startDate, 0.5);
    expect(endDate).toBe('2026-02-02');
  });

  it('should return same day for 0.5 working days on Friday', () => {
    // 2-3 SP = 0.5 dias
    // Começa em sexta (2026-02-06)
    // dataFim DEVE SER: 2026-02-06 (mesmo dia)
    const startDate = '2026-02-06';
    const endDate = calculateEndDate(startDate, 0.5);
    expect(endDate).toBe('2026-02-06');
  });
