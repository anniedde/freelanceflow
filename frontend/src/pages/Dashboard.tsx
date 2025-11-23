import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Users, DollarSign, Briefcase, CheckSquare, TrendingUp, TrendingDown, MoreVertical, Sparkles, Send, Zap, Plus, X } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Dot } from 'recharts';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import api from '../services/api';
import aiService from '../services/ai';
import socketService from '../services/socket';
import { RootState } from '../store';
import {
  createConversation,
  addMessage,
  updateStreamingMessage,
  finalizeStreamingMessage,
  setIsTyping,
  setActiveTab,
  setError,
} from '../store/slices/aiSlice';

interface Project {
  id: string;
  name: string;
  type?: string;
  budget?: number;
  status: string;
  dueDate?: string;
  client: {
    id: string;
    name: string;
    avatarUrl?: string;
  };
}

interface Task {
  id: string;
  name: string;
  priority: number;
  category?: string;
  dueDate?: string;
  status: string;
}

interface RevenueData {
  month: string;
  actual: number;
  projected?: number;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { conversations, activeConversationId, isTyping, activeTab, error } = useSelector((state: RootState) => state.ai);

  const [stats, setStats] = useState({
    clients: 0,
    clientsChange: 0,
    revenue: 0,
    revenueChange: 0,
    projects: 0,
    projectsChange: 0,
    tasks: 0,
  });
  const [projects, setProjects] = useState<Project[]>([]);
  const [priorityTasks, setPriorityTasks] = useState<Task[]>([]);
  const [revenueData, setRevenueData] = useState<RevenueData[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiInput, setAiInput] = useState('');
  const [showAIChat, setShowAIChat] = useState(true);
  const aiInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadDashboardData();
    initializeAI();

    // Connect to socket for real-time AI responses
    const token = localStorage.getItem('token');
    if (token) {
      socketService.connect(token);
    }

