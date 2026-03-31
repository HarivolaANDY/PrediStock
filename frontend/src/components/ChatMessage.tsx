import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export interface Message {
  id: string;
  content: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

interface ChatMessageProps {
  message: Message;
}

const ChatMessage = ({ message }: ChatMessageProps) => {
  const isBot = message.sender === 'bot';
  
  return (
    <div className={`flex gap-3 mb-4 ${!isBot ? 'flex-row-reverse' : ''}`}>
      <Avatar className="w-8 h-8 flex-shrink-0">
        <AvatarImage
          src={isBot ? '/bot-avatar.png' : '/user-avatar.png'}
          alt={isBot ? 'StockTalk AI' : 'User'}
        />
        <AvatarFallback className={isBot ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium' : 'bg-chat-secondary bg-sidebar-accent text-sidebar-accent-foreground'}>
          {isBot ? 'AI' : 'U'}
        </AvatarFallback>
      </Avatar>
      
      <div className={`max-w-[75%] ${!isBot ? 'text-right' : ''}`}>
        <div
          className={`rounded-2xl px-4 py-3 text-sm bg-sidebar-accent ${
            isBot
              ? 'bg-chat-bubble-bot text-white rounded-bl-md'
              : 'bg-chat-bubble-user text-white bg-slate-300 rounded-br-md'
          }`}
        >
          {message.content}
        </div>
        <div className="text-xs text-muted-foreground mt-1 px-1">
          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;