import Message from './Message';
import TypingIndicator from './TypingIndicator';
import type { Feedback, Message as MessageType } from '@/components/types';

interface MessageListProps {
  messages: MessageType[];
  isLoading: boolean;
  onFeedback: (messageId: string, rating: Feedback) => void;
}

export default function MessageList({ messages, isLoading, onFeedback }: MessageListProps) {
  return (
    <>
      {messages.map((message) => (
        <Message key={message.id} message={message} onFeedback={onFeedback} />
      ))}
      {isLoading && <TypingIndicator />}
    </>
  );
}