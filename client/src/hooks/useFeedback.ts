import { useState, useCallback } from 'react';
import { FeedbackType } from '@/components/FeedbackToast';

export interface Feedback {
  id: string;
  type: FeedbackType;
  title: string;
  message?: string;
  duration?: number;
}

export function useFeedback() {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);

  const addFeedback = useCallback((
    type: FeedbackType,
    title: string,
    message?: string,
    duration: number = 5000
  ) => {
    const id = `feedback-${Date.now()}-${Math.random()}`;
    const feedback: Feedback = { id, type, title, message, duration };
    
    setFeedbacks(prev => [...prev, feedback]);
    
    return id;
  }, []);

  const removeFeedback = useCallback((id: string) => {
    setFeedbacks(prev => prev.filter(f => f.id !== id));
  }, []);

  const success = useCallback((title: string, message?: string, duration?: number) => {
    return addFeedback('success', title, message, duration);
  }, [addFeedback]);

  const error = useCallback((title: string, message?: string, duration?: number) => {
    return addFeedback('error', title, message, duration);
  }, [addFeedback]);

  const warning = useCallback((title: string, message?: string, duration?: number) => {
    return addFeedback('warning', title, message, duration);
  }, [addFeedback]);

  const info = useCallback((title: string, message?: string, duration?: number) => {
    return addFeedback('info', title, message, duration);
  }, [addFeedback]);

  return {
    feedbacks,
    addFeedback,
    removeFeedback,
    success,
    error,
    warning,
    info,
  };
}
