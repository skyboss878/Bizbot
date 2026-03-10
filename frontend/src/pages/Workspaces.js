import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Textarea } from '../components/ui/textarea';
import { ScrollArea } from '../components/ui/scroll-area';
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
import { toast } from 'sonner';
import {
  Plus,
  Briefcase,
  Users,
  Megaphone,
  MapPin,
  TrendingUp,
  Settings,
  Play,
  Pause,
  MoreVertical,
  Building,
  Home,
  Stethoscope,
  Car,
  Scissors,
  ShoppingBag,
  CreditCard,
  Code,
  Shield,
  Gavel
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const industryIcons = {
  merchant_services: CreditCard,
  real_estate: Building,
  insurance: Shield,
  saas_software: Code,
  home_services: Home,
  professional_services: Gavel,
  restaurant: Briefcase,
  retail: ShoppingBag,
  medical_dental: Stethoscope,
  automotive: Car,
  beauty_salon: Scissors
};

const industryColors = {
  merchant_services: 'bg-blue-500/20 text-blue-400',
  real_estate: 'bg-purple-500/20 text-purple-400',
  insurance: 'bg-green-500/20 text-green-400',
  saas_software: 'bg-cyan-500/20 text-cyan-400',
  home_services: 'bg-orange-500/20 text-orange-400',
  professional_services: 'bg-indigo-500/20 text-indigo-400',
  restaurant: 'bg-red-500/20 text-red-400',
  retail: 'bg-pink-500/20 text-pink-400',
  medical_dental: 'bg-teal-500/20 text-teal-400',
  automotive: 'bg-yellow-500/20 text-yellow-400',
  beauty_salon: 'bg-rose-500/20 text-rose-400'
};

const WorkspaceCard = ({ workspace, onClick }) => {
  const Icon = industryIcons[workspace.industry] || Briefcase;
  const colorClass = industryColors[workspace.industry] || 'bg-gray-500/20 text-gray-400';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      onClick={onClick}
      className="cursor-pointer"
    >
      <Card className="bg-card border-border/40 card-hover h-full">
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className={`h-12 w-12 rounded-sm flex items-center justify-center ${colorClass}`}>
              <Icon className="h-6 w-6" />
            </div>
            <Badge className={workspace.status === 'active' ? 'bg-green-500' : 'bg-gray-500'}>
              {workspace.status}
            </Badge>
          </div>
          
          <h3 className="font-bold text-lg mb-1" style={{ fontFamily: 'Barlow Condensed' }}>
            {workspace.name}
          </h3>
          <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
            {workspace.description || `${workspace.industry.replace(/_/g, ' ')} campaign`}
          </p>

          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2 bg-muted/50 rounded-sm">
              <p className="text-xl font-bold" style={{ fontFamily: 'Barlow Condensed' }}>
                {workspace.lead_count}
              </p>
              <p className="text-xs text-muted-foreground">Leads</p>
            </div>
            <div className="p-2 bg-muted/50 rounded-sm">
              <p className="text-xl font-bold" style={{ fontFamily: 'Barlow Condensed' }}>
                {workspace.active_campaigns}
              </p>
              <p className="text-xs text-muted-foreground">Campaigns</p>
            </div>
            <div className="p-2 bg-muted/50 rounded-sm">
              <p className="text-xl font-bold" style={{ fontFamily: 'Barlow Condensed' }}>
                {workspace.target_locations?.length || 0}
              </p>
              <p className="text-xs text-muted-foreground">Locations</p>
            </div>
          </div>

          {workspace.target_locations?.length > 0 && (
            <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3" />
              <span className="truncate">{workspace.target_locations.slice(0, 2).join(', ')}</span>
              {workspace.target_locations.length > 2 && (
                <span>+{workspace.target_locations.length - 2}</span>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

const CreateWorkspaceDialog = ({ industries, onCreate }) => {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    industry: '',
    description: '',
    target_locations: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!formData.name || !formData.industry) {
      toast.error('Name and industry are required');
      return;
    }

    setLoading(true);
    try {
      const locations = formData.target_locations
        .split('\n')
        .map(l => l.trim())
        .filter(l => l);

      await onCreate({
        name: formData.name,
        industry: formData.industry,
        description: formData.description,
        target_locations: locations
      });
      setOpen(false);
      setFormData({ name: '', industry: '', description: '', target_locations: '' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-primary rounded-none glow-primary" data-testid="create-workspace-btn">
          <Plus className="h-4 w-4 mr-2" />
          New Workspace
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-card border-border max-w-2xl">
        <DialogHeader>
          <DialogTitle style={{ fontFamily: 'Barlow Condensed' }}>CREATE WORKSPACE</DialogTitle>
          <DialogDescription>
            Set up a new campaign workspace with AI-powered outreach
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Workspace Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="e.g., Miami Restaurants Q1"
                className="bg-background border-border rounded-none"
                data-testid="workspace-name"
              />
            </div>
            <div className="space-y-2">
              <Label>Industry *</Label>
              <Select value={formData.industry} onValueChange={(v) => setFormData({...formData, industry: v})}>
                <SelectTrigger className="bg-background border-border rounded-none" data-testid="workspace-industry">
                  <SelectValue placeholder="Select industry" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(industries || {}).map(([key, industry]) => (
                    <SelectItem key={key} value={key}>
                      {industry.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              placeholder="Brief description of this campaign..."
              className="bg-background border-border rounded-none"
            />
          </div>
          <div className="space-y-2">
            <Label>Target Locations (one per line)</Label>
            <Textarea
              value={formData.target_locations}
              onChange={(e) => setFormData({...formData, target_locations: e.target.value})}
              placeholder="Miami, FL&#10;Los Angeles, CA&#10;Houston, TX"
              className="bg-background border-border rounded-none h-24"
              data-testid="workspace-locations"
            />
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
            data-testid="workspace-submit"
          >
            {loading ? <div className="status-working h-4 w-4"></div> : 'Create Workspace'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const Workspaces = () => {
  const [workspaces, setWorkspaces] = useState([]);
  const [industries, setIndustries] = useState({});
  const [loading, setLoading] = useState(true);
  const { getAuthHeaders } = useAuth();
  const navigate = useNavigate();

  const fetchData = async () => {
    try {
      const [workspacesRes, industriesRes] = await Promise.all([
        axios.get(`${API}/workspaces`, { headers: getAuthHeaders() }),
        axios.get(`${API}/industries`, { headers: getAuthHeaders() })
      ]);
      setWorkspaces(workspacesRes.data);
      setIndustries(industriesRes.data.industries);
    } catch (error) {
      toast.error('Failed to fetch workspaces');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateWorkspace = async (data) => {
    try {
      await axios.post(`${API}/workspaces`, data, { headers: getAuthHeaders() });
      toast.success('Workspace created successfully');
      fetchData();
    } catch (error) {
      toast.error('Failed to create workspace');
      throw error;
    }
  };

  const stats = {
    total: workspaces.length,
    active: workspaces.filter(w => w.status === 'active').length,
    totalLeads: workspaces.reduce((sum, w) => sum + (w.lead_count || 0), 0),
    totalCampaigns: workspaces.reduce((sum, w) => sum + (w.active_campaigns || 0), 0)
  };

  return (
    <div className="p-6 lg:p-8" data-testid="workspaces-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" style={{ fontFamily: 'Barlow Condensed' }}>
            WORKSPACES
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your AI-powered campaign workspaces
          </p>
        </div>
        <CreateWorkspaceDialog industries={industries} onCreate={handleCreateWorkspace} />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card className="bg-card border-border/40">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Briefcase className="h-5 w-5 text-primary" />
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
                <p className="text-xs text-muted-foreground">Total Leads</p>
                <p className="text-2xl font-bold" style={{ fontFamily: 'Barlow Condensed' }}>{stats.totalLeads}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/40">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Megaphone className="h-5 w-5 text-purple-400" />
              <div>
                <p className="text-xs text-muted-foreground">Campaigns</p>
                <p className="text-2xl font-bold" style={{ fontFamily: 'Barlow Condensed' }}>{stats.totalCampaigns}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Workspaces Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="status-working h-8 w-8"></div>
        </div>
      ) : workspaces.length === 0 ? (
        <Card className="bg-card border-border/40">
          <CardContent className="py-20 text-center">
            <Briefcase className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <h3 className="text-lg font-semibold mb-2">No Workspaces Yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first workspace to start running AI-powered campaigns
            </p>
            <CreateWorkspaceDialog industries={industries} onCreate={handleCreateWorkspace} />
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {workspaces.map((workspace) => (
            <WorkspaceCard
              key={workspace.id}
              workspace={workspace}
              onClick={() => navigate(`/workspace/${workspace.id}`)}
            />
          ))}
        </div>
      )}

      {/* Industry Templates */}
      {Object.keys(industries).length > 0 && (
        <div className="mt-8">
          <h2 className="text-xl font-bold mb-4" style={{ fontFamily: 'Barlow Condensed' }}>
            AVAILABLE INDUSTRIES
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {Object.entries(industries).map(([key, industry]) => {
              const Icon = industryIcons[key] || Briefcase;
              const colorClass = industryColors[key] || 'bg-gray-500/20 text-gray-400';
              return (
                <div
                  key={key}
                  className="p-4 bg-card border border-border/40 rounded-sm text-center hover:border-primary/50 transition-colors cursor-pointer"
                  onClick={() => {
                    // Pre-fill create dialog with this industry
                  }}
                >
                  <div className={`h-10 w-10 rounded-sm flex items-center justify-center mx-auto mb-2 ${colorClass}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <p className="text-xs font-medium">{industry.name}</p>
                  <p className="text-xs text-muted-foreground">{industry.category}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default Workspaces;
