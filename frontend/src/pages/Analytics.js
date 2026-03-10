import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import CountUp from 'react-countup';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Progress } from '../components/ui/progress';
import { 
  BarChart as RechartsBarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Area,
  AreaChart
} from 'recharts';
import { 
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Target,
  Percent
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const COLORS = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#F43F5E', '#6B7280'];

const Analytics = () => {
  const [conversionData, setConversionData] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const { getAuthHeaders } = useAuth();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [convRes, statsRes] = await Promise.all([
          axios.get(`${API}/analytics/conversion`, { headers: getAuthHeaders() }),
          axios.get(`${API}/dashboard/stats`, { headers: getAuthHeaders() })
        ]);
        setConversionData(convRes.data);
        setStats(statsRes.data);
      } catch (error) {
        console.error('Failed to fetch analytics:', error);
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

  const funnelData = [
    { name: 'Total Leads', value: conversionData?.total_leads || 0, color: '#3B82F6' },
    { name: 'Contacted', value: conversionData?.contacted || 0, color: '#8B5CF6' },
    { name: 'Interested', value: conversionData?.interested || 0, color: '#F59E0B' },
    { name: 'Closed', value: conversionData?.closed || 0, color: '#10B981' },
  ];

  const pipelineData = stats?.pipeline_stats ? Object.entries(stats.pipeline_stats).map(([key, value]) => ({
    name: key.replace('_', ' ').charAt(0).toUpperCase() + key.replace('_', ' ').slice(1),
    value
  })) : [];

  const conversionRates = [
    { name: 'Contact Rate', value: conversionData?.contact_rate || 0 },
    { name: 'Interest Rate', value: conversionData?.interest_rate || 0 },
    { name: 'Close Rate', value: conversionData?.close_rate || 0 },
    { name: 'Overall', value: conversionData?.overall_conversion || 0 },
  ];

  // Simulated monthly data for revenue chart
  const revenueData = [
    { month: 'Jan', revenue: 0 },
    { month: 'Feb', revenue: 150 },
    { month: 'Mar', revenue: 450 },
    { month: 'Apr', revenue: 750 },
    { month: 'May', revenue: 1200 },
    { month: 'Jun', revenue: stats?.monthly_residual || 0 },
  ];

  return (
    <div className="p-6 lg:p-8" data-testid="analytics-page">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight" style={{ fontFamily: 'Barlow Condensed' }}>
          ANALYTICS
        </h1>
        <p className="text-muted-foreground mt-1">
          Performance metrics and conversion analytics
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="bg-card border-border/40">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Contact Rate</p>
                  <p className="text-3xl font-bold" style={{ fontFamily: 'Barlow Condensed' }}>
                    <CountUp end={conversionData?.contact_rate || 0} decimals={1} duration={2} />%
                  </p>
                </div>
                <div className="h-12 w-12 bg-blue-500/20 rounded-sm flex items-center justify-center">
                  <Users className="h-6 w-6 text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="bg-card border-border/40">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Interest Rate</p>
                  <p className="text-3xl font-bold" style={{ fontFamily: 'Barlow Condensed' }}>
                    <CountUp end={conversionData?.interest_rate || 0} decimals={1} duration={2} />%
                  </p>
                </div>
                <div className="h-12 w-12 bg-purple-500/20 rounded-sm flex items-center justify-center">
                  <Target className="h-6 w-6 text-purple-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="bg-card border-border/40">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Close Rate</p>
                  <p className="text-3xl font-bold" style={{ fontFamily: 'Barlow Condensed' }}>
                    <CountUp end={conversionData?.close_rate || 0} decimals={1} duration={2} />%
                  </p>
                </div>
                <div className="h-12 w-12 bg-green-500/20 rounded-sm flex items-center justify-center">
                  <Percent className="h-6 w-6 text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="bg-card border-border/40">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Monthly Residual</p>
                  <p className="text-3xl font-bold text-green-400" style={{ fontFamily: 'Barlow Condensed' }}>
                    $<CountUp end={stats?.monthly_residual || 0} duration={2} />
                  </p>
                </div>
                <div className="h-12 w-12 bg-green-500/20 rounded-sm flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Sales Funnel */}
        <Card className="bg-card border-border/40">
          <CardHeader>
            <CardTitle style={{ fontFamily: 'Barlow Condensed' }}>SALES FUNNEL</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsBarChart data={funnelData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272A" />
                  <XAxis type="number" stroke="#9CA3AF" />
                  <YAxis dataKey="name" type="category" stroke="#9CA3AF" width={80} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#121212',
                      border: '1px solid #27272A',
                      borderRadius: '4px'
                    }}
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {funnelData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </RechartsBarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Pipeline Distribution */}
        <Card className="bg-card border-border/40">
          <CardHeader>
            <CardTitle style={{ fontFamily: 'Barlow Condensed' }}>PIPELINE DISTRIBUTION</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pipelineData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {pipelineData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#121212',
                      border: '1px solid #27272A',
                      borderRadius: '4px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Growth */}
        <Card className="bg-card border-border/40">
          <CardHeader>
            <CardTitle style={{ fontFamily: 'Barlow Condensed' }}>RESIDUAL REVENUE GROWTH</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272A" />
                  <XAxis dataKey="month" stroke="#9CA3AF" />
                  <YAxis stroke="#9CA3AF" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#121212',
                      border: '1px solid #27272A',
                      borderRadius: '4px'
                    }}
                    formatter={(value) => [`$${value}`, 'Revenue']}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#10B981"
                    fill="url(#colorRevenue)"
                  />
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Conversion Rates */}
        <Card className="bg-card border-border/40">
          <CardHeader>
            <CardTitle style={{ fontFamily: 'Barlow Condensed' }}>CONVERSION RATES</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {conversionRates.map((rate, index) => (
                <div key={rate.name}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">{rate.name}</span>
                    <span className="font-bold" style={{ fontFamily: 'Barlow Condensed' }}>
                      {rate.value.toFixed(1)}%
                    </span>
                  </div>
                  <Progress 
                    value={rate.value} 
                    className="h-3"
                    style={{
                      '--progress-background': COLORS[index % COLORS.length]
                    }}
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Projections */}
      <Card className="bg-card border-border/40 mt-6">
        <CardHeader>
          <CardTitle style={{ fontFamily: 'Barlow Condensed' }}>REVENUE PROJECTIONS</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 bg-muted/50 rounded-sm text-center">
              <p className="text-sm text-muted-foreground mb-2">If 50 merchants closed</p>
              <p className="text-4xl font-bold text-green-400" style={{ fontFamily: 'Barlow Condensed' }}>
                $7,500
              </p>
              <p className="text-xs text-muted-foreground mt-1">Monthly Residual</p>
            </div>
            <div className="p-6 bg-muted/50 rounded-sm text-center">
              <p className="text-sm text-muted-foreground mb-2">If 100 merchants closed</p>
              <p className="text-4xl font-bold text-green-400" style={{ fontFamily: 'Barlow Condensed' }}>
                $15,000
              </p>
              <p className="text-xs text-muted-foreground mt-1">Monthly Residual</p>
            </div>
            <div className="p-6 bg-muted/50 rounded-sm text-center">
              <p className="text-sm text-muted-foreground mb-2">If 500 merchants closed</p>
              <p className="text-4xl font-bold text-green-400" style={{ fontFamily: 'Barlow Condensed' }}>
                $75,000
              </p>
              <p className="text-xs text-muted-foreground mt-1">Monthly Residual</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground text-center mt-4">
            *Based on average $150/month residual per merchant
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Analytics;
