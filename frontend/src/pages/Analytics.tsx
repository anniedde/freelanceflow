import { useEffect, useState } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { TrendingUp, Activity, Sparkles, DollarSign, Clock, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';

interface RevenueData {
  month: string;
  actual?: number;
  projected?: number;
}

interface AIInsight {
  id: string;
  type: 'opportunity' | 'warning' | 'recommendation';
  message: string;
  priority: 'high' | 'medium' | 'low';
}

const Analytics = () => {
  const [revenueData, setRevenueData] = useState<RevenueData[]>([]);
  const [activityMetrics, setActivityMetrics] = useState({
    avgCycleTime: 0,
    clientRetention: 0,
    projectsCompleted: 0,
    avgProjectValue: 0,
  });
  const [aiInsights, setAiInsights] = useState<AIInsight[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('year');
  const [aiConfidence, setAiConfidence] = useState<number | null>(null);
  const [rSquared, setRSquared] = useState<number | null>(null);
  const [clientDistribution, setClientDistribution] = useState<Array<{ name: string; value: number; color: string }>>([]);

  useEffect(() => {
    loadAnalyticsData();
    loadClientDistribution();
  }, [selectedPeriod]);

  const loadClientDistribution = async () => {
    try {
      const clients: any = await api.getClients();
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      let active = 0;
      let inactive = 0;
      let newClients = 0;

      clients.forEach((client: any) => {
        const createdAt = new Date(client.createdAt);
        const lastContact = client.lastContact ? new Date(client.lastContact) : null;

        // New: created within last 30 days
        if (createdAt >= thirtyDaysAgo) {
          newClients++;
        }
        // Active: contacted within last 30 days
        else if (lastContact && lastContact >= thirtyDaysAgo) {
          active++;
        }
        // Inactive: not contacted recently or never
        else {
          inactive++;
        }
      });

      setClientDistribution([
        { name: 'Active', value: active, color: '#10b981' },
        { name: 'Inactive', value: inactive, color: '#6b7280' },
        { name: 'New', value: newClients, color: '#3b82f6' },
      ]);
    } catch (error) {
      console.error('Failed to load client distribution:', error);
    }
  };

  const loadAnalyticsData = async () => {
    try {
      const response: any = await api.getRevenue(selectedPeriod);

      // Revenue data - trends now include both actual and fitted regression values
      if (response.trends) {
        const combined: RevenueData[] = response.trends.map((t: any) => ({
          month: t.month,
          actual: t.actual,
          projected: t.projected, // Regression fitted value for this month
        }));

        // Add future projections
        if (response.projections && response.projections.length > 0) {
          response.projections.forEach((p: any) => {
            combined.push({
              month: p.month,
              projected: p.projected,
            });
          });
        }

        setRevenueData(combined);
        setRSquared(response.rSquared);
      }

      // Activity metrics
      if (response.metrics) {
        setActivityMetrics(response.metrics);
      }

      // Basic insights from backend (rule-based)
      if (response.insights && response.insights.length > 0) {
        setAiInsights(response.insights);
      }
    } catch (error) {
      console.error('Failed to load analytics data:', error);
      toast.error('Failed to load analytics data');
    }
  };

  const loadDemoData = () => {
    // Demo revenue data with projections connected to last actual
    setRevenueData([
      { month: 'Jan', actual: 2800 },
      { month: 'Feb', actual: 3200 },
      { month: 'Mar', actual: 2950 },
      { month: 'Apr', actual: 3600 },
      { month: 'May', actual: 3400 },
      { month: 'Jun', actual: 3800, projected: 3800 }, // Connection point
      { month: 'Jul', projected: 4000 },
      { month: 'Aug', projected: 4200 },
      { month: 'Sep', projected: 4100 },
    ]);
    setRSquared(0.85); // Demo R² value

    // Demo activity metrics
    setActivityMetrics({
      avgCycleTime: 18.5,
      clientRetention: 85,
      projectsCompleted: 22,
      avgProjectValue: 1620,
    });

    // Demo basic insights
    setAiInsights([
      {
        id: '1',
        type: 'opportunity',
        message: 'Revenue is trending upward. Great time to take on new projects!',
        priority: 'medium',
      },
      {
        id: '2',
        type: 'recommendation',
        message: 'Consider following up with inactive clients to boost retention.',
        priority: 'low',
      },
    ]);
  };

  const handleRunAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      const response: any = await api.runAnalysis({ period: selectedPeriod });

      if (response.analysis && response.analysis.insights) {
        setAiInsights(response.analysis.insights);
        setAiConfidence(response.analysis.confidence || null);
        toast.success(`AI analysis completed! Generated ${response.analysis.insights.length} insights with ${response.analysis.confidence}% confidence.`);
      } else {
        toast.success('AI analysis completed!');
      }
    } catch (error: any) {
      console.error('Analysis error:', error);
      if (error.message && error.message.includes('AI features are disabled')) {
        toast.error('AI features are disabled. Please add your GROK_API_KEY to enable AI analysis.');
      } else {
        toast.error(error.message || 'Failed to run AI analysis');
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getInsightColor = (type: string) => {
    switch (type) {
      case 'opportunity':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'warning':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'recommendation':
        return 'bg-blue-50 border-blue-200 text-blue-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'opportunity':
        return <TrendingUp className="w-5 h-5 text-green-600" />;
      case 'warning':
        return <Activity className="w-5 h-5 text-red-600" />;
      case 'recommendation':
        return <Sparkles className="w-5 h-5 text-blue-600" />;
      default:
        return <Activity className="w-5 h-5 text-gray-600" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
        <select
          value={selectedPeriod}
          onChange={(e) => setSelectedPeriod(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        >
          <option value="week">This Week</option>
          <option value="month">This Month</option>
          <option value="quarter">This Quarter</option>
          <option value="year">This Year</option>
        </select>
      </div>

      {/* Revenue Section */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-green-600" />
            <h2 className="text-2xl font-semibold text-gray-900">Revenue Trends & Forecasts</h2>
          </div>
          {rSquared !== null && rSquared >= 0 && (
            <span className="px-3 py-1 text-sm font-medium bg-blue-100 text-blue-700 rounded-full" title="R-squared: measures how well the curve fits the data">
              Model Fit: {(rSquared * 100).toFixed(1)}%
            </span>
          )}
        </div>

        {/* Revenue Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-4 border border-green-200">
            <p className="text-sm text-gray-600 mb-1">Total Revenue (YTD)</p>
            <p className="text-3xl font-bold text-gray-900">
              ${revenueData.reduce((sum, d) => sum + (d.actual || 0), 0).toLocaleString()}
            </p>
            <p className="text-sm text-green-600 mt-1 flex items-center gap-1">
              <TrendingUp className="w-4 h-4" />
              +12% vs last period
            </p>
          </div>
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
            <p className="text-sm text-gray-600 mb-1">Projected (Future)</p>
            <p className="text-3xl font-bold text-gray-900">
              ${revenueData.filter(d => d.projected).reduce((sum, d) => sum + (d.projected || 0), 0).toLocaleString()}
            </p>
            <p className="text-sm text-blue-600 mt-1">Polynomial regression</p>
          </div>
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-4 border border-purple-200">
            <p className="text-sm text-gray-600 mb-1">Avg Monthly Revenue</p>
            <p className="text-3xl font-bold text-gray-900">
              ${Math.round(revenueData.reduce((sum, d) => sum + (d.actual || 0), 0) / revenueData.filter(d => d.actual).length || 0).toLocaleString()}
            </p>
            <p className="text-sm text-purple-600 mt-1">Based on actuals</p>
          </div>
        </div>

        {/* Revenue Chart */}
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="month" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                }}
              />
              <Legend />
              {/* Render regression line first (behind) */}
              <Line
                type="monotone"
                dataKey="projected"
                stroke="#3b82f6"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={{ fill: '#3b82f6', r: 4 }}
                name="Regression Fit"
                connectNulls={true}
              />
              {/* Render actual data on top */}
              <Line
                type="monotone"
                dataKey="actual"
                stroke="#10b981"
                strokeWidth={3}
                dot={{ fill: '#10b981', r: 5 }}
                name="Actual Revenue"
                connectNulls={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Activity Metrics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Activity Stats */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center gap-2 mb-6">
            <Activity className="w-6 h-6 text-orange-600" />
            <h2 className="text-2xl font-semibold text-gray-900">Activity Metrics</h2>
          </div>

          <div className="space-y-4">
            {/* Avg Cycle Time */}
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-orange-50 to-red-50 rounded-lg border border-orange-200">
              <div className="flex items-center gap-3">
                <Clock className="w-8 h-8 text-orange-600" />
                <div>
                  <p className="text-sm text-gray-600">Avg Project Cycle Time</p>
                  <p className="text-2xl font-bold text-gray-900">{activityMetrics.avgCycleTime} days</p>
                </div>
              </div>
            </div>

            {/* Client Retention */}
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
              <div className="flex items-center gap-3">
                <Users className="w-8 h-8 text-green-600" />
                <div>
                  <p className="text-sm text-gray-600">Client Retention Rate</p>
                  <p className="text-2xl font-bold text-gray-900">{activityMetrics.clientRetention}%</p>
                </div>
              </div>
            </div>

            {/* Projects Completed */}
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
              <div className="flex items-center gap-3">
                <TrendingUp className="w-8 h-8 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-600">Projects Completed</p>
                  <p className="text-2xl font-bold text-gray-900">{activityMetrics.projectsCompleted}</p>
                </div>
              </div>
            </div>

            {/* Avg Project Value */}
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200">
              <div className="flex items-center gap-3">
                <DollarSign className="w-8 h-8 text-purple-600" />
                <div>
                  <p className="text-sm text-gray-600">Avg Project Value</p>
                  <p className="text-2xl font-bold text-gray-900">${activityMetrics.avgProjectValue}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Client Distribution */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center gap-2 mb-6">
            <Users className="w-6 h-6 text-blue-600" />
            <h2 className="text-2xl font-semibold text-gray-900">Client Distribution</h2>
          </div>

          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={clientDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {clientDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-3">
            {clientDistribution.map((item) => (
              <div key={item.name} className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="w-4 h-4 rounded-full mx-auto mb-2" style={{ backgroundColor: item.color }} />
                <p className="text-sm text-gray-600">{item.name}</p>
                <p className="text-xl font-bold text-gray-900">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* AI Insights Section */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-purple-600" />
            <h2 className="text-2xl font-semibold text-gray-900">Business Insights</h2>
            {aiConfidence !== null ? (
              <span className="ml-2 px-2 py-1 text-xs font-semibold bg-purple-100 text-purple-700 rounded-full">
                Grok AI
              </span>
            ) : (
              <span className="ml-2 px-2 py-1 text-xs font-semibold bg-gray-100 text-gray-700 rounded-full">
                Basic
              </span>
            )}
          </div>
          {aiConfidence !== null && (
            <span className="px-3 py-1 text-sm font-medium bg-blue-100 text-blue-700 rounded-full">
              {aiConfidence}% Confidence
            </span>
          )}
        </div>

        {isAnalyzing ? (
          <div className="text-center py-12">
            <div className="relative">
              <Sparkles className="w-16 h-16 text-purple-600 mx-auto mb-4 animate-pulse" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-20 h-20 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
              </div>
            </div>
            <p className="text-gray-900 font-medium mb-2">Analyzing your business data...</p>
            <p className="text-sm text-gray-600">Grok AI is generating personalized insights for you</p>
          </div>
        ) : aiInsights.length === 0 ? (
          <div className="text-center py-12">
            <Sparkles className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-900 font-medium mb-2">No insights available yet</p>
            <p className="text-sm text-gray-600">
              Add some data (invoices, projects, clients) to see insights
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {aiInsights.map((insight) => (
              <div
                key={insight.id}
                className={`p-4 rounded-lg border-2 ${getInsightColor(insight.type)} transition-all hover:shadow-md`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-1">{getInsightIcon(insight.type)}</div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <p className="text-sm font-medium">{insight.message}</p>
                      <span
                        className={`ml-2 px-2 py-1 text-xs font-semibold rounded-full ${
                          insight.priority === 'high'
                            ? 'bg-red-100 text-red-700'
                            : insight.priority === 'medium'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {insight.priority}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Analytics;
