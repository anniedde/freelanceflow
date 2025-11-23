import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Send, Mail, Bell, CheckCircle, Sparkles, User, Plus, X, Trash2, Check, DollarSign, FileText, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api';
import socket from '../services/socket';
import { formatDistanceToNow, format } from 'date-fns';
import toast from 'react-hot-toast';

interface Message {
  id: string;
  content: string;
  isFromAI: boolean;
  read: boolean;
  createdAt: string;
  client?: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string;
  };
  project?: {
    id: string;
    name: string;
  };
}

interface MessageThread {
  threadId: string;
  threadName: string;
  threadType: 'client' | 'project';
  messages: Message[];
  unreadCount: number;
  avatarUrl?: string;
}

interface Notification {
  id: string;
  type: 'task_completed' | 'invoice_paid' | 'invoice_overdue' | 'project_status_change' | 'message_received' | 'general';
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  actionUrl?: string;
  metadata?: {
    projectId?: string;
    taskId?: string;
    invoiceId?: string;
    clientId?: string;
  };
}

const Inbox = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<'messages' | 'notifications'>('messages');
  const [messages, setMessages] = useState<Message[]>([]);
  const [threads, setThreads] = useState<MessageThread[]>([]);
  const [selectedThread, setSelectedThread] = useState<MessageThread | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [clients, setClients] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedRecipientType, setSelectedRecipientType] = useState<'client' | 'project'>('client');
  const [selectedRecipientId, setSelectedRecipientId] = useState('');
  const [newChatMessage, setNewChatMessage] = useState('');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);

  // Handle URL tab parameter
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'notifications') {
      setActiveTab('notifications');
      setSearchParams({}); // Clear the URL param
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    loadMessages();
    loadClientsAndProjects();
    loadNotifications();

    // Connect to socket for real-time updates
    const token = localStorage.getItem('token');
    if (token) {
      socket.connect(token);

      // Listen for new messages
      socket.on('message-sent', (message: Message) => {
        setMessages((prev) => [message, ...prev]);
      });

      // Listen for new notifications
      socket.on('notification', (notification: Notification) => {
        setNotifications((prev) => [notification, ...prev]);
        toast.success(notification.title);
      });
    }

    return () => {
      socket.off('message-sent');
      socket.off('notification');
    };
  }, []);

  useEffect(() => {
    // Group messages into threads
    const threadMap = new Map<string, MessageThread>();

    messages.forEach((message) => {
      let threadId: string;
      let threadName: string;
      let threadType: 'client' | 'project';
      let avatarUrl: string | undefined;

      if (message.client) {
        threadId = `client-${message.client.id}`;
        threadName = message.client.name;
        threadType = 'client';
        avatarUrl = message.client.avatarUrl;
      } else if (message.project) {
        threadId = `project-${message.project.id}`;
        threadName = message.project.name;
        threadType = 'project';
      } else {
        threadId = 'general';
        threadName = 'General';
        threadType = 'client';
      }

      if (!threadMap.has(threadId)) {
        threadMap.set(threadId, {
          threadId,
          threadName,
          threadType,
          messages: [],
          unreadCount: 0,
          avatarUrl,
        });
      }

      const thread = threadMap.get(threadId)!;
      thread.messages.push(message);
      if (!message.read) {
        thread.unreadCount++;
      }
    });

    const threadList = Array.from(threadMap.values()).sort((a, b) => {
      const aLatest = new Date(a.messages[0]?.createdAt || 0).getTime();
      const bLatest = new Date(b.messages[0]?.createdAt || 0).getTime();
      return bLatest - aLatest;
    });

    setThreads(threadList);

    // Update selected thread if it exists, otherwise auto-select first thread
    if (selectedThread) {
      const updatedThread = threadList.find(t => t.threadId === selectedThread.threadId);
      if (updatedThread) {
        setSelectedThread(updatedThread);
      }
    } else if (threadList.length > 0) {
      setSelectedThread(threadList[0]);
    }
  }, [messages]);

  const loadMessages = async () => {
    try {
      const data = await api.getMessages();
      setMessages(data as Message[]);
    } catch (error) {
      console.error('Failed to load messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadClientsAndProjects = async () => {
    try {
      const [clientsData, projectsData] = await Promise.all([
        api.getClients(),
        api.getProjects(),
      ]);
      setClients(clientsData as any[]);
      setProjects(projectsData as any[]);
    } catch (error) {
      console.error('Failed to load clients and projects:', error);
    }
  };

  const loadNotifications = async () => {
    setLoadingNotifications(true);
    try {
      const data = await api.getNotifications();
      setNotifications(data as Notification[]);
    } catch (error) {
      console.error('Failed to load notifications:', error);
      toast.error('Failed to load notifications');
    } finally {
      setLoadingNotifications(false);
    }
  };

  const handleMarkNotificationAsRead = async (id: string) => {
    try {
      await api.markNotificationAsRead(id);
      setNotifications((prev) =>
        prev.map((notif) =>
          notif.id === id ? { ...notif, read: true } : notif
        )
      );
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      toast.error('Failed to mark notification as read');
    }
  };

  const handleMarkAllNotificationsAsRead = async () => {
    try {
      await api.markAllNotificationsAsRead();
      setNotifications((prev) =>
        prev.map((notif) => ({ ...notif, read: true }))
      );
      toast.success('All notifications marked as read');
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
      toast.error('Failed to mark all notifications as read');
    }
  };

  const handleDeleteNotification = async (id: string) => {
    try {
      await api.deleteNotification(id);
      setNotifications((prev) => prev.filter((notif) => notif.id !== id));
      toast.success('Notification deleted');
    } catch (error) {
      console.error('Failed to delete notification:', error);
      toast.error('Failed to delete notification');
    }
  };

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'task_completed':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'invoice_paid':
        return <DollarSign className="w-5 h-5 text-green-600" />;
      case 'invoice_overdue':
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      case 'project_status_change':
        return <FileText className="w-5 h-5 text-blue-600" />;
      case 'message_received':
        return <Mail className="w-5 h-5 text-purple-600" />;
      default:
        return <Bell className="w-5 h-5 text-gray-600" />;
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedThread) return;

    setSending(true);
    try {
      const clientId = selectedThread.threadType === 'client'
        ? selectedThread.threadId.replace('client-', '')
        : undefined;
      const projectId = selectedThread.threadType === 'project'
        ? selectedThread.threadId.replace('project-', '')
        : undefined;

      const sentMessage = await api.sendMessage({
        content: newMessage,
        clientId,
        projectId,
      }) as Message;

      setNewMessage('');

      // Mark the sent message as read immediately
      if (sentMessage.id) {
        await api.markMessageAsRead(sentMessage.id);
      }

      await loadMessages();
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setSending(false);
    }
  };

  const handleMarkAsRead = async (messageId: string) => {
    try {
      await api.markMessageAsRead(messageId);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId ? { ...msg, read: true } : msg
        )
      );
    } catch (error) {
      console.error('Failed to mark message as read:', error);
    }
  };

  // Mark all messages in selected thread as read
  useEffect(() => {
    if (selectedThread) {
      const unreadMessages = selectedThread.messages.filter(msg => !msg.read && !msg.isFromAI);

      unreadMessages.forEach(async (msg) => {
        try {
          await api.markMessageAsRead(msg.id);
          setMessages((prev) =>
            prev.map((m) =>
              m.id === msg.id ? { ...m, read: true } : m
            )
          );
        } catch (error) {
          console.error('Failed to mark message as read:', error);
        }
      });
    }
  }, [selectedThread?.threadId]);

  const handleSmartResponse = () => {
    // Placeholder for AI-powered smart response
    // This would integrate with Grok API to generate a response
    alert('Smart Response feature coming soon! This will use Grok AI to generate intelligent responses.');
  };

  const handleStartNewChat = async () => {
    if (!newChatMessage.trim() || !selectedRecipientId) return;

    setSending(true);
    try {
      const clientId = selectedRecipientType === 'client' ? selectedRecipientId : undefined;
      const projectId = selectedRecipientType === 'project' ? selectedRecipientId : undefined;

      const sentMessage = await api.sendMessage({
        content: newChatMessage,
        clientId,
        projectId,
      }) as Message;

      // Mark the sent message as read immediately
      if (sentMessage.id) {
        await api.markMessageAsRead(sentMessage.id);
      }

      // Reset modal state
      setShowNewChatModal(false);
      setNewChatMessage('');
      setSelectedRecipientId('');
      setSelectedRecipientType('client');

      // Reload messages
      await loadMessages();
    } catch (error) {
      console.error('Failed to start new chat:', error);
    } finally {
      setSending(false);
    }
  };

  const unreadCount = messages.filter((m) => !m.read).length;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Inbox</h1>
        <div className="flex items-center gap-4">
          {unreadCount > 0 && (
            <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
              {unreadCount} unread
            </span>
          )}
          <button
            onClick={() => setShowNewChatModal(true)}
            className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Message
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('messages')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'messages'
                ? 'border-purple-500 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center">
              <Mail className="w-5 h-5 mr-2" />
              Messages
            </div>
          </button>
          <button
            onClick={() => setActiveTab('notifications')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'notifications'
                ? 'border-purple-500 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center">
              <Bell className="w-5 h-5 mr-2" />
              Notifications
            </div>
          </button>
        </nav>
      </div>

      {/* Content */}
      {activeTab === 'messages' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Thread List */}
          <div className="lg:col-span-1 bg-white rounded-lg shadow overflow-hidden">
            <div className="divide-y divide-gray-200">
              {loading ? (
                <div className="p-6 text-center text-gray-600">Loading messages...</div>
              ) : threads.length === 0 ? (
                <div className="p-6 text-center text-gray-600">
                  No messages yet. Start a conversation!
                </div>
              ) : (
                threads.map((thread) => (
                  <button
                    key={thread.threadId}
                    onClick={() => setSelectedThread(thread)}
                    className={`w-full p-4 text-left hover:bg-gray-50 transition-colors ${
                      selectedThread?.threadId === thread.threadId ? 'bg-purple-50' : ''
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0">
                        {thread.avatarUrl ? (
                          <img
                            src={thread.avatarUrl}
                            alt={thread.threadName}
                            className="w-10 h-10 rounded-full"
                          />
                        ) : (
                          <div className="w-10 h-10 bg-purple-200 rounded-full flex items-center justify-center">
                            <User className="w-6 h-6 text-purple-600" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {thread.threadName}
                          </p>
                          {thread.unreadCount > 0 && (
                            <span className="ml-2 px-2 py-1 bg-purple-600 text-white text-xs rounded-full">
                              {thread.unreadCount}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 truncate">
                          {thread.messages[0]?.content}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {thread.messages[0]?.createdAt &&
                            formatDistanceToNow(new Date(thread.messages[0].createdAt), {
                              addSuffix: true,
                            })}
                        </p>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Message Thread */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow flex flex-col" style={{ height: '600px' }}>
            {selectedThread ? (
              <>
                {/* Thread Header */}
                <div className="p-4 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {selectedThread.avatarUrl ? (
                        <img
                          src={selectedThread.avatarUrl}
                          alt={selectedThread.threadName}
                          className="w-10 h-10 rounded-full"
                        />
                      ) : (
                        <div className="w-10 h-10 bg-purple-200 rounded-full flex items-center justify-center">
                          <User className="w-6 h-6 text-purple-600" />
                        </div>
                      )}
                      <div>
                        <h3 className="font-semibold text-gray-900">{selectedThread.threadName}</h3>
                        <p className="text-sm text-gray-500 capitalize">{selectedThread.threadType}</p>
                      </div>
                    </div>
                    <button
                      onClick={handleSmartResponse}
                      className="flex items-center px-3 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 text-sm"
                    >
                      <Sparkles className="w-4 h-4 mr-2" />
                      Smart Response
                    </button>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {selectedThread.messages
                    .slice()
                    .reverse()
                    .map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.isFromAI ? 'justify-start' : 'justify-end'}`}
                      >
                        <div
                          className={`max-w-xs lg:max-w-md px-4 py-3 ${
                            message.isFromAI
                              ? 'bg-gray-200 text-gray-900 rounded-2xl rounded-bl-sm'
                              : 'bg-purple-600 text-white rounded-2xl rounded-br-sm'
                          }`}
                        >
                          <p className="text-sm">{message.content}</p>
                          <div className="flex items-center justify-between mt-1">
                            <p
                              className={`text-xs ${
                                message.isFromAI ? 'text-gray-500' : 'text-purple-200'
                              }`}
                            >
                              {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
                            </p>
                            {!message.read && !message.isFromAI && (
                              <button
                                onClick={() => handleMarkAsRead(message.id)}
                                className="ml-2"
                              >
                                <CheckCircle className="w-3 h-3 text-purple-200 hover:text-white" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>

                {/* Message Input */}
                <div className="p-4 border-t border-gray-200">
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                      placeholder="Type your message..."
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                      disabled={sending}
                    />
                    <button
                      onClick={handleSendMessage}
                      disabled={sending || !newMessage.trim()}
                      className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                    >
                      <Send className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-500">
                Select a conversation to view messages
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Notifications Tab */
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900">Notifications</h2>
              <div className="flex items-center gap-2">
                {notifications.filter(n => !n.read).length > 0 && (
                  <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
                    {notifications.filter(n => !n.read).length} unread
                  </span>
                )}
                <button
                  onClick={handleMarkAllNotificationsAsRead}
                  disabled={notifications.filter(n => !n.read).length === 0}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Check className="w-4 h-4" />
                  Mark all as read
                </button>
              </div>
            </div>
          </div>

          <div className="divide-y divide-gray-200">
            {loadingNotifications ? (
              <div className="p-8 text-center text-gray-600">Loading notifications...</div>
            ) : notifications.length === 0 ? (
              <div className="p-12 text-center text-gray-600">
                <Bell className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No notifications yet</h3>
                <p className="text-sm">
                  You'll receive alerts for invoice payments, task updates, and more.
                </p>
              </div>
            ) : (
              <AnimatePresence>
                {notifications.map((notification) => (
                  <motion.div
                    key={notification.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -100 }}
                    className={`p-4 hover:bg-gray-50 transition-colors cursor-pointer ${
                      !notification.read ? 'bg-purple-50' : ''
                    }`}
                    onClick={() => !notification.read && handleMarkNotificationAsRead(notification.id)}
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 mt-1">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <p className={`text-sm font-medium ${!notification.read ? 'text-gray-900' : 'text-gray-700'}`}>
                              {notification.title}
                            </p>
                            <p className="text-sm text-gray-600 mt-1">
                              {notification.message}
                            </p>
                            <p className="text-xs text-gray-500 mt-2">
                              {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {!notification.read && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMarkNotificationAsRead(notification.id);
                                }}
                                className="p-2 text-purple-600 hover:bg-purple-100 rounded-md transition-colors"
                                title="Mark as read"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteNotification(notification.id);
                              }}
                              className="p-2 text-gray-600 hover:bg-red-50 hover:text-red-600 rounded-md transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>
        </div>
      )}

      {/* New Chat Modal */}
      {showNewChatModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900">New Message</h2>
              <button
                onClick={() => setShowNewChatModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Recipient Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Message Type
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setSelectedRecipientType('client');
                      setSelectedRecipientId('');
                    }}
                    className={`flex-1 px-4 py-2 rounded-md border ${
                      selectedRecipientType === 'client'
                        ? 'bg-purple-600 text-white border-purple-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    Client
                  </button>
                  <button
                    onClick={() => {
                      setSelectedRecipientType('project');
                      setSelectedRecipientId('');
                    }}
                    className={`flex-1 px-4 py-2 rounded-md border ${
                      selectedRecipientType === 'project'
                        ? 'bg-purple-600 text-white border-purple-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    Project
                  </button>
                </div>
              </div>

              {/* Recipient Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {selectedRecipientType === 'client' ? 'Select Client' : 'Select Project'}
                </label>
                <select
                  value={selectedRecipientId}
                  onChange={(e) => setSelectedRecipientId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">Choose {selectedRecipientType}...</option>
                  {selectedRecipientType === 'client'
                    ? clients.map((client) => (
                        <option key={client.id} value={client.id}>
                          {client.name}
                        </option>
                      ))
                    : projects.map((project) => (
                        <option key={project.id} value={project.id}>
                          {project.name}
                        </option>
                      ))}
                </select>
              </div>

              {/* Message Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Message
                </label>
                <textarea
                  value={newChatMessage}
                  onChange={(e) => setNewChatMessage(e.target.value)}
                  placeholder="Type your message..."
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowNewChatModal(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleStartNewChat}
                  disabled={sending || !newChatMessage.trim() || !selectedRecipientId}
                  className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  {sending ? 'Sending...' : 'Send Message'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inbox;
