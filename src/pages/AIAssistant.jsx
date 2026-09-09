import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Bot,
  Send,
  Loader2,
  Trash2,
  Plus,
  MessageSquare,
  Sparkles,
  TreeDeciduous,
  Droplets,
  AlertTriangle,
  BarChart3,
  HelpCircle
} from 'lucide-react';
import { cn } from "@/lib/utils";
import ReactMarkdown from 'react-markdown';
import moment from 'moment';

export default function AIAssistant() {
  const [conversations, setConversations] = useState([]);
  const [currentConversation, setCurrentConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    if (currentConversation) {
      const unsubscribe = base44.agents.subscribeToConversation(
        currentConversation.id,
        (data) => {
          setMessages(data.messages || []);
        }
      );
      return () => unsubscribe();
    }
  }, [currentConversation?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadConversations = async () => {
    setLoading(true);
    try {
      const convs = await base44.agents.listConversations({
        agent_name: 'environmental_assistant'
      });
      setConversations(convs || []);
      if (convs?.length > 0) {
        selectConversation(convs[0]);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const selectConversation = async (conv) => {
    try {
      const fullConv = await base44.agents.getConversation(conv.id);
      setCurrentConversation(fullConv);
      setMessages(fullConv.messages || []);
    } catch (e) {
      console.error(e);
    }
  };

  const createNewConversation = async () => {
    try {
      const conv = await base44.agents.createConversation({
        agent_name: 'environmental_assistant',
        metadata: {
          name: `Conversation ${moment().format('MMM D, h:mm A')}`,
          description: 'Environmental monitoring assistance'
        }
      });
      setConversations(prev => [conv, ...prev]);
      setCurrentConversation(conv);
      setMessages([]);
    } catch (e) {
      console.error(e);
    }
  };

  const sendMessage = async () => {
    if (!inputValue.trim() || sending) return;

    const messageContent = inputValue.trim();
    setInputValue('');
    setSending(true);

    try {
      let conv = currentConversation;
      if (!conv) {
        conv = await base44.agents.createConversation({
          agent_name: 'environmental_assistant',
          metadata: {
            name: `Conversation ${moment().format('MMM D, h:mm A')}`,
            description: 'Environmental monitoring assistance'
          }
        });
        setConversations(prev => [conv, ...prev]);
        setCurrentConversation(conv);
      }

      await base44.agents.addMessage(conv, {
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

  const suggestedQuestions = [
    {
      icon: TreeDeciduous,
      text: "What are the current deforestation trends?",
      color: "text-green-500 bg-green-500/10"
    },
    {
      icon: Droplets,
      text: "Analyze water quality in monitored zones",
      color: "text-blue-500 bg-blue-500/10"
    },
    {
      icon: AlertTriangle,
      text: "What are the most critical alerts?",
      color: "text-red-500 bg-red-500/10"
    },
    {
      icon: BarChart3,
      text: "Generate an environmental health report",
      color: "text-purple-500 bg-purple-500/10"
    }
  ];

  const MessageBubble = ({ message }) => {
    const isUser = message.role === 'user';
    const isStreaming = message.tool_calls?.some(tc => tc.status === 'running' || tc.status === 'in_progress');

    return (
      <div className={cn("flex gap-3", isUser ? "justify-end" : "justify-start")}>
        {!isUser && (
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <Bot className="h-4 w-4 text-primary" />
          </div>
        )}
        <div className={cn("max-w-[80%]", isUser && "flex flex-col items-end")}>
          {message.content && (
            <div className={cn(
              "rounded-2xl px-4 py-3",
              isUser 
                ? "bg-primary text-primary-foreground" 
                : "bg-secondary"
            )}>
              {isUser ? (
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              ) : (
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <ReactMarkdown
                    components={{
                      p: ({ children }) => <p className="my-1 text-sm">{children}</p>,
                      ul: ({ children }) => <ul className="my-1 ml-4 list-disc text-sm">{children}</ul>,
                      ol: ({ children }) => <ol className="my-1 ml-4 list-decimal text-sm">{children}</ol>,
                      li: ({ children }) => <li className="my-0.5">{children}</li>,
                      code: ({ children }) => (
                        <code className="px-1 py-0.5 rounded bg-muted text-xs">{children}</code>
                      ),
                      pre: ({ children }) => (
                        <pre className="bg-muted rounded-lg p-3 overflow-x-auto my-2 text-xs">{children}</pre>
                      ),
                    }}
                  >
                    {message.content}
                  </ReactMarkdown>
                </div>
              )}
            </div>
          )}

          {/* Tool calls display */}
          {message.tool_calls?.length > 0 && (
            <div className="mt-2 space-y-1">
              {message.tool_calls.map((toolCall, idx) => (
                <div
                  key={idx}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs",
                    "bg-muted/50 border border-border"
                  )}
                >
                  {toolCall.status === 'running' || toolCall.status === 'in_progress' ? (
                    <Loader2 className="h-3 w-3 animate-spin text-primary" />
                  ) : (
                    <Sparkles className="h-3 w-3 text-primary" />
                  )}
                  <span className="text-muted-foreground">
                    {toolCall.name?.split('.').pop()?.replace(/_/g, ' ')}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Streaming indicator */}
          {isStreaming && (
            <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>Processing...</span>
            </div>
          )}
        </div>
        {isUser && (
          <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center shrink-0">
            <span className="text-xs text-primary-foreground font-medium">You</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex gap-4">
      {/* Sidebar - Conversations */}
      <div className="hidden md:block w-72 shrink-0">
        <Card className="h-full flex flex-col">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Conversations</CardTitle>
              <Button size="icon" variant="ghost" onClick={createNewConversation}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="flex-1 p-0 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="px-4 pb-4 space-y-2">
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : conversations.length > 0 ? (
                  conversations.map((conv) => (
                    <button
                      key={conv.id}
                      onClick={() => selectConversation(conv)}
                      className={cn(
                        "w-full p-3 rounded-lg text-left transition-all",
                        currentConversation?.id === conv.id
                          ? "bg-primary/10 border border-primary/30"
                          : "hover:bg-secondary border border-transparent"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <MessageSquare className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {conv.metadata?.name || 'New Conversation'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {moment(conv.created_date).fromNow()}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No conversations yet</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Main Chat Area */}
      <Card className="flex-1 flex flex-col">
        <CardHeader className="border-b pb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Bot className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg">AQUAWOOD AI Assistant</CardTitle>
              <p className="text-xs text-muted-foreground">Environmental monitoring and analysis</p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex-1 p-0 flex flex-col overflow-hidden">
          {/* Messages Area */}
          <ScrollArea className="flex-1 p-4">
            {messages.length > 0 ? (
              <div className="space-y-4">
                {messages.map((message, idx) => (
                  <MessageBubble key={idx} message={message} />
                ))}
                <div ref={messagesEndRef} />
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center px-4">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <Sparkles className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">How can I help you today?</h3>
                <p className="text-muted-foreground text-sm max-w-md mb-6">
                  I can help you analyze environmental data, understand trends, and provide insights on deforestation and water quality.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg">
                  {suggestedQuestions.map((q, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setInputValue(q.text);
                      }}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-xl border border-border",
                        "hover:border-primary/30 hover:bg-secondary transition-all text-left"
                      )}
                    >
                      <div className={cn("p-2 rounded-lg", q.color)}>
                        <q.icon className="h-4 w-4" />
                      </div>
                      <span className="text-sm">{q.text}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </ScrollArea>

          {/* Input Area */}
          <div className="p-4 border-t">
            <div className="flex gap-3">
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask about environmental data..."
                className="flex-1"
                disabled={sending}
              />
              <Button
                onClick={sendMessage}
                disabled={!inputValue.trim() || sending}
                className="px-4"
              >
                {sending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground text-center mt-2">
              Powered by AQUAWOOD Environmental AI • Developed by THE DREAMERS
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}