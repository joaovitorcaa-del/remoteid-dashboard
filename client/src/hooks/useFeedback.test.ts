import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFeedback } from './useFeedback';

describe('useFeedback Hook', () => {
  it('initializes with empty feedbacks array', () => {
    const { result } = renderHook(() => useFeedback());

    expect(result.current.feedbacks).toEqual([]);
  });

  it('adds success feedback', () => {
    const { result } = renderHook(() => useFeedback());

    act(() => {
      result.current.success('Sucesso!', 'Operação concluída');
    });

    expect(result.current.feedbacks).toHaveLength(1);
    expect(result.current.feedbacks[0]).toMatchObject({
      type: 'success',
      title: 'Sucesso!',
      message: 'Operação concluída',
    });
  });

  it('adds error feedback', () => {
    const { result } = renderHook(() => useFeedback());

    act(() => {
      result.current.error('Erro!', 'Algo deu errado');
    });

    expect(result.current.feedbacks).toHaveLength(1);
    expect(result.current.feedbacks[0]).toMatchObject({
      type: 'error',
      title: 'Erro!',
      message: 'Algo deu errado',
    });
  });

  it('adds warning feedback', () => {
    const { result } = renderHook(() => useFeedback());

    act(() => {
      result.current.warning('Aviso!', 'Cuidado com isso');
    });

    expect(result.current.feedbacks).toHaveLength(1);
    expect(result.current.feedbacks[0]).toMatchObject({
      type: 'warning',
      title: 'Aviso!',
      message: 'Cuidado com isso',
    });
  });

  it('adds info feedback', () => {
    const { result } = renderHook(() => useFeedback());

    act(() => {
      result.current.info('Informação', 'Apenas informativo');
    });

    expect(result.current.feedbacks).toHaveLength(1);
    expect(result.current.feedbacks[0]).toMatchObject({
      type: 'info',
      title: 'Informação',
      message: 'Apenas informativo',
    });
  });

  it('removes feedback by id', () => {
    const { result } = renderHook(() => useFeedback());

    let feedbackId: string;

    act(() => {
      feedbackId = result.current.success('Sucesso!');
    });

    expect(result.current.feedbacks).toHaveLength(1);

    act(() => {
      result.current.removeFeedback(feedbackId!);
    });

    expect(result.current.feedbacks).toHaveLength(0);
  });

  it('adds multiple feedbacks', () => {
    const { result } = renderHook(() => useFeedback());

    act(() => {
      result.current.success('Sucesso 1!');
      result.current.error('Erro 1!');
      result.current.warning('Aviso 1!');
    });

    expect(result.current.feedbacks).toHaveLength(3);
    expect(result.current.feedbacks[0].type).toBe('success');
    expect(result.current.feedbacks[1].type).toBe('error');
    expect(result.current.feedbacks[2].type).toBe('warning');
  });

  it('supports custom duration', () => {
    const { result } = renderHook(() => useFeedback());

    act(() => {
      result.current.success('Sucesso!', undefined, 10000);
    });

    expect(result.current.feedbacks[0].duration).toBe(10000);
  });

  it('generates unique ids for feedbacks', () => {
    const { result } = renderHook(() => useFeedback());

    let id1: string;
    let id2: string;

    act(() => {
      id1 = result.current.success('Sucesso 1!');
      id2 = result.current.success('Sucesso 2!');
    });

    expect(id1).not.toBe(id2);
    expect(result.current.feedbacks[0].id).toBe(id1);
    expect(result.current.feedbacks[1].id).toBe(id2);
  });

  it('addFeedback returns feedback id', () => {
    const { result } = renderHook(() => useFeedback());

    let feedbackId: string;

    act(() => {
      feedbackId = result.current.addFeedback('success', 'Sucesso!', 'Operação concluída');
    });

    expect(feedbackId).toBeDefined();
    expect(result.current.feedbacks[0].id).toBe(feedbackId);
  });

  it('supports feedback without message', () => {
    const { result } = renderHook(() => useFeedback());

    act(() => {
      result.current.success('Sucesso!');
    });

    expect(result.current.feedbacks[0]).toMatchObject({
      type: 'success',
      title: 'Sucesso!',
      message: undefined,
    });
  });

  it('clears all feedbacks when removing all', () => {
    const { result } = renderHook(() => useFeedback());

    let id1: string;
    let id2: string;

    act(() => {
      id1 = result.current.success('Sucesso 1!');
      id2 = result.current.error('Erro 1!');
    });

    expect(result.current.feedbacks).toHaveLength(2);

    act(() => {
      result.current.removeFeedback(id1!);
      result.current.removeFeedback(id2!);
    });

    expect(result.current.feedbacks).toHaveLength(0);
  });
});
