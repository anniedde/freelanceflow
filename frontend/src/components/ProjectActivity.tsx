import { useState, useEffect, useRef } from 'react';
import {
  Clock,
  MessageSquare,
  Paperclip,
  Upload,
  Send,
  Download,
  FileText,
  AlertCircle,
  Plus,
  ArrowRight,
  CheckCircle,
  DollarSign,
  User,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import socketService from '../services/socket';

interface Project {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  status: string;
  tasks?: any[];
}

interface ActivityEvent {
  id: string;
  type: 'created' | 'status_change' | 'task_completed' | 'message' | 'file_upload' | 'invoice_added';
  message: string;
  user: {
    name: string;
    avatarUrl?: string;
  };
  timestamp: string;
  metadata?: any;
}

interface ChatMessage {
  id: string;
  content: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  timestamp: string;
  isFromCurrentUser: boolean;
}

interface ProjectFile {
  id: string;
  name: string;
  size: number;
  url: string;
  uploadedBy: string;
  uploadedAt: string;
}

const statusConfig: Record<string, { label: string }> = {
  DRAFT: { label: 'Draft' },
  IN_PROGRESS: { label: 'In Progress' },
  ON_REVIEW: { label: 'On Review' },
  COMPLETED: { label: 'Completed' },
  CANCELED: { label: 'Canceled' },
};

export default function ProjectActivity({ project }: { project: Project }) {
  const [activityEvents, setActivityEvents] = useState<ActivityEvent[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [projectFiles, setProjectFiles] = useState<ProjectFile[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoadingActivity, setIsLoadingActivity] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadActivityData();

    // Connect to socket for real-time updates
    const token = localStorage.getItem('token');
    if (token) {
      socketService.connect(token);
      socketService.emit('join-project', { projectId: project.id });

      // Listen for new messages
      socketService.on('message-sent', handleNewMessage);
      socketService.on('activity-update', handleActivityUpdate);
    }

    return () => {
      socketService.off('message-sent', handleNewMessage);
      socketService.off('activity-update', handleActivityUpdate);
    };
  }, [project.id]);

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadActivityData = async () => {
    setIsLoadingActivity(true);
    try {
      // Load activity events (mock for now)
      const events: ActivityEvent[] = [
        {
          id: '1',
          type: 'created',
          message: 'Project created',
          user: { name: 'Admin', avatarUrl: undefined },
          timestamp: project.createdAt,
        },
        {
          id: '2',
          type: 'status_change',
          message: `Status changed to ${statusConfig[project.status]?.label || project.status}`,
          user: { name: 'Admin', avatarUrl: undefined },
          timestamp: project.updatedAt,
          metadata: { oldStatus: 'DRAFT', newStatus: project.status },
        },
      ];

      // Add task completion events
      if (project.tasks && project.tasks.length > 0) {
        project.tasks.filter(t => t.status === 'COMPLETED').forEach((task, index) => {
          events.push({
            id: `task-${index}`,
            type: 'task_completed',
            message: `Completed task: ${task.name}`,
            user: { name: 'Team Member', avatarUrl: undefined },
            timestamp: task.updatedAt || project.updatedAt,
          });
        });
      }

      // Sort by timestamp
      events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      setActivityEvents(events);

      // Load chat messages (mock for now)
      const messages: ChatMessage[] = [];
      setChatMessages(messages);

      // Load files (mock for now)
      setProjectFiles([]);
    } catch (error) {
      console.error('Failed to load activity data:', error);
    } finally {
      setIsLoadingActivity(false);
    }
  };

  const handleNewMessage = (message: any) => {
    const newMsg: ChatMessage = {
      id: message.id || Date.now().toString(),
      content: message.content,
      userId: message.userId,
      userName: message.userName || 'User',
      userAvatar: message.userAvatar,
      timestamp: message.timestamp || new Date().toISOString(),
      isFromCurrentUser: message.isFromCurrentUser || false,
    };
    setChatMessages(prev => [...prev, newMsg]);
  };

  const handleActivityUpdate = (event: ActivityEvent) => {
    setActivityEvents(prev => [...prev, event]);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const message: ChatMessage = {
      id: Date.now().toString(),
      content: newMessage,
      userId: 'current-user',
      userName: 'You',
      timestamp: new Date().toISOString(),
      isFromCurrentUser: true,
    };

    setChatMessages(prev => [...prev, message]);

    // Emit via socket
    socketService.emit('send-message', {
      projectId: project.id,
      content: newMessage,
    });

    setNewMessage('');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];

    // Mock file upload
    const newFile: ProjectFile = {
      id: Date.now().toString(),
      name: file.name,
      size: file.size,
      url: URL.createObjectURL(file),
      uploadedBy: 'You',
      uploadedAt: new Date().toISOString(),
    };

    setProjectFiles(prev => [...prev, newFile]);

    // Add activity event
    const event: ActivityEvent = {
      id: Date.now().toString(),
      type: 'file_upload',
      message: `Uploaded file: ${file.name}`,
      user: { name: 'You' },
      timestamp: new Date().toISOString(),
    };
    setActivityEvents(prev => [...prev, event]);

    toast.success('File uploaded successfully!');

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getActivityIcon = (type: ActivityEvent['type']) => {
    switch (type) {
      case 'created':
        return <Plus className="w-4 h-4 text-blue-600" />;
      case 'status_change':
        return <ArrowRight className="w-4 h-4 text-purple-600" />;
      case 'task_completed':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'message':
        return <MessageSquare className="w-4 h-4 text-blue-600" />;
      case 'file_upload':
        return <Upload className="w-4 h-4 text-orange-600" />;
      case 'invoice_added':
        return <DollarSign className="w-4 h-4 text-green-600" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-600" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Activity Timeline */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-purple-600" />
          Activity Timeline
        </h3>

        {isLoadingActivity ? (
          <div className="text-center py-8 text-gray-600">Loading activity...</div>
        ) : activityEvents.length === 0 ? (
          <div className="text-center py-8 text-gray-600">
            <AlertCircle className="w-8 h-8 mx-auto mb-2 text-gray-400" />
            <p>No activity yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {activityEvents.map((event, index) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex-shrink-0 mt-1">
                  {getActivityIcon(event.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="text-sm text-gray-900">
                        <span className="font-medium">{event.user.name}</span> {event.message}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {formatDistanceToNow(new Date(event.timestamp), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Chat Messages */}
      <div className="border-t pt-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-blue-600" />
          Team Chat
        </h3>

        <div className="bg-gray-50 rounded-lg p-4 space-y-4">
          {/* Messages Container */}
          <div className="max-h-64 overflow-y-auto space-y-3">
            {chatMessages.length === 0 ? (
              <div className="text-center py-8 text-gray-600">
                <MessageSquare className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                <p className="text-sm">No messages yet. Start a conversation!</p>
              </div>
            ) : (
              <>
                {chatMessages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex gap-2 ${message.isFromCurrentUser ? 'justify-end' : 'justify-start'}`}
                  >
                    {!message.isFromCurrentUser && (
                      <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                        {message.userAvatar ? (
                          <img src={message.userAvatar} alt={message.userName} className="w-8 h-8 rounded-full" />
                        ) : (
                          <span className="text-sm font-medium text-purple-600">
                            {message.userName.charAt(0)}
                          </span>
                        )}
                      </div>
                    )}
                    <div
                      className={`max-w-xs px-4 py-2 rounded-lg ${
                        message.isFromCurrentUser
                          ? 'bg-purple-600 text-white'
                          : 'bg-white text-gray-900 border border-gray-200'
                      }`}
                    >
                      {!message.isFromCurrentUser && (
                        <p className="text-xs font-medium mb-1 opacity-75">{message.userName}</p>
                      )}
                      <p className="text-sm">{message.content}</p>
                      <p className={`text-xs mt-1 ${message.isFromCurrentUser ? 'text-purple-200' : 'text-gray-500'}`}>
                        {format(new Date(message.timestamp), 'h:mm a')}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Message Input */}
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
            />
            <button
              type="submit"
              disabled={!newMessage.trim()}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>

      {/* Files */}
      <div className="border-t pt-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Paperclip className="w-5 h-5 text-orange-600" />
            Files
          </h3>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            className="hidden"
            multiple
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-purple-100 text-purple-700 rounded-md hover:bg-purple-200 transition-colors"
          >
            <Upload className="w-4 h-4" />
            Upload File
          </button>
        </div>

        {projectFiles.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-lg">
            <Paperclip className="w-8 h-8 mx-auto mb-2 text-gray-400" />
            <p className="text-sm text-gray-600">No files uploaded yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {projectFiles.map((file) => (
              <div
                key={file.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <FileText className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                    <p className="text-xs text-gray-500">
                      {formatFileSize(file.size)} • Uploaded by {file.uploadedBy} •{' '}
                      {formatDistanceToNow(new Date(file.uploadedAt), { addSuffix: true })}
                    </p>
                  </div>
                </div>
                <a
                  href={file.url}
                  download={file.name}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm text-purple-600 hover:bg-purple-50 rounded-md transition-colors"
                >
                  <Download className="w-4 h-4" />
                </a>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
