
import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  Paperclip, 
  MoreVertical, 
  Search, 
  Plus, 
  UserPlus,
  Hash,
  Users,
  Bot,
  Edit2,
  Trash2,
  Smile
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { ScrollArea } from '../ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Badge } from '../ui/badge';
import { Textarea } from '../ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '../ui/dialog';
import { Label } from '../ui/label';
import { useToast } from '../../hooks/use-toast';
import { format, formatDistanceToNow } from 'date-fns';
import { useAuth } from '../../hooks/useAuth';
import { useAgents } from '../../hooks/useAgents';

interface Participant {
  id: string;
  type: 'user' | 'agent';
  name?: string;
  role?: string;
}

interface Conversation {
  id: string;
  type: string;
  title?: string;
  description?: string;
  participants: Participant[];
  lastMessage?: string;
  unreadCount: number;
  updatedAt: string;
}

interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderType: 'user' | 'agent';
  messageType: string;
  content: string;
  attachments: any[];
  edited: boolean;
  deleted: boolean;
  createdAt: string;
  editedAt?: string;
}

export default function MessagingInterface() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [showNewConversationDialog, setShowNewConversationDialog] = useState(false);
  const [newConversationType, setNewConversationType] = useState<'direct' | 'group'>('direct');
  const [selectedParticipants, setSelectedParticipants] = useState<Participant[]>([]);
  const [conversationTitle, setConversationTitle] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const { agents } = useAgents();

  useEffect(() => {
    fetchConversations();
    
    // Set up WebSocket connection with proper error handling
    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      
      ws.onopen = () => {
        console.log('Messaging WebSocket connected');
      };
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          switch (data.type) {
            case 'message:new':
              if (data.data.conversationId === selectedConversation?.id) {
                setMessages(prev => [...prev, data.data.message]);
                scrollToBottom();
              }
              // Update conversation list
              fetchConversations();
              break;
              
            case 'typing:status':
              if (data.data.conversationId === selectedConversation?.id) {
                if (data.data.isTyping) {
                  setTypingUsers(prev => [...prev, data.data.userId]);
                } else {
                  setTypingUsers(prev => prev.filter(id => id !== data.data.userId));
                }
              }
              break;
              
            case 'message:edited':
            case 'message:deleted':
              if (selectedConversation?.id) {
                fetchMessages(selectedConversation.id);
              }
              break;
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('Messaging WebSocket error:', error);
      };

      ws.onclose = () => {
        console.log('Messaging WebSocket disconnected');
        wsRef.current = null;
      };
    } catch (error) {
      console.error('Failed to create messaging WebSocket:', error);
    }

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [selectedConversation?.id]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchConversations = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/conversations', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await response.json();
      setConversations(data.conversations);
    } catch (error) {
      console.error('Failed to fetch conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (conversationId: string) => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/conversations/${conversationId}/messages`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await response.json();
      setMessages(data.messages);
      setTimeout(scrollToBottom, 100);
      
      // Mark messages as read
      await markAsRead(conversationId);
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    }
  };

  const markAsRead = async (conversationId: string) => {
    try {
      const token = localStorage.getItem('auth_token');
      await fetch(`/api/conversations/${conversationId}/read`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          upToMessageId: messages[messages.length - 1]?.id,
        }),
      });
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return;

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/conversations/${selectedConversation.id}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: newMessage,
          messageType: 'text',
        }),
      });
      
      if (response.ok) {
        setNewMessage('');
        const data = await response.json();
        setMessages(prev => [...prev, data.message]);
        scrollToBottom();
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      toast({
        title: 'Error',
        description: 'Failed to send message',
        variant: 'destructive',
      });
    }
  };

  const handleTyping = () => {
    if (wsRef.current && selectedConversation) {
      wsRef.current.send(JSON.stringify({
        type: 'typing:start',
        conversationId: selectedConversation.id,
      }));
      
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      typingTimeoutRef.current = setTimeout(() => {
        if (wsRef.current && selectedConversation) {
          wsRef.current.send(JSON.stringify({
            type: 'typing:stop',
            conversationId: selectedConversation.id,
          }));
        }
      }, 3000);
    }
  };

  const createConversation = async () => {
    if (selectedParticipants.length === 0) {
      toast({
        title: 'Error',
        description: 'Please select at least one participant',
        variant: 'destructive',
      });
      return;
    }

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: newConversationType,
          participants: [
            { id: user?.user_id || '', type: 'user', role: 'member' },
            ...selectedParticipants,
          ],
          title: conversationTitle || undefined,
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        setConversations(prev => [data.conversation, ...prev]);
        setSelectedConversation(data.conversation);
        setShowNewConversationDialog(false);
        setSelectedParticipants([]);
        setConversationTitle('');
        fetchMessages(data.conversation.id);
      }
    } catch (error) {
      console.error('Failed to create conversation:', error);
      toast({
        title: 'Error',
        description: 'Failed to create conversation',
        variant: 'destructive',
      });
    }
  };

  const getParticipantName = (participant: Participant) => {
    if (participant.type === 'user') {
      return participant.id === user?.user_id ? 'You' : participant.name || 'User';
    }
    const agent = agents.find(a => a.agent_id === participant.id);
    return agent?.name || participant.name || 'Agent';
  };

  const getSenderName = (senderId: string, senderType: string) => {
    if (senderType === 'user') {
      return senderId === user?.user_id ? 'You' : 'User';
    }
    const agent = agents.find(a => a.agent_id === senderId);
    return agent?.name || 'Agent';
  };

  const filteredConversations = conversations.filter(conv => 
    conv.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.participants.some(p => 
      getParticipantName(p).toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  return (
    <div className="flex h-[calc(100vh-200px)] bg-background rounded-lg border">
      {/* Conversations List */}
      <div className="w-80 border-r">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Messages</h3>
            <Dialog open={showNewConversationDialog} onOpenChange={setShowNewConversationDialog}>
              <DialogTrigger asChild>
                <Button size="icon" variant="ghost">
                  <Plus className="w-4 h-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>New Conversation</DialogTitle>
                  <DialogDescription>
                    Start a new conversation with users or agents
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Type</Label>
                    <div className="flex gap-2 mt-2">
                      <Button
                        variant={newConversationType === 'direct' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setNewConversationType('direct')}
                      >
                        Direct Message
                      </Button>
                      <Button
                        variant={newConversationType === 'group' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setNewConversationType('group')}
                      >
                        Group Chat
                      </Button>
                    </div>
                  </div>
                  
                  {newConversationType === 'group' && (
                    <div>
                      <Label htmlFor="conversation-title">Group Name</Label>
                      <Input
                        id="conversation-title"
                        value={conversationTitle}
                        onChange={(e) => setConversationTitle(e.target.value)}
                        placeholder="Enter group name"
                      />
                    </div>
                  )}
                  
                  <div>
                    <Label>Select Participants</Label>
                    <ScrollArea className="h-48 mt-2 border rounded-md p-2">
                      <div className="space-y-2">
                        <div className="font-medium text-sm text-muted-foreground">Agents</div>
                        {agents.map(agent => (
                          <div
                            key={agent.agent_id}
                            className={`flex items-center space-x-2 p-2 rounded cursor-pointer hover:bg-muted ${
                              selectedParticipants.some(p => p.id === agent.agent_id) ? 'bg-muted' : ''
                            }`}
                            onClick={() => {
                              const isSelected = selectedParticipants.some(p => p.id === agent.agent_id);
                              if (isSelected) {
                                setSelectedParticipants(prev => prev.filter(p => p.id !== agent.agent_id));
                              } else {
                                setSelectedParticipants(prev => [...prev, { 
                                  id: agent.agent_id, 
                                  type: 'agent',
                                  name: agent.name,
                                  role: 'member'
                                }]);
                              }
                            }}
                          >
                            <Bot className="w-4 h-4" />
                            <span className="text-sm">{agent.name}</span>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowNewConversationDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={createConversation}>
                    Create Conversation
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        
        <ScrollArea className="h-[calc(100%-120px)]">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No conversations yet
            </div>
          ) : (
            <div className="space-y-1 p-2">
              {filteredConversations.map((conversation) => (
                <div
                  key={conversation.id}
                  className={`p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedConversation?.id === conversation.id
                      ? 'bg-muted'
                      : 'hover:bg-muted/50'
                  }`}
                  onClick={() => {
                    setSelectedConversation(conversation);
                    fetchMessages(conversation.id);
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        {conversation.type === 'group' ? (
                          <Users className="w-4 h-4" />
                        ) : (
                          <Hash className="w-4 h-4" />
                        )}
                        <h4 className="font-medium text-sm">
                          {conversation.title || conversation.participants
                            .filter(p => p.id !== user?.user_id)
                            .map(p => getParticipantName(p))
                            .join(', ')}
                        </h4>
                      </div>
                      {conversation.lastMessage && (
                        <p className="text-sm text-muted-foreground mt-1 truncate">
                          {conversation.lastMessage}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(conversation.updatedAt), { addSuffix: true })}
                      </p>
                    </div>
                    {conversation.unreadCount > 0 && (
                      <Badge variant="destructive" className="ml-2">
                        {conversation.unreadCount}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>
      
      {/* Messages Area */}
      <div className="flex-1 flex flex-col">
        {selectedConversation ? (
          <>
            {/* Conversation Header */}
            <div className="p-4 border-b flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div>
                  <h3 className="font-semibold">
                    {selectedConversation.title || selectedConversation.participants
                      .filter(p => p.id !== user?.user_id)
                      .map(p => getParticipantName(p))
                      .join(', ')}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedConversation.participants.length} participants
                  </p>
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>
                    <UserPlus className="w-4 h-4 mr-2" />
                    Add participants
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Edit2 className="w-4 h-4 mr-2" />
                    Edit conversation
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-destructive">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete conversation
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            
            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${
                      message.senderId === user?.user_id ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <div
                      className={`max-w-[70%] rounded-lg p-3 ${
                        message.senderId === user?.user_id
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      {message.senderId !== user?.user_id && (
                        <p className="text-xs font-medium mb-1 opacity-70">
                          {getSenderName(message.senderId, message.senderType)}
                        </p>
                      )}
                      <p className="text-sm">{message.content}</p>
                      <p className="text-xs opacity-70 mt-1">
                        {format(new Date(message.createdAt), 'HH:mm')}
                        {message.edited && ' (edited)'}
                      </p>
                    </div>
                  </div>
                ))}
                {typingUsers.length > 0 && (
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                    </div>
                    <span>Someone is typing...</span>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>
            
            {/* Message Input */}
            <div className="p-4 border-t">
              <div className="flex items-center space-x-2">
                <Button variant="ghost" size="icon">
                  <Paperclip className="w-4 h-4" />
                </Button>
                <Input
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={(e) => {
                    setNewMessage(e.target.value);
                    handleTyping();
                  }}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  className="flex-1"
                />
                <Button variant="ghost" size="icon">
                  <Smile className="w-4 h-4" />
                </Button>
                <Button onClick={sendMessage} disabled={!newMessage.trim()}>
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            Select a conversation to start messaging
          </div>
        )}
      </div>
    </div>
  );
}
