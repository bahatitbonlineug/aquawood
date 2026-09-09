import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Bot,
  Send,
  Loader2,
  X,
  Minimize2,
  Maximize2,
  Sparkles
} from 'lucide-react';
import { cn } from "@/lib/utils";
import ReactMarkdown from 'react-markdown';

export default function AIPopup() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (isOpen && !conversation) {
      initConversation();
    }
  }, [isOpen]);

  useEffect(() => {
    if (conversation) {
      const unsubscribe = base44.agents.subscribeToConversation(
        conversation.id,
        (data) => {
          setMessages(data.messages || []);
        }
      );
      return () => unsubscribe();
    }
  }, [conversation?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const initConversation = async () => {
    try {
      const conv = await base44.agents.createConversation({
        agent_name: 'environmental_assistant',
        metadata: {
          name: 'AQUA WOOD Assistant',
          description: 'Environmental analysis chat'
        }
      });
      setConversation(conv);
    } catch (e) {
      console.error(e);
    }
  };

  const sendMessage = async () => {
    if (!inputValue.trim() || sending || !conversation) return;

    const messageContent = inputValue.trim();
    setInputValue('');
    setSending(true);

    try {
      await base44.agents.addMessage(conversation, {
        role: 'user',
        content: messageContent
      });
    } catch (e) {
      console.error(e);
    }
    setSending(false);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const MessageBubble = ({ message }) => {
    const isUser = message.role === 'user';
    const isStreaming = message.tool_calls?.some(tc => tc.status === 'running' || tc.status === 'in_progress');

    return (
      <div className={cn("flex gap-2", isUser ? "justify-end" : "justify-start")}>
        {!isUser && (
          <img 
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699fd59568d76f4dc3bcc93b/a9193cd52_logo.jpg"
            alt="AQUA WOOD AI"
            className="h-7 w-7 rounded-full object-cover shrink-0"
          />
        )}
        <div className={cn("max-w-[80%]", isUser && "flex flex-col items-end")}>
          {message.content && (
            <div className={cn(
              "rounded-2xl px-3 py-2 text-sm",
              isUser 
                ? "bg-primary text-primary-foreground" 
                : "bg-secondary"
            )}>
              {isUser ? (
                <p className="whitespace-pre-wrap">{message.content}</p>
              ) : (
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <ReactMarkdown
                    components={{
                      p: ({ children }) => <p className="my-1 text-sm">{children}</p>,
                      ul: ({ children }) => <ul className="my-1 ml-3 list-disc text-sm">{children}</ul>,
                      ol: ({ children }) => <ol className="my-1 ml-3 list-decimal text-sm">{children}</ol>,
                      li: ({ children }) => <li className="my-0.5">{children}</li>,
                      code: ({ children }) => (
                        <code className="px-1 py-0.5 rounded bg-muted text-xs">{children}</code>
                      ),
                    }}
                  >
                    {message.content}
                  </ReactMarkdown>
                </div>
              )}
            </div>
          )}
          {isStreaming && (
            <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>Analyzing...</span>
            </div>
          )}
        </div>
        {isUser && (
          <div className="h-7 w-7 rounded-full bg-primary flex items-center justify-center shrink-0">
            <span className="text-xs text-primary-foreground font-medium">You</span>
          </div>
        )}
      </div>
    );
  };

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all p-0 overflow-hidden bg-white"
      >
        <img 
          src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699fd59568d76f4dc3bcc93b/a9193cd52_logo.jpg"
          alt="AQUA WOOD AI"
          className="h-full w-full object-cover"
        />
      </Button>
    );
  }

  return (
    <Card
      className={cn(
        "fixed bottom-6 right-6 z-50 shadow-2xl flex flex-col transition-all duration-300",
        isMinimized 
          ? "w-80 h-16" 
          : "w-96 h-[600px]"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b bg-gradient-to-r from-primary to-accent rounded-t-lg">
        <div className="flex items-center gap-2">
          <img 
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699fd59568d76f4dc3bcc93b/a9193cd52_logo.jpg"
            alt="AQUA WOOD AI"
            className="h-8 w-8 rounded-full object-cover bg-white p-0.5"
          />
          <div>
            <h3 className="font-semibold text-sm text-white">AQUA WOOD AI</h3>
            <p className="text-xs text-white/80">Environmental Assistant</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-white hover:bg-white/20"
            onClick={() => setIsMinimized(!isMinimized)}
          >
            {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-white hover:bg-white/20"
            onClick={() => setIsOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Messages */}
          <ScrollArea className="flex-1 p-3">
            {messages.length > 0 ? (
              <div className="space-y-3">
                {messages.map((message, idx) => (
                  <MessageBubble key={idx} message={message} />
                ))}
                <div ref={messagesEndRef} />
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center px-4">
                <img 
                  src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/699fd59568d76f4dc3bcc93b/a9193cd52_logo.jpg"
                  alt="AQUA WOOD AI"
                  className="h-16 w-16 rounded-full object-cover mb-3"
                />
                <h4 className="font-semibold text-sm mb-1">Hi! I'm AQUA WOOD AI</h4>
                <p className="text-xs text-muted-foreground">
                  Ask me about environmental data, Uganda's forests, water quality, or report analysis.
                </p>
              </div>
            )}
          </ScrollArea>

          {/* Input */}
          <div className="p-3 border-t">
            <div className="flex gap-2">
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask AQUA WOOD..."
                className="flex-1 text-sm"
                disabled={sending}
              />
              <Button
                onClick={sendMessage}
                disabled={!inputValue.trim() || sending}
                size="icon"
                className="shrink-0"
              >
                {sending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </>
      )}
    </Card>
  );
}