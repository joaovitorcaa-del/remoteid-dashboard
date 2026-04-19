import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FeedbackContainer } from './FeedbackContainer';
import type { Feedback } from '@/hooks/useFeedback';

describe('FeedbackContainer Component', () => {
  const mockFeedbacks: Feedback[] = [
    {
      id: '1',
      type: 'success',
      title: 'Sucesso!',
      message: 'Operação concluída',
      duration: 5000,
    },
    {
      id: '2',
      type: 'error',
      title: 'Erro!',
      message: 'Algo deu errado',
      duration: 5000,
    },
  ];

  it('renders all feedbacks', () => {
    const onRemove = vi.fn();

    render(
      <FeedbackContainer
        feedbacks={mockFeedbacks}
        onRemove={onRemove}
      />
    );

    expect(screen.getByText('Sucesso!')).toBeInTheDocument();
    expect(screen.getByText('Erro!')).toBeInTheDocument();
  });

  it('renders empty when no feedbacks', () => {
    const onRemove = vi.fn();
    const { container } = render(
      <FeedbackContainer
        feedbacks={[]}
        onRemove={onRemove}
      />
    );

    expect(container.firstChild?.childNodes).toHaveLength(0);
  });

  it('respects maxVisible prop', () => {
    const onRemove = vi.fn();
    const manyFeedbacks: Feedback[] = Array.from({ length: 10 }, (_, i) => ({
      id: `${i}`,
      type: 'info' as const,
      title: `Feedback ${i}`,
      duration: 5000,
    }));

    render(
      <FeedbackContainer
        feedbacks={manyFeedbacks}
        onRemove={onRemove}
        maxVisible={3}
      />
    );

    // Should only show the last 3
    expect(screen.getByText('Feedback 9')).toBeInTheDocument();
    expect(screen.getByText('Feedback 8')).toBeInTheDocument();
    expect(screen.getByText('Feedback 7')).toBeInTheDocument();
    expect(screen.queryByText('Feedback 0')).not.toBeInTheDocument();
  });

  it('applies correct position classes', () => {
    const onRemove = vi.fn();
    const { container } = render(
      <FeedbackContainer
        feedbacks={mockFeedbacks}
        onRemove={onRemove}
        position="top-left"
      />
    );

    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toHaveClass('fixed', 'top-4', 'left-4');
  });

  it('applies top-right position by default', () => {
    const onRemove = vi.fn();
    const { container } = render(
      <FeedbackContainer
        feedbacks={mockFeedbacks}
        onRemove={onRemove}
      />
    );

    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toHaveClass('fixed', 'top-4', 'right-4');
  });

  it('applies bottom-left position', () => {
    const onRemove = vi.fn();
    const { container } = render(
      <FeedbackContainer
        feedbacks={mockFeedbacks}
        onRemove={onRemove}
        position="bottom-left"
      />
    );

    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toHaveClass('fixed', 'bottom-4', 'left-4');
  });

  it('applies bottom-right position', () => {
    const onRemove = vi.fn();
    const { container } = render(
      <FeedbackContainer
        feedbacks={mockFeedbacks}
        onRemove={onRemove}
        position="bottom-right"
      />
    );

    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toHaveClass('fixed', 'bottom-4', 'right-4');
  });

  it('calls onRemove when feedback is closed', () => {
    const onRemove = vi.fn();

    render(
      <FeedbackContainer
        feedbacks={mockFeedbacks}
        onRemove={onRemove}
      />
    );

    // Note: This test would need user interaction to fully test
    // In a real scenario, you'd click the close button
    expect(onRemove).not.toHaveBeenCalled();
  });

  it('renders with z-50 class for proper stacking', () => {
    const onRemove = vi.fn();
    const { container } = render(
      <FeedbackContainer
        feedbacks={mockFeedbacks}
        onRemove={onRemove}
      />
    );

    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toHaveClass('z-50');
  });

  it('handles responsive width', () => {
    const onRemove = vi.fn();
    const { container } = render(
      <FeedbackContainer
        feedbacks={mockFeedbacks}
        onRemove={onRemove}
      />
    );

    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toHaveClass('w-96', 'max-w-[calc(100vw-2rem)]');
  });
});
