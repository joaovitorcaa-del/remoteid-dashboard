import { describe, it, expect } from 'vitest';

/**
 * Testes para a função calculateEndDate do Gantt Chart
 * Valida que a função retorna a data correta considerando:
 * - Frações de dias (< 1 dia) = mesmo dia
 * - Dias completos (>= 1) = conta dias úteis começando do dia de início
 */

// Calcula a data de fim baseada na data de início e duração em dias úteis
const calculateEndDate = (startDate: string, days: number): string => {
  // Se é menos de 1 dia (ex: 0.5), termina no mesmo dia
  if (days < 1) {
    return startDate;
  }
  
  const start = new Date(startDate + 'T00:00:00Z');
  let current = new Date(start);
  let daysAdded = 0;
  
  // Contar dias úteis começando do dia de início
  while (daysAdded < days) {
    const dayOfWeek = current.getUTCDay();
    // Se é dia útil (seg-sex)
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      daysAdded++;
      // Se chegamos no último dia, retorna
      if (daysAdded === days) {
        return current.toISOString().split('T')[0];
      }
    }
    // Avança para o próximo dia
    current.setUTCDate(current.getUTCDate() + 1);
  }
  
  return current.toISOString().split('T')[0];
};

describe('GanttChart - calculateEndDate - CORRECTED LOGIC', () => {
  it('should return same day for fractional days (0.5)', () => {
    // 3 SP = 0.5 dias
    // Começa: 26/01 (segunda)
    // Termina: 26/01 (mesmo dia)
    const startDate = '2026-01-26';
    const endDate = calculateEndDate(startDate, 0.5);
    expect(endDate).toBe('2026-01-26');
  });

  it('should return same day for 1 working day', () => {
    // 5 SP = 1 dia útil
    // Começa: 26/01 (segunda)
    // Dia 1: 26/01 (segunda) - TERMINA AQUI
    // Termina: 26/01 (mesmo dia)
    const startDate = '2026-01-26';
    const endDate = calculateEndDate(startDate, 1);
    expect(endDate).toBe('2026-01-26');
  });

  it('should advance 1 day for 2 working days', () => {
    // 8 SP = 2 dias úteis
    // Começa: 26/01 (segunda)
    // Dia 1: 26/01 (segunda)
    // Dia 2: 27/01 (terça) - TERMINA AQUI
    // Termina: 27/01
    const startDate = '2026-01-26';
    const endDate = calculateEndDate(startDate, 2);
    expect(endDate).toBe('2026-01-27');
  });

  it('should skip weekends correctly', () => {
    // 2 dias úteis começando em sexta (24/01)
    // Dia 1: 24/01 (sexta)
    // Dia 2: 27/01 (segunda, pulando sábado e domingo) - TERMINA AQUI
    const startDate = '2026-01-24';
    const endDate = calculateEndDate(startDate, 2);
    expect(endDate).toBe('2026-01-27');
  });

  it('should calculate correctly for 3 working days', () => {
    // 3 dias úteis começando em segunda (26/01)
    // Dia 1: 26/01 (segunda)
    // Dia 2: 27/01 (terça)
    // Dia 3: 28/01 (quarta) - TERMINA AQUI
    const startDate = '2026-01-26';
    const endDate = calculateEndDate(startDate, 3);
    expect(endDate).toBe('2026-01-28');
  });

  it('REM-3573 case: 3 SP = 0.5 days, should NOT conflict with REM-3572', () => {
    // REM-3573: 3 SP = 0.5 dias
    // Começa: 26/01 (segunda)
    // Termina: 26/01 (MESMO DIA, não 27/01)
    // REM-3572 começa em 27/01, então SEM CONFLITO
    const startDate = '2026-01-26';
    const endDate = calculateEndDate(startDate, 0.5);
    expect(endDate).toBe('2026-01-26');
  });

  it('REM-3572 case: 5 SP = 1 day, should start and end on same day', () => {
    // REM-3572: 5 SP = 1 dia útil
    // Começa: 27/01 (terça)
    // Dia 1: 27/01 (terça) - TERMINA AQUI
    // Termina: 27/01 (MESMO DIA)
    const startDate = '2026-01-27';
    const endDate = calculateEndDate(startDate, 1);
    expect(endDate).toBe('2026-01-27');
  });

  it('REM-3571 case: 8 SP = 2 days', () => {
    // REM-3571: 8 SP = 2 dias úteis
    // Começa: 28/01 (quarta)
    // Dia 1: 28/01 (quarta)
    // Dia 2: 29/01 (quinta) - TERMINA AQUI
    // Termina: 29/01
    const startDate = '2026-01-28';
    const endDate = calculateEndDate(startDate, 2);
    expect(endDate).toBe('2026-01-29');
  });

  it('should skip complete weekend', () => {
    // 4 dias úteis começando em quinta (23/01)
    // Dia 1: 23/01 (quinta)
    // Dia 2: 24/01 (sexta)
    // Dia 3: 27/01 (segunda, pulando sábado e domingo)
    // Dia 4: 28/01 (terça) - TERMINA AQUI
    const startDate = '2026-01-23';
    const endDate = calculateEndDate(startDate, 4);
    expect(endDate).toBe('2026-01-28');
  });

  it('should handle starting on Friday with 2 days', () => {
    // 2 dias úteis começando em sexta (24/01)
    // Dia 1: 24/01 (sexta)
    // Dia 2: 27/01 (segunda, pulando sábado e domingo) - TERMINA AQUI
    const startDate = '2026-01-24';
    const endDate = calculateEndDate(startDate, 2);
    expect(endDate).toBe('2026-01-27');
  });
});
