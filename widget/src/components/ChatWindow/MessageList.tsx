import Message from './Message';
import TypingIndicator from './TypingIndicator';
import type { Message as MessageType } from '@/components/types';

interface MessageListProps {
  messages: MessageType[];
  isLoading: boolean;
}

export default function MessageList({ messages, isLoading }: MessageListProps) {
  return (
    <>
      {messages.map((message) => (
        <Message key={message.id} message={message} />
      ))}
      {isLoading && <TypingIndicator />}
    </>
  );
}