import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import CountUp from 'react-countup';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { ScrollArea } from '../components/ui/scroll-area';
import { 
  Users, 
  MessageSquare, 
  FileText, 
  DollarSign, 
  TrendingUp,
  Phone,
  Mail,
  Bot,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Activity
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const MetricCard = ({ title, value, icon: Icon, change, changeType, prefix = '', suffix = '' }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3 }}
  >
    <Card className="bg-card border-border/40 card-hover overflow-hidden relative">
      <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-primary/10 to-transparent rounded-bl-full"></div>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground mb-1">{title}</p>
            <h3 className="text-3xl font-bold tracking-tight" style={{ fontFamily: 'Barlow Condensed' }}>
              {prefix}
              <CountUp end={value} duration={2} separator="," />
              {suffix}
            </h3>
            {change !== undefined && (
              <div className={`flex items-center gap-1 mt-2 text-xs ${changeType === 'up' ? 'text-green-400' : 'text-red-400'}`}>
                {changeType === 'up' ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                <span>{change}% from last week</span>
              </div>
            )}
          </div>
          <div className="h-12 w-12 bg-primary/20 rounded-sm flex items-center justify-center">
            <Icon className="h-6 w-6 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  </motion.div>
);

const PipelineCard = ({ stats }) => {
  const stages = [
    { key: 'new', label: 'New', color: 'bg-gray-500' },
    { key: 'contacted', label: 'Contacted', color: 'bg-blue-500' },
    { key: 'interested', label: 'Interested', color: 'bg-purple-500' },
    { key: 'statement_received', label: 'Statement', color: 'bg-yellow-500' },
    { key: 'proposal_sent', label: 'Proposal', color: 'bg-orange-500' },
    { key: 'closed', label: 'Closed', color: 'bg-green-500' },
  ];

  const total = Object.values(stats).reduce((a, b) => a + b, 0);

  return (
    <Card className="bg-card border-border/40">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-bold" style={{ fontFamily: 'Barlow Condensed' }}>
          PIPELINE OVERVIEW
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {stages.map((stage) => {
            const count = stats[stage.key] || 0;
            const percentage = total > 0 ? (count / total) * 100 : 0;
            return (
              <div key={stage.key} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{stage.label}</span>
                  <span className="font-medium">{count}</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    className={`h-full ${stage.color}`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

const ActivityItem = ({ activity }) => {
  const getIcon = () => {
    switch (activity.activity_type) {
      case 'lead_created':
      case 'lead_generation':
        return <Users className="h-4 w-4" />;
      case 'sms_sent':
        return <MessageSquare className="h-4 w-4" />;
      case 'email_sent':
        return <Mail className="h-4 w-4" />;
      case 'call_made':
        return <Phone className="h-4 w-4" />;
      case 'statement_analyzed':
        return <FileText className="h-4 w-4" />;
      default:
        return <Bot className="h-4 w-4" />;
    }
  };

  const getStatusColor = () => {
    switch (activity.status) {
      case 'completed':
        return 'bg-green-500/20 text-green-400';
      case 'pending':
        return 'bg-yellow-500/20 text-yellow-400';
      case 'failed':
        return 'bg-red-500/20 text-red-400';
      default:
        return 'bg-blue-500/20 text-blue-400';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-start gap-3 p-3 rounded-sm hover:bg-muted/50 transition-colors"
    >
      <div className={`h-8 w-8 rounded-sm flex items-center justify-center ${getStatusColor()}`}>
        {getIcon()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{activity.description}</p>
        <div className="flex items-center gap-2 mt-1">
          <Badge variant="outline" className="text-xs">
            {activity.activity_type.replace('_', ' ')}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {new Date(activity.timestamp).toLocaleTimeString()}
          </span>
        </div>
      </div>
    </motion.div>
  );
};

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const { getAuthHeaders } = useAuth();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, activityRes] = await Promise.all([
          axios.get(`${API}/dashboard/stats`, { headers: getAuthHeaders() }),
          axios.get(`${API}/dashboard/activity`, { headers: getAuthHeaders() })
        ]);
        setStats(statsRes.data);
        setActivities(activityRes.data);
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [getAuthHeaders]);

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-screen">
        <div className="status-working h-8 w-8"></div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8" data-testid="dashboard-page">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight" style={{ fontFamily: 'Barlow Condensed' }}>
          DASHBOARD
        </h1>
        <p className="text-muted-foreground mt-1">
          Monitor your AI sales agent performance and pipeline
        </p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Total Leads"
          value={stats?.total_leads || 0}
          icon={Users}
          change={12}
          changeType="up"
        />
        <MetricCard
          title="Messages Sent"
          value={stats?.messages_sent || 0}
          icon={MessageSquare}
          change={8}
          changeType="up"
        />
        <MetricCard
          title="Statements Analyzed"
          value={stats?.statements_analyzed || 0}
          icon={FileText}
          change={24}
          changeType="up"
        />
        <MetricCard
          title="Monthly Residual"
          value={stats?.monthly_residual || 0}
          icon={DollarSign}
          prefix="$"
          change={15}
          changeType="up"
        />
      </div>

      {/* Second Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Leads Today"
          value={stats?.leads_today || 0}
          icon={TrendingUp}
        />
        <MetricCard
          title="Responses"
          value={stats?.responses || 0}
          icon={MessageSquare}
        />
        <MetricCard
          title="Deals Closed"
          value={stats?.deals_closed || 0}
          icon={DollarSign}
        />
        <MetricCard
          title="Response Rate"
          value={stats?.responses && stats?.messages_sent ? Math.round((stats.responses / stats.messages_sent) * 100) : 0}
          icon={Activity}
          suffix="%"
        />
      </div>

      {/* Pipeline and Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pipeline Overview */}
        <div className="lg:col-span-1">
          <PipelineCard stats={stats?.pipeline_stats || {}} />
        </div>

        {/* AI Activity Feed */}
        <div className="lg:col-span-2">
          <Card className="bg-card border-border/40 h-full">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-bold" style={{ fontFamily: 'Barlow Condensed' }}>
                  AI AGENT ACTIVITY
                </CardTitle>
                <div className="flex items-center gap-2">
                  <div className="status-live h-2 w-2 rounded-full"></div>
                  <span className="text-xs text-muted-foreground">Live</span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px] pr-4">
                {activities.length > 0 ? (
                  <div className="space-y-2">
                    {activities.map((activity, index) => (
                      <ActivityItem key={activity.id || index} activity={activity} />
                    ))}
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground">
                    <div className="text-center">
                      <Bot className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>No recent activity</p>
                      <p className="text-sm">AI agent is waiting for tasks</p>
                    </div>
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
