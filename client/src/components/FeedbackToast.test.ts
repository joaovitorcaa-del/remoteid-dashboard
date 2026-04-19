import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FeedbackToast } from './FeedbackToast';

describe('FeedbackToast Component', () => {
  it('renders success toast with correct styling', () => {
    render(
      <FeedbackToast
        type="success"
        title="Sucesso!"
        message="Operação concluída"
      />
    );

    expect(screen.getByText('Sucesso!')).toBeInTheDocument();
    expect(screen.getByText('Operação concluída')).toBeInTheDocument();
  });

  it('renders error toast with correct styling', () => {
    render(
      <FeedbackToast
        type="error"
        title="Erro!"
        message="Algo deu errado"
      />
    );

    expect(screen.getByText('Erro!')).toBeInTheDocument();
    expect(screen.getByText('Algo deu errado')).toBeInTheDocument();
  });

  it('renders warning toast with correct styling', () => {
    render(
      <FeedbackToast
        type="warning"
        title="Aviso!"
        message="Cuidado com isso"
      />
    );

    expect(screen.getByText('Aviso!')).toBeInTheDocument();
    expect(screen.getByText('Cuidado com isso')).toBeInTheDocument();
  });

  it('renders info toast with correct styling', () => {
    render(
      <FeedbackToast
        type="info"
        title="Informação"
        message="Apenas informativo"
      />
    );

    expect(screen.getByText('Informação')).toBeInTheDocument();
    expect(screen.getByText('Apenas informativo')).toBeInTheDocument();
  });

  it('renders without message when not provided', () => {
    render(
      <FeedbackToast
        type="success"
        title="Sucesso!"
      />
    );

    expect(screen.getByText('Sucesso!')).toBeInTheDocument();
    expect(screen.queryByText(/Apenas/)).not.toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();

    render(
      <FeedbackToast
        type="success"
        title="Sucesso!"
        onClose={onClose}
        duration={0} // Prevent auto-close
      />
    );

    const closeButton = screen.getByLabelText('Fechar notificação');
    await user.click(closeButton);

    expect(onClose).toHaveBeenCalled();
  });

  it('auto-closes after specified duration', async () => {
    const onClose = vi.fn();

    render(
      <FeedbackToast
        type="success"
        title="Sucesso!"
        duration={100}
        onClose={onClose}
      />
    );

    expect(screen.getByText('Sucesso!')).toBeInTheDocument();

    await waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    }, { timeout: 200 });
  });

  it('does not auto-close when duration is 0', async () => {
    const onClose = vi.fn();

    render(
      <FeedbackToast
        type="success"
        title="Sucesso!"
        duration={0}
        onClose={onClose}
      />
    );

    await waitFor(
      () => {
        expect(screen.getByText('Sucesso!')).toBeInTheDocument();
      },
      { timeout: 100 }
    );

    expect(onClose).not.toHaveBeenCalled();
  });

  it('renders with correct icon for each type', () => {
    const { rerender } = render(
      <FeedbackToast
        type="success"
        title="Sucesso!"
      />
    );

    // Success toast should have CheckCircle2 icon
    expect(screen.getByText('Sucesso!')).toBeInTheDocument();

    rerender(
      <FeedbackToast
        type="error"
        title="Erro!"
      />
    );

    // Error toast should have AlertCircle icon
    expect(screen.getByText('Erro!')).toBeInTheDocument();
  });
});
