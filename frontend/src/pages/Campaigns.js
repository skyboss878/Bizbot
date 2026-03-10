import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Textarea } from '../components/ui/textarea';
import { ScrollArea } from '../components/ui/scroll-area';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../components/ui/dialog';
import { toast } from 'sonner';
import { 
  Megaphone,
  Plus,
  Play,
  Pause,
  MessageSquare,
  Mail,
  Phone,
  Users,
  Clock,
  BarChart
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const industries = [
  'Restaurant',
  'Barbershop',
  'Nail Salon',
  'Auto Repair',
  'Smoke Shop',
  'Liquor Store',
  'Convenience Store',
  'Car Wash',
  'Retail'
];

const CampaignCard = ({ campaign, onStatusChange }) => {
  const getTypeIcon = () => {
    switch (campaign.campaign_type) {
      case 'sms':
        return <MessageSquare className="h-5 w-5" />;
      case 'email':
        return <Mail className="h-5 w-5" />;
      case 'voice':
        return <Phone className="h-5 w-5" />;
      default:
        return <Megaphone className="h-5 w-5" />;
    }
  };

  const getTypeColor = () => {
    switch (campaign.campaign_type) {
      case 'sms':
        return 'bg-blue-500/20 text-blue-400';
      case 'email':
        return 'bg-purple-500/20 text-purple-400';
      case 'voice':
        return 'bg-green-500/20 text-green-400';
      default:
        return 'bg-gray-500/20 text-gray-400';
    }
  };

  const getStatusColor = () => {
    switch (campaign.status) {
      case 'active':
        return 'bg-green-500';
      case 'paused':
        return 'bg-yellow-500';
      case 'completed':
        return 'bg-blue-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card className="bg-card border-border/40 card-hover">
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={`h-12 w-12 rounded-sm flex items-center justify-center ${getTypeColor()}`}>
                {getTypeIcon()}
              </div>
              <div>
                <h3 className="font-semibold">{campaign.name}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-xs">
                    {campaign.campaign_type.toUpperCase()}
                  </Badge>
                  <Badge className={`${getStatusColor()} text-white text-xs`}>
                    {campaign.status}
                  </Badge>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {campaign.status === 'active' ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onStatusChange(campaign.id, 'paused')}
                  className="rounded-none"
                >
                  <Pause className="h-4 w-4" />
                </Button>
              ) : campaign.status === 'paused' || campaign.status === 'draft' ? (
                <Button
                  size="sm"
                  onClick={() => onStatusChange(campaign.id, 'active')}
                  className="rounded-none bg-green-500 hover:bg-green-600"
                >
                  <Play className="h-4 w-4" />
                </Button>
              ) : null}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="p-3 bg-muted/50 rounded-sm text-center">
              <p className="text-2xl font-bold" style={{ fontFamily: 'Barlow Condensed' }}>
                {campaign.leads_contacted}
              </p>
              <p className="text-xs text-muted-foreground">Contacted</p>
            </div>
            <div className="p-3 bg-muted/50 rounded-sm text-center">
              <p className="text-2xl font-bold" style={{ fontFamily: 'Barlow Condensed' }}>
                {campaign.responses}
              </p>
              <p className="text-xs text-muted-foreground">Responses</p>
            </div>
            <div className="p-3 bg-muted/50 rounded-sm text-center">
              <p className="text-2xl font-bold" style={{ fontFamily: 'Barlow Condensed' }}>
                {campaign.leads_contacted > 0 
                  ? ((campaign.responses / campaign.leads_contacted) * 100).toFixed(1)
                  : 0}%
              </p>
              <p className="text-xs text-muted-foreground">Rate</p>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Target Industries</p>
            <div className="flex flex-wrap gap-1">
              {campaign.target_industries.map((ind, i) => (
                <Badge key={i} variant="outline" className="text-xs">
                  {ind}
                </Badge>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-border">
            <p className="text-xs text-muted-foreground mb-2">Message Template</p>
            <p className="text-sm text-muted-foreground line-clamp-2">
              {campaign.message_template}
            </p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

const CreateCampaignDialog = ({ onCreate }) => {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    campaign_type: 'sms',
    target_industries: [],
    message_template: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!formData.name || !formData.message_template || formData.target_industries.length === 0) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      await onCreate(formData);
      setOpen(false);
      setFormData({
        name: '',
        campaign_type: 'sms',
        target_industries: [],
        message_template: ''
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleIndustry = (industry) => {
    const lower = industry.toLowerCase();
    if (formData.target_industries.includes(lower)) {
      setFormData({
        ...formData,
        target_industries: formData.target_industries.filter(i => i !== lower)
      });
    } else {
      setFormData({
        ...formData,
        target_industries: [...formData.target_industries, lower]
      });
    }
  };

  const sampleTemplates = {
    sms: "Hey {{owner_name}}, quick question — are you currently paying credit card processing fees at your {{industry}}? I work with a program that eliminates those fees entirely.",
    email: "Subject: Save thousands on payment processing\n\nHi {{owner_name}},\n\nI noticed your {{business_name}} has great reviews. Many businesses like yours are paying 2-4% on credit card processing fees.\n\nOur zero-fee program lets your customers cover that cost, saving you thousands annually.\n\nWould you like a free analysis of your current statement?\n\nBest regards",
    voice: "Hi, this is Alex with AutoMerchant. Quick question — are you currently paying credit-card processing fees for your business? I work with a program that eliminates those fees entirely. Would you have a moment to learn how it works?"
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-primary rounded-none glow-primary" data-testid="create-campaign-btn">
          <Plus className="h-4 w-4 mr-2" />
          Create Campaign
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-card border-border max-w-2xl">
        <DialogHeader>
          <DialogTitle style={{ fontFamily: 'Barlow Condensed' }}>CREATE CAMPAIGN</DialogTitle>
          <DialogDescription>
            Set up an automated outreach campaign
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Campaign Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="e.g., Restaurant Outreach Q1"
                className="bg-background border-border rounded-none"
                data-testid="campaign-name"
              />
            </div>
            <div className="space-y-2">
              <Label>Channel *</Label>
              <Select 
                value={formData.campaign_type} 
                onValueChange={(v) => setFormData({...formData, campaign_type: v, message_template: sampleTemplates[v]})}
              >
                <SelectTrigger className="bg-background border-border rounded-none" data-testid="campaign-type">
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
            <Label>Target Industries *</Label>
            <div className="flex flex-wrap gap-2">
              {industries.map((ind) => (
                <Badge
                  key={ind}
                  variant={formData.target_industries.includes(ind.toLowerCase()) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => toggleIndustry(ind)}
                >
                  {ind}
                </Badge>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Message Template *</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setFormData({...formData, message_template: sampleTemplates[formData.campaign_type]})}
                className="text-xs"
              >
                Use Sample
              </Button>
            </div>
            <Textarea
              value={formData.message_template}
              onChange={(e) => setFormData({...formData, message_template: e.target.value})}
              placeholder="Enter your message template. Use {{owner_name}}, {{business_name}}, {{industry}} for personalization."
              className="bg-background border-border rounded-none min-h-[150px]"
              data-testid="campaign-template"
            />
            <p className="text-xs text-muted-foreground">
              Variables: {"{{owner_name}}, {{business_name}}, {{industry}}, {{city}}"}
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} className="rounded-none">
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={loading}
            className="bg-primary rounded-none glow-primary"
            data-testid="campaign-submit"
          >
            {loading ? <div className="status-working h-4 w-4"></div> : 'Create Campaign'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const Campaigns = () => {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const { getAuthHeaders } = useAuth();

  const fetchCampaigns = async () => {
    try {
      const response = await axios.get(`${API}/campaigns`, { headers: getAuthHeaders() });
      setCampaigns(response.data);
    } catch (error) {
      toast.error('Failed to fetch campaigns');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, [getAuthHeaders]);

  const handleCreateCampaign = async (data) => {
    try {
      await axios.post(`${API}/campaigns`, data, { headers: getAuthHeaders() });
      toast.success('Campaign created successfully');
      fetchCampaigns();
    } catch (error) {
      toast.error('Failed to create campaign');
      throw error;
    }
  };

  const handleStatusChange = async (campaignId, status) => {
    try {
      await axios.patch(
        `${API}/campaigns/${campaignId}?status=${status}`,
        {},
        { headers: getAuthHeaders() }
      );
      toast.success('Campaign status updated');
      fetchCampaigns();
    } catch (error) {
      toast.error('Failed to update campaign');
    }
  };

  const stats = {
    total: campaigns.length,
    active: campaigns.filter(c => c.status === 'active').length,
    totalContacted: campaigns.reduce((sum, c) => sum + c.leads_contacted, 0),
    totalResponses: campaigns.reduce((sum, c) => sum + c.responses, 0)
  };

  return (
    <div className="p-6 lg:p-8" data-testid="campaigns-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" style={{ fontFamily: 'Barlow Condensed' }}>
            CAMPAIGNS
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage automated outreach campaigns
          </p>
        </div>
        <CreateCampaignDialog onCreate={handleCreateCampaign} />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card className="bg-card border-border/40">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Megaphone className="h-5 w-5 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="text-2xl font-bold" style={{ fontFamily: 'Barlow Condensed' }}>{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/40">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Play className="h-5 w-5 text-green-400" />
              <div>
                <p className="text-xs text-muted-foreground">Active</p>
                <p className="text-2xl font-bold text-green-400" style={{ fontFamily: 'Barlow Condensed' }}>{stats.active}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/40">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-blue-400" />
              <div>
                <p className="text-xs text-muted-foreground">Contacted</p>
                <p className="text-2xl font-bold" style={{ fontFamily: 'Barlow Condensed' }}>{stats.totalContacted}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/40">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <BarChart className="h-5 w-5 text-purple-400" />
              <div>
                <p className="text-xs text-muted-foreground">Responses</p>
                <p className="text-2xl font-bold" style={{ fontFamily: 'Barlow Condensed' }}>{stats.totalResponses}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Campaigns List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="status-working h-8 w-8"></div>
        </div>
      ) : campaigns.length === 0 ? (
        <Card className="bg-card border-border/40">
          <CardContent className="py-20 text-center">
            <Megaphone className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <h3 className="text-lg font-semibold mb-2">No Campaigns</h3>
            <p className="text-muted-foreground mb-4">
              Create your first automated outreach campaign
            </p>
            <CreateCampaignDialog onCreate={handleCreateCampaign} />
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {campaigns.map((campaign) => (
            <CampaignCard
              key={campaign.id}
              campaign={campaign}
              onStatusChange={handleStatusChange}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default Campaigns;
