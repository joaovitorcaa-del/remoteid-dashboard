import { Feedback } from '@/hooks/useFeedback';
import FeedbackToast from '@/components/FeedbackToast';

interface FeedbackContainerProps {
  feedbacks: Feedback[];
  onRemove: (id: string) => void;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  maxVisible?: number;
}

const positionClasses = {
  'top-left': 'fixed top-4 left-4 z-50',
  'top-right': 'fixed top-4 right-4 z-50',
  'bottom-left': 'fixed bottom-4 left-4 z-50',
  'bottom-right': 'fixed bottom-4 right-4 z-50',
};

export function FeedbackContainer({
  feedbacks,
  onRemove,
  position = 'top-right',
  maxVisible = 5,
}: FeedbackContainerProps) {
  const visibleFeedbacks = feedbacks.slice(-maxVisible);

  return (
    <div className={`${positionClasses[position]} w-96 max-w-[calc(100vw-2rem)]`}>
      {visibleFeedbacks.map((feedback) => (
        <FeedbackToast
          key={feedback.id}
          id={feedback.id}
          type={feedback.type}
          title={feedback.title}
          message={feedback.message}
          duration={feedback.duration}
          onClose={() => onRemove(feedback.id)}
        />
      ))}
    </div>
  );
}

export default FeedbackContainer;
