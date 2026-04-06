import { useState, useRef, useEffect } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { MessageCircle, X } from 'lucide-react';
import { sendChatMessage } from '@/services/chatbotService';
import ChatHeader from './ChatHeader';
import ChatMessage, { Message } from './ChatMessage';
import ChatInput from './ChatInput';

const Chatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: "Bonjour ! Je suis l'assistant IA de prévision. Demandez-moi une recommandation pour un produit à une date donnée. Ex : \"Que faire pour la Banane le 15 mai ?\"",
      sender: 'bot',
      timestamp: new Date(),
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (content: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      content,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    // Send message to backend
    try {
      const response = await sendChatMessage(content);
      console.log('Chat response:', response); // Pour le débogage
      
      if (response.success) {
        const botMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: response.data,
          sender: 'bot',
          timestamp: new Date(),
        };
        
        setMessages(prev => [...prev, botMessage]);
      } else {
        // Handle error response
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: response.error || "Désolé, je n'ai pas pu traiter votre demande. Veuillez réessayer.",
          sender: 'bot',
          timestamp: new Date(),
        };
        
        setMessages(prev => [...prev, errorMessage]);
      }
    } catch (error) {
      console.error('Error details:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: error instanceof Error ? error.message : "Une erreur s'est produite. Veuillez réessayer plus tard.",
        sender: 'bot',
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Floating toggle button */}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full p-0 bg-purple-400 hover:bg-chat-primary-light shadow-lg transition-all duration-300 hover:scale-110"
        aria-label="Ouvrir le chatbot"
      >
        {isOpen ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </Button>

      {/* Chatbot window */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 flex flex-col h-[500px] w-80 bg-purple-200 border rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-5 fade-in duration-300">
          <ChatHeader onClose={() => setIsOpen(false)} />
          
          <ScrollArea ref={scrollAreaRef} className="flex-1 p-4">
            <div className="space-y-4">
              {messages.map((message) => (
                <ChatMessage key={message.id} message={message} />
              ))}
              {isLoading && (
                <div className="flex gap-3 mb-4">
                  <div className="w-8 h-8 bg-chat-primary rounded-full flex items-center justify-center">
                    <span className="text-white bg-purple-400 rounded-full px-2 py-2 text-xs font-semibold">AI</span>
                  </div>
                  <div className="bg-chat-bubble-bot text-white rounded-2xl rounded-bl-md px-4 py-3">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} />
        </div>
      )}
    </>
  );
};

export default Chatbot;