    return () => {
      socketService.disconnect();
    };
  }, []);

  const initializeAI = () => {
    // Create initial conversation if none exists
    if (!activeConversationId) {
      dispatch(createConversation({ title: 'AI Assistant' }));
    }
  };

  const loadDashboardData = async () => {
    try {
      const [clients, projectsData, tasks, revenue] = await Promise.all([
        api.getClients(),
        api.getProjects(),
        api.getTasks({ priority: 1 }),
        api.getRevenue('year').catch(() => ({ trends: [] }) as any),
      ]);

      const clientsArray = clients as any[];
      const projectsArray = projectsData as any[];
      const tasksArray = tasks as any[];

      setStats({
        clients: clientsArray.length,
        clientsChange: 4,
        revenue: 3552,
        revenueChange: -8,
        projects: projectsArray.length,
        projectsChange: 6,
        tasks: tasksArray.length,
      });

      setProjects(projectsArray.slice(0, 5));
      setPriorityTasks(tasksArray.slice(0, 6));

      // Load actual revenue data from analytics
      const revenueData: any = revenue;
      if (revenueData && revenueData.trends) {
        setRevenueData(revenueData.trends);
      } else {
        // Fallback to sample data if API fails
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
        const sampleRevenue = months.map((month, index) => ({
          month,
          actual: 2500 + Math.random() * 2000,
          projected: index >= 4 ? 3000 + Math.random() * 1500 : undefined,
        }));
        setRevenueData(sampleRevenue);
      }

      // Update stats with real revenue data
      if (revenueData && revenueData.trends) {
        const totalRevenue = revenueData.trends.reduce((sum: number, item: any) => sum + (item.actual || 0), 0);
        setStats(prev => ({
          ...prev,
          revenue: totalRevenue,
        }));
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    }
  };

  const handleRunAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      const result = await aiService.queueRevenueAnalysis('month');
      toast.success('AI analysis started! Results will be available shortly.');
      // In a real implementation, you'd poll for job status
      setTimeout(() => {
        loadDashboardData();
        setIsAnalyzing(false);
      }, 3000);
    } catch (error) {
      console.error('Failed to run analysis:', error);
      toast.error('Failed to start AI analysis');
      setIsAnalyzing(false);
    }
  };

  const handleAISubmit = async () => {
    if (!aiInput.trim() || !activeConversationId) return;

    const userMessage = aiInput.trim();
    setAiInput('');

    // Add user message to conversation
    dispatch(addMessage({
      conversationId: activeConversationId,
      message: {
        role: 'user',
        content: userMessage,
      },
    }));

    dispatch(setIsTyping(true));
    dispatch(setError(null));

    try {
      // Add placeholder AI message for streaming
      dispatch(addMessage({
        conversationId: activeConversationId,
        message: {
          role: 'assistant',
          content: '',
          isStreaming: true,
        },
      }));

      // Get conversation history (backend will add context-aware system prompt)
      const conversation = conversations.find(c => c.id === activeConversationId);
      const conversationMessages = conversation?.messages
        .filter(m => m.role !== 'system' && !m.isStreaming)
        .map(m => ({ role: m.role, content: m.content })) || [];

      // Send to AI service with full conversation history (no system prompt - backend handles it)
      await aiService.chatStreaming(
        {
          messages: conversationMessages,
        },
        // On token callback
        (token) => {
          dispatch(updateStreamingMessage({
            conversationId: activeConversationId,
            token,
          }));
        },
        // On complete callback
        (fullResponse) => {
          dispatch(finalizeStreamingMessage(activeConversationId));
          dispatch(setIsTyping(false));
        },
        // On error callback
        (error) => {
          dispatch(setError(error));
          dispatch(setIsTyping(false));
          dispatch(finalizeStreamingMessage(activeConversationId));
          toast.error('AI request failed');
        }
      );
    } catch (error) {
      console.error('AI chat error:', error);
      dispatch(setError('Failed to get AI response'));
      dispatch(setIsTyping(false));
      dispatch(finalizeStreamingMessage(activeConversationId));
      toast.error('Failed to send message to AI');
    }
  };

  const getSystemPromptForTab = (tab: 'assist' | 'automation' | 'insights'): string => {
    switch (tab) {
      case 'assist':
        return 'You are a helpful freelance assistant. Provide concise, actionable advice for managing freelance work, client communication, and business operations.';
      case 'automation':
        return 'You are an automation expert for freelancers. Suggest ways to automate repetitive tasks, optimize workflows, and improve efficiency.';
      case 'insights':
        return 'You are a business analyst for freelancers. Provide insights on revenue trends, client patterns, and growth opportunities based on the available data.';
      default:
        return 'You are a helpful freelance assistant.';
    }
  };

  const handleAITabChange = (tab: 'assist' | 'automation' | 'insights') => {
    dispatch(setActiveTab(tab));
  };

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      DRAFT: 'bg-gray-100 text-gray-800',
      IN_PROGRESS: 'bg-blue-100 text-blue-800',
      ON_REVIEW: 'bg-yellow-100 text-yellow-800',
      COMPLETED: 'bg-green-100 text-green-800',
      CANCELED: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const CustomDot = (props: any) => {
    const { cx, cy, payload } = props;
    if (payload.projected !== undefined) {
      return (
        <circle cx={cx} cy={cy} r={4} fill="#8b5cf6" stroke="#fff" strokeWidth={2} />
      );
    }
    return <Dot {...props} />;
  };

  return (
    <div className="space-y-6 pb-20">
      <h1 className="text-3xl font-bold text-gray-900">Overview</h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-white rounded-lg shadow p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Clients</p>
              <p className="text-3xl font-bold text-gray-900">{stats.clients}</p>
              <div className="flex items-center mt-2 text-sm">
                <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                <span className="text-green-500 font-medium">+{stats.clientsChange}</span>
                <span className="text-gray-500 ml-1">this month</span>
              </div>
            </div>
            <Users className="w-12 h-12 text-purple-500" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="bg-white rounded-lg shadow p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Revenue</p>
              <p className="text-3xl font-bold text-gray-900">${stats.revenue.toLocaleString()}</p>
              <div className="flex items-center mt-2 text-sm">
                <TrendingDown className="w-4 h-4 text-red-500 mr-1" />
                <span className="text-red-500 font-medium">{stats.revenueChange}%</span>
                <span className="text-gray-500 ml-1">vs last month</span>
              </div>
            </div>
            <DollarSign className="w-12 h-12 text-green-500" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="bg-white rounded-lg shadow p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Projects</p>
              <p className="text-3xl font-bold text-gray-900">{stats.projects}</p>
              <div className="flex items-center mt-2 text-sm">
                <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                <span className="text-green-500 font-medium">+{stats.projectsChange}</span>
                <span className="text-gray-500 ml-1">this month</span>
              </div>
            </div>
            <Briefcase className="w-12 h-12 text-blue-500" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
          className="bg-white rounded-lg shadow p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Tasks</p>
              <p className="text-3xl font-bold text-gray-900">{stats.tasks}</p>
              <p className="text-sm text-gray-500 mt-2">pending completion</p>
            </div>
            <CheckSquare className="w-12 h-12 text-orange-500" />
          </div>
        </motion.div>
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Chart */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.4 }}
          className="lg:col-span-2 bg-white rounded-lg shadow p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Revenue Trends</h2>
            <button
              onClick={handleRunAnalysis}
              disabled={isAnalyzing}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              {isAnalyzing ? 'Analyzing...' : 'Run AI Analysis'}
            </button>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value) => `$${value}`} />
              <Legend />
              <Line
                type="monotone"
                dataKey="actual"
                stroke="#3b82f6"
                strokeWidth={2}
                name="Actual Revenue"
              />
              <Line
                type="monotone"
                dataKey="projected"
                stroke="#8b5cf6"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={<CustomDot />}
                name="AI Projected"
              />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Priority Tasks */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.5 }}
          className="bg-white rounded-lg shadow p-6"
        >
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Priority Tasks</h2>
          <div className="space-y-3">
            {priorityTasks.length === 0 ? (
              <p className="text-gray-500 text-sm">No priority tasks yet</p>
            ) : (
              priorityTasks.map((task) => (
                <div key={task.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
                  <div className="flex-shrink-0 w-2 h-2 bg-orange-500 rounded-full mt-2" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{task.name}</p>
                    <p className="text-xs text-gray-500">
                      {task.category || 'General'} {task.dueDate && `• ${format(new Date(task.dueDate), 'MMM dd')}`}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>
      </div>

      {/* Projects Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.6 }}
        className="bg-white rounded-lg shadow overflow-hidden"
      >
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Recent Projects</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Project</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Due Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"></th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {projects.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                    No projects yet. Create your first project to get started!
                  </td>
                </tr>
              ) : (
                projects.map((project) => (
                  <tr
                    key={project.id}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => navigate(`/projects?id=${project.id}`)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          {project.client?.avatarUrl ? (
                            <img className="h-10 w-10 rounded-full" src={project.client.avatarUrl} alt="" />
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                              <span className="text-purple-600 font-medium text-sm">
                                {project.client?.name?.charAt(0) || 'C'}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{project.client?.name || 'Unknown'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{project.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{project.type || 'N/A'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {project.dueDate ? format(new Date(project.dueDate), 'MMM dd, yyyy') : 'No due date'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {project.budget ? `$${project.budget.toLocaleString()}` : 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(project.status)}`}>
                        {project.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        className="text-gray-400 hover:text-gray-600"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreVertical className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* AI Assistant Card */}
      {showAIChat && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.7 }}
          className="fixed bottom-6 right-6 w-96 bg-white rounded-lg shadow-2xl border border-gray-200 z-50"
        >
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-5 h-5 text-purple-600" />
            <h3 className="text-lg font-semibold text-gray-900">AI Assistant</h3>
            <button
              onClick={() => dispatch(createConversation({ title: 'AI Assistant' }))}
              className="ml-auto px-2 py-1 text-xs font-medium text-purple-600 hover:bg-purple-50 rounded-lg transition-colors flex items-center gap-1"
              title="Clear conversation and start fresh"
            >
              Clear conversation history
            </button>
            {isTyping && (
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-purple-600 rounded-full animate-pulse"></div>
                <div className="w-2 h-2 bg-purple-600 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-2 h-2 bg-purple-600 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
              </div>
            )}
            <button
              onClick={() => setShowAIChat(false)}
              className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
              title="Close AI Assistant"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="p-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Messages Display */}
          {activeConversationId && conversations.find(c => c.id === activeConversationId)?.messages.length ? (
            <div className="mb-3 max-h-64 overflow-y-auto space-y-2">
              {conversations.find(c => c.id === activeConversationId)?.messages.map((message) => (
                message.role !== 'system' && (
                  <div
                    key={message.id}
                    className={`p-3 rounded-lg ${
                      message.role === 'user'
                        ? 'bg-purple-100 ml-6'
                        : 'bg-gray-100 mr-6'
                    }`}
                  >
                    <div className="text-sm text-gray-800 prose prose-sm max-w-none prose-headings:text-gray-900 prose-p:text-gray-800 prose-strong:text-gray-900 prose-code:text-purple-700 prose-code:bg-purple-50 prose-code:px-1 prose-code:rounded prose-pre:bg-gray-800 prose-pre:text-gray-100 prose-a:text-purple-600 prose-table:text-xs">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {message.content}
                      </ReactMarkdown>
                    </div>
                  </div>
                )
              ))}
            </div>
          ) : (
            <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-4 mb-3">
              <p className="text-sm text-gray-700">
                {activeTab === 'assist' && "How can I help you today? Ask me to draft emails, summarize meetings, or assist with your work."}
                {activeTab === 'automation' && "I can automate tasks like generating invoices, scheduling follow-ups, and optimizing your workflow."}
                {activeTab === 'insights' && "Let me analyze your data and provide insights on revenue trends, client patterns, and growth opportunities."}
              </p>
            </div>
          )}

          <div className="flex gap-2">
            <input
              ref={aiInputRef}
              type="text"
              value={aiInput}
              onChange={(e) => setAiInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAISubmit()}
              placeholder="Ask me anything..."
              disabled={isTyping}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm disabled:opacity-50"
            />
            <button
              onClick={handleAISubmit}
              disabled={!aiInput.trim() || isTyping}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.div>
      )}

      {/* Floating button to reopen AI chat when closed */}
      {!showAIChat && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          onClick={() => setShowAIChat(true)}
          className="fixed bottom-6 right-6 p-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-full shadow-2xl hover:shadow-3xl transition-all hover:scale-110 z-50"
          title="Open AI Assistant"
        >
          <Sparkles className="w-6 h-6" />
        </motion.button>
      )}
    </div>
  );
};

export default Dashboard;
