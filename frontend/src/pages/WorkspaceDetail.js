import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { motion } from 'framer-motion';
import CountUp from 'react-countup';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Textarea } from '../components/ui/textarea';
import { ScrollArea } from '../components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { Switch } from '../components/ui/switch';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Users,
  MessageSquare,
  FileText,
  Megaphone,
  Settings,
  Play,
  Pause,
  Sparkles,
  MapPin,
  Search,
  Bot,
  Zap,
  Globe,
  RefreshCw,
  Target,
  TrendingUp
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const leadSources = [
  { key: 'google_maps', name: 'Google Maps', icon: '📍' },
  { key: 'yelp', name: 'Yelp', icon: '⭐' },
  { key: 'facebook', name: 'Facebook', icon: '📘' },
  { key: 'linkedin', name: 'LinkedIn', icon: '💼' },
  { key: 'instagram', name: 'Instagram', icon: '📸' },
  { key: 'yellow_pages', name: 'Yellow Pages', icon: '📒' },
  { key: 'chamber', name: 'Chamber of Commerce', icon: '🏛️' }
];

const LeadDiscoveryPanel = ({ workspaceId, workspace, onLeadsGenerated }) => {
  const { getAuthHeaders } = useAuth();
  const [location, setLocation] = useState('');
  const [source, setSource] = useState('google_maps');
  const [count, setCount] = useState(10);
  const [loading, setLoading] = useState(false);

  const handleDiscover = async () => {
    if (!location) {
      toast.error('Please enter a location');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(
        `${API}/discovery/generate?workspace_id=${workspaceId}&location=${encodeURIComponent(location)}&industry=${workspace.industry}&source=${source}&count=${count}`,
        {},
        { headers: getAuthHeaders() }
      );
      toast.success(`Discovered ${response.data.leads.length} leads!`);
      onLeadsGenerated();
    } catch (error) {
      toast.error('Failed to discover leads');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="bg-card border-border/40">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <CardTitle style={{ fontFamily: 'Barlow Condensed' }}>AI LEAD DISCOVERY</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Location</Label>
            <Input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Miami, FL"
              className="bg-background border-border rounded-none"
              data-testid="discovery-location"
            />
          </div>
          <div className="space-y-2">
            <Label>Source</Label>
            <Select value={source} onValueChange={setSource}>
              <SelectTrigger className="bg-background border-border rounded-none">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {leadSources.map((s) => (
                  <SelectItem key={s.key} value={s.key}>
                    {s.icon} {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-2">
          <Label>Number of Leads: {count}</Label>
          <input
            type="range"
            min="5"
            max="50"
            value={count}
            onChange={(e) => setCount(parseInt(e.target.value))}
            className="w-full"
          />
        </div>
        <Button
          onClick={handleDiscover}
          disabled={loading}
          className="w-full bg-primary rounded-none glow-primary"
          data-testid="discover-leads-btn"
        >
          {loading ? (
            <div className="status-working h-4 w-4 mr-2"></div>
          ) : (
            <Sparkles className="h-4 w-4 mr-2" />
          )}
          Discover Leads
        </Button>
      </CardContent>
    </Card>
  );
};

const WorkspaceDetail = () => {
  const { workspaceId } = useParams();
  const navigate = useNavigate();
  const { getAuthHeaders } = useAuth();
  
  const [workspace, setWorkspace] = useState(null);
  const [leads, setLeads] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [stats, setStats] = useState(null);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Campaign creation state
  const [showCampaignDialog, setShowCampaignDialog] = useState(false);
  const [campaignForm, setCampaignForm] = useState({
    name: '',
    campaign_type: 'sms',
    message_template: '',
    target_locations: [],
    ai_agent_enabled: true,
    follow_up_enabled: true
  });

  const fetchData = async () => {
    try {
      const [wsRes, leadsRes, campaignsRes, statsRes, activityRes] = await Promise.all([
        axios.get(`${API}/workspaces/${workspaceId}`, { headers: getAuthHeaders() }),
        axios.get(`${API}/leads?workspace_id=${workspaceId}&limit=50`, { headers: getAuthHeaders() }),
        axios.get(`${API}/campaigns?workspace_id=${workspaceId}`, { headers: getAuthHeaders() }),
        axios.get(`${API}/dashboard/stats?workspace_id=${workspaceId}`, { headers: getAuthHeaders() }),
        axios.get(`${API}/dashboard/activity?workspace_id=${workspaceId}&limit=10`, { headers: getAuthHeaders() })
      ]);
      setWorkspace(wsRes.data);
      setLeads(leadsRes.data);
      setCampaigns(campaignsRes.data);
      setStats(statsRes.data);
      setActivities(activityRes.data);
      
      // Pre-fill campaign template from workspace
      if (wsRes.data.templates?.sms_initial) {
        setCampaignForm(prev => ({
          ...prev,
          message_template: wsRes.data.templates.sms_initial,
          target_locations: wsRes.data.target_locations || []
        }));
      }
    } catch (error) {
      toast.error('Failed to load workspace');
      navigate('/workspaces');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [workspaceId]);

  const handleCreateCampaign = async () => {
    if (!campaignForm.name || !campaignForm.message_template) {
      toast.error('Name and message template are required');
      return;
    }

    try {
      await axios.post(`${API}/campaigns`, {
        workspace_id: workspaceId,
        name: campaignForm.name,
        campaign_type: campaignForm.campaign_type,
        target_industries: [workspace.industry],
        target_locations: campaignForm.target_locations,
        message_template: campaignForm.message_template,
        follow_up_enabled: campaignForm.follow_up_enabled,
        ai_agent_enabled: campaignForm.ai_agent_enabled,
        status: 'draft'
      }, { headers: getAuthHeaders() });
      
      toast.success('Campaign created');
      setShowCampaignDialog(false);
      fetchData();
    } catch (error) {
      toast.error('Failed to create campaign');
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-screen">
        <div className="status-working h-8 w-8"></div>
      </div>
    );
  }

  if (!workspace) return null;

  return (
    <div className="p-6 lg:p-8" data-testid="workspace-detail-page">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/workspaces')}
          className="rounded-none"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight" style={{ fontFamily: 'Barlow Condensed' }}>
            {workspace.name}
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline">{workspace.industry.replace(/_/g, ' ')}</Badge>
            <Badge className={workspace.status === 'active' ? 'bg-green-500' : 'bg-gray-500'}>
              {workspace.status}
            </Badge>
          </div>
        </div>
        <Button variant="outline" className="rounded-none" onClick={() => navigate(`/leads?workspace=${workspaceId}`)}>
          <Users className="h-4 w-4 mr-2" />
          View All Leads
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
        <Card className="bg-card border-border/40">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold" style={{ fontFamily: 'Barlow Condensed' }}>
              <CountUp end={stats?.total_leads || 0} duration={2} />
            </p>
            <p className="text-xs text-muted-foreground">Total Leads</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/40">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-blue-400" style={{ fontFamily: 'Barlow Condensed' }}>
              <CountUp end={stats?.leads_today || 0} duration={2} />
            </p>
            <p className="text-xs text-muted-foreground">Today</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/40">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold" style={{ fontFamily: 'Barlow Condensed' }}>
              <CountUp end={stats?.messages_sent || 0} duration={2} />
            </p>
            <p className="text-xs text-muted-foreground">Messages</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/40">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-purple-400" style={{ fontFamily: 'Barlow Condensed' }}>
              <CountUp end={stats?.responses || 0} duration={2} />
            </p>
            <p className="text-xs text-muted-foreground">Responses</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/40">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-yellow-400" style={{ fontFamily: 'Barlow Condensed' }}>
              <CountUp end={stats?.appointments_booked || 0} duration={2} />
            </p>
            <p className="text-xs text-muted-foreground">Appointments</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/40">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-green-400" style={{ fontFamily: 'Barlow Condensed' }}>
              <CountUp end={stats?.deals_closed || 0} duration={2} />
            </p>
            <p className="text-xs text-muted-foreground">Closed</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Lead Discovery & Campaigns */}
        <div className="lg:col-span-2 space-y-6">
          {/* Lead Discovery */}
          <LeadDiscoveryPanel 
            workspaceId={workspaceId} 
            workspace={workspace}
            onLeadsGenerated={fetchData}
          />

          {/* Campaigns */}
          <Card className="bg-card border-border/40">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle style={{ fontFamily: 'Barlow Condensed' }}>CAMPAIGNS</CardTitle>
                <Dialog open={showCampaignDialog} onOpenChange={setShowCampaignDialog}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="rounded-none bg-secondary">
                      <Megaphone className="h-4 w-4 mr-2" />
                      New Campaign
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-card border-border max-w-2xl">
                    <DialogHeader>
                      <DialogTitle style={{ fontFamily: 'Barlow Condensed' }}>CREATE CAMPAIGN</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Campaign Name</Label>
                          <Input
                            value={campaignForm.name}
                            onChange={(e) => setCampaignForm({...campaignForm, name: e.target.value})}
                            placeholder="e.g., Restaurant Outreach"
                            className="bg-background border-border rounded-none"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Channel</Label>
                          <Select 
                            value={campaignForm.campaign_type} 
                            onValueChange={(v) => {
                              const templateKey = v === 'sms' ? 'sms_initial' : 'email_initial';
                              setCampaignForm({
                                ...campaignForm, 
                                campaign_type: v,
                                message_template: workspace.templates?.[templateKey] || ''
                              });
                            }}
                          >
                            <SelectTrigger className="bg-background border-border rounded-none">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="sms">SMS</SelectItem>
                              <SelectItem value="email">Email</SelectItem>
                              <SelectItem value="voice">Voice</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Message Template</Label>
                        <Textarea
                          value={campaignForm.message_template}
                          onChange={(e) => setCampaignForm({...campaignForm, message_template: e.target.value})}
                          className="bg-background border-border rounded-none min-h-[120px]"
                          placeholder="Use {{owner_name}}, {{business_name}}, {{industry}}, {{city}} for personalization"
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={campaignForm.ai_agent_enabled}
                            onCheckedChange={(v) => setCampaignForm({...campaignForm, ai_agent_enabled: v})}
                          />
                          <Label>AI Agent Enabled</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={campaignForm.follow_up_enabled}
                            onCheckedChange={(v) => setCampaignForm({...campaignForm, follow_up_enabled: v})}
                          />
                          <Label>Auto Follow-up</Label>
                        </div>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="ghost" onClick={() => setShowCampaignDialog(false)} className="rounded-none">
                        Cancel
                      </Button>
                      <Button onClick={handleCreateCampaign} className="rounded-none bg-primary">
                        Create Campaign
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {campaigns.length > 0 ? (
                <div className="space-y-3">
                  {campaigns.map((campaign) => (
                    <div
                      key={campaign.id}
                      className="p-4 border border-border/40 rounded-sm flex items-center justify-between"
                    >
                      <div>
                        <p className="font-medium">{campaign.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {campaign.campaign_type.toUpperCase()}
                          </Badge>
                          <Badge className={campaign.status === 'active' ? 'bg-green-500' : 'bg-gray-500'}>
                            {campaign.status}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>{campaign.leads_contacted} contacted</span>
                        <span>{campaign.responses} responses</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-muted-foreground">
                  <Megaphone className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No campaigns yet</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Leads */}
          <Card className="bg-card border-border/40">
            <CardHeader>
              <CardTitle style={{ fontFamily: 'Barlow Condensed' }}>RECENT LEADS</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px]">
                {leads.length > 0 ? (
                  <div className="space-y-2">
                    {leads.slice(0, 10).map((lead) => (
                      <div
                        key={lead.id}
                        className="p-3 border border-border/40 rounded-sm flex items-center justify-between hover:bg-muted/50 cursor-pointer"
                        onClick={() => navigate(`/leads/${lead.id}`)}
                      >
                        <div>
                          <p className="font-medium">{lead.business_name}</p>
                          <p className="text-sm text-muted-foreground">
                            {lead.city}, {lead.state} • {lead.source}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className={`text-lg font-bold ${lead.score >= 70 ? 'text-green-400' : lead.score >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                            {lead.score}
                          </p>
                          <Badge variant="outline" className="text-xs">{lead.pipeline_stage}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center text-muted-foreground">
                    <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No leads discovered yet</p>
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Activity & Templates */}
        <div className="space-y-6">
          {/* AI Activity */}
          <Card className="bg-card border-border/40">
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="status-live h-2 w-2 rounded-full"></div>
                <CardTitle className="text-sm">AI AGENT ACTIVITY</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[250px]">
                {activities.length > 0 ? (
                  <div className="space-y-3">
                    {activities.map((activity) => (
                      <div key={activity.id} className="flex items-start gap-3">
                        <div className="h-6 w-6 bg-primary/20 rounded-sm flex items-center justify-center flex-shrink-0">
                          <Bot className="h-3 w-3 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs truncate">{activity.description}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(activity.timestamp).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground py-4">
                    <p className="text-sm">No recent activity</p>
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Templates Preview */}
          <Card className="bg-card border-border/40">
            <CardHeader>
              <CardTitle className="text-sm">MESSAGE TEMPLATES</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="p-3 bg-muted/50 rounded-sm">
                <p className="text-xs text-muted-foreground mb-1">SMS Initial</p>
                <p className="text-xs line-clamp-3">
                  {workspace.templates?.sms_initial || 'No template configured'}
                </p>
              </div>
              <div className="p-3 bg-muted/50 rounded-sm">
                <p className="text-xs text-muted-foreground mb-1">Follow-up</p>
                <p className="text-xs line-clamp-3">
                  {workspace.templates?.sms_followup || 'No template configured'}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Target Locations */}
          <Card className="bg-card border-border/40">
            <CardHeader>
              <CardTitle className="text-sm">TARGET LOCATIONS</CardTitle>
            </CardHeader>
            <CardContent>
              {workspace.target_locations?.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {workspace.target_locations.map((loc, i) => (
                    <Badge key={i} variant="outline" className="text-xs">
                      <MapPin className="h-3 w-3 mr-1" />
                      {loc}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No locations configured</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default WorkspaceDetail;
