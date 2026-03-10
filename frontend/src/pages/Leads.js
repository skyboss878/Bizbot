import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
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
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import { 
  Users, 
  Search, 
  Plus, 
  MapPin,
  Star,
  Phone,
  Mail,
  Globe,
  Filter,
  Sparkles,
  LayoutGrid,
  List,
  ChevronRight
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
  'Retail',
  'Other'
];

const pipelineStages = [
  { value: 'new', label: 'New', color: 'bg-gray-500' },
  { value: 'contacted', label: 'Contacted', color: 'bg-blue-500' },
  { value: 'interested', label: 'Interested', color: 'bg-purple-500' },
  { value: 'statement_received', label: 'Statement Received', color: 'bg-yellow-500' },
  { value: 'proposal_sent', label: 'Proposal Sent', color: 'bg-orange-500' },
  { value: 'closed', label: 'Closed', color: 'bg-green-500' },
];

const LeadCard = ({ lead, onClick }) => {
  const getStageColor = (stage) => {
    const stageObj = pipelineStages.find(s => s.value === stage);
    return stageObj?.color || 'bg-gray-500';
  };

  const getScoreColor = (score) => {
    if (score >= 70) return 'text-green-400';
    if (score >= 50) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      whileHover={{ scale: 1.01 }}
      onClick={onClick}
      className={`cursor-pointer bg-card border border-border/40 rounded-sm p-4 card-hover border-l-4 stage-${lead.pipeline_stage}`}
      data-testid={`lead-card-${lead.id}`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold truncate">{lead.business_name}</h3>
          <p className="text-sm text-muted-foreground truncate">
            {lead.owner_name || 'No owner info'}
          </p>
        </div>
        <div className={`text-2xl font-bold ${getScoreColor(lead.score)}`} style={{ fontFamily: 'Barlow Condensed' }}>
          {lead.score}
        </div>
      </div>
      
      <div className="space-y-2 text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <MapPin className="h-3 w-3" />
          <span className="truncate">{lead.city}, {lead.state}</span>
        </div>
        {lead.google_rating && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Star className="h-3 w-3 text-yellow-400" />
            <span>{lead.google_rating} ({lead.review_count} reviews)</span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between mt-4">
        <Badge variant="outline" className="text-xs">
          {lead.industry}
        </Badge>
        <Badge className={`${getStageColor(lead.pipeline_stage)} text-white text-xs`}>
          {lead.pipeline_stage.replace('_', ' ')}
        </Badge>
      </div>
    </motion.div>
  );
};

const GenerateLeadsDialog = ({ onGenerate }) => {
  const [open, setOpen] = useState(false);
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [industry, setIndustry] = useState('');
  const [count, setCount] = useState(10);
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    if (!city || !state || !industry) {
      toast.error('Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      await onGenerate(city, state, industry, count);
      setOpen(false);
      setCity('');
      setState('');
      setIndustry('');
      setCount(10);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-secondary hover:bg-secondary/90 rounded-none glow-secondary" data-testid="generate-leads-btn">
          <Sparkles className="h-4 w-4 mr-2" />
          AI Generate
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-card border-border">
        <DialogHeader>
          <DialogTitle style={{ fontFamily: 'Barlow Condensed' }}>AI LEAD GENERATION</DialogTitle>
          <DialogDescription>
            Let AI find and qualify leads in your target area
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>City</Label>
              <Input
                placeholder="e.g., Los Angeles"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="bg-background border-border rounded-none"
                data-testid="generate-city"
              />
            </div>
            <div className="space-y-2">
              <Label>State</Label>
              <Input
                placeholder="e.g., CA"
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="bg-background border-border rounded-none"
                data-testid="generate-state"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Industry</Label>
            <Select value={industry} onValueChange={setIndustry}>
              <SelectTrigger className="bg-background border-border rounded-none" data-testid="generate-industry">
                <SelectValue placeholder="Select industry" />
              </SelectTrigger>
              <SelectContent>
                {industries.map((ind) => (
                  <SelectItem key={ind} value={ind.toLowerCase()}>{ind}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Number of Leads</Label>
            <Input
              type="number"
              min={1}
              max={50}
              value={count}
              onChange={(e) => setCount(parseInt(e.target.value) || 10)}
              className="bg-background border-border rounded-none"
              data-testid="generate-count"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} className="rounded-none">
            Cancel
          </Button>
          <Button 
            onClick={handleGenerate} 
            disabled={loading}
            className="bg-primary rounded-none glow-primary"
            data-testid="generate-submit"
          >
            {loading ? <div className="status-working h-4 w-4"></div> : 'Generate Leads'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const AddLeadDialog = ({ onAdd }) => {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    business_name: '',
    owner_name: '',
    phone: '',
    email: '',
    website: '',
    industry: '',
    city: '',
    state: '',
    google_rating: '',
    review_count: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!formData.business_name || !formData.industry) {
      toast.error('Business name and industry are required');
      return;
    }

    setLoading(true);
    try {
      await onAdd({
        ...formData,
        google_rating: formData.google_rating ? parseFloat(formData.google_rating) : null,
        review_count: formData.review_count ? parseInt(formData.review_count) : null
      });
      setOpen(false);
      setFormData({
        business_name: '',
        owner_name: '',
        phone: '',
        email: '',
        website: '',
        industry: '',
        city: '',
        state: '',
        google_rating: '',
        review_count: ''
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-primary hover:bg-primary/90 rounded-none glow-primary" data-testid="add-lead-btn">
          <Plus className="h-4 w-4 mr-2" />
          Add Lead
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-card border-border max-w-2xl">
        <DialogHeader>
          <DialogTitle style={{ fontFamily: 'Barlow Condensed' }}>ADD NEW LEAD</DialogTitle>
          <DialogDescription>
            Manually add a business to your pipeline
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4 py-4">
          <div className="space-y-2">
            <Label>Business Name *</Label>
            <Input
              value={formData.business_name}
              onChange={(e) => setFormData({...formData, business_name: e.target.value})}
              className="bg-background border-border rounded-none"
              data-testid="add-lead-business-name"
            />
          </div>
          <div className="space-y-2">
            <Label>Owner Name</Label>
            <Input
              value={formData.owner_name}
              onChange={(e) => setFormData({...formData, owner_name: e.target.value})}
              className="bg-background border-border rounded-none"
            />
          </div>
          <div className="space-y-2">
            <Label>Phone</Label>
            <Input
              value={formData.phone}
              onChange={(e) => setFormData({...formData, phone: e.target.value})}
              className="bg-background border-border rounded-none"
            />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              className="bg-background border-border rounded-none"
            />
          </div>
          <div className="space-y-2">
            <Label>Website</Label>
            <Input
              value={formData.website}
              onChange={(e) => setFormData({...formData, website: e.target.value})}
              className="bg-background border-border rounded-none"
            />
          </div>
          <div className="space-y-2">
            <Label>Industry *</Label>
            <Select 
              value={formData.industry} 
              onValueChange={(v) => setFormData({...formData, industry: v})}
            >
              <SelectTrigger className="bg-background border-border rounded-none" data-testid="add-lead-industry">
                <SelectValue placeholder="Select industry" />
              </SelectTrigger>
              <SelectContent>
                {industries.map((ind) => (
                  <SelectItem key={ind} value={ind.toLowerCase()}>{ind}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>City</Label>
            <Input
              value={formData.city}
              onChange={(e) => setFormData({...formData, city: e.target.value})}
              className="bg-background border-border rounded-none"
            />
          </div>
          <div className="space-y-2">
            <Label>State</Label>
            <Input
              value={formData.state}
              onChange={(e) => setFormData({...formData, state: e.target.value})}
              className="bg-background border-border rounded-none"
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
            data-testid="add-lead-submit"
          >
            {loading ? <div className="status-working h-4 w-4"></div> : 'Add Lead'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const Leads = () => {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStage, setFilterStage] = useState('');
  const [filterIndustry, setFilterIndustry] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const { getAuthHeaders } = useAuth();
  const navigate = useNavigate();

  const fetchLeads = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (filterStage) params.append('pipeline_stage', filterStage);
      if (filterIndustry) params.append('industry', filterIndustry);

      const response = await axios.get(`${API}/leads?${params.toString()}`, {
        headers: getAuthHeaders()
      });
      setLeads(response.data);
    } catch (error) {
      toast.error('Failed to fetch leads');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, [search, filterStage, filterIndustry]);

  const handleGenerateLeads = async (city, state, industry, count) => {
    try {
      const response = await axios.post(
        `${API}/leads/generate?city=${city}&state=${state}&industry=${industry}&count=${count}`,
        {},
        { headers: getAuthHeaders() }
      );
      toast.success(`Generated ${response.data.leads.length} leads!`);
      fetchLeads();
    } catch (error) {
      toast.error('Failed to generate leads');
    }
  };

  const handleAddLead = async (leadData) => {
    try {
      await axios.post(`${API}/leads`, leadData, { headers: getAuthHeaders() });
      toast.success('Lead added successfully');
      fetchLeads();
    } catch (error) {
      toast.error('Failed to add lead');
    }
  };

  return (
    <div className="p-6 lg:p-8" data-testid="leads-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" style={{ fontFamily: 'Barlow Condensed' }}>
            LEADS
          </h1>
          <p className="text-muted-foreground mt-1">
            {leads.length} leads in your pipeline
          </p>
        </div>
        <div className="flex items-center gap-3">
          <GenerateLeadsDialog onGenerate={handleGenerateLeads} />
          <AddLeadDialog onAdd={handleAddLead} />
        </div>
      </div>

      {/* Filters */}
      <Card className="bg-card border-border/40 mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search leads..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 bg-background border-border rounded-none"
                data-testid="leads-search"
              />
            </div>
            <Select value={filterStage || "all"} onValueChange={(v) => setFilterStage(v === "all" ? "" : v)}>
              <SelectTrigger className="w-full md:w-48 bg-background border-border rounded-none" data-testid="filter-stage">
                <SelectValue placeholder="All Stages" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stages</SelectItem>
                {pipelineStages.map((stage) => (
                  <SelectItem key={stage.value} value={stage.value}>{stage.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterIndustry || "all"} onValueChange={(v) => setFilterIndustry(v === "all" ? "" : v)}>
              <SelectTrigger className="w-full md:w-48 bg-background border-border rounded-none" data-testid="filter-industry">
                <SelectValue placeholder="All Industries" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Industries</SelectItem>
                {industries.map((ind) => (
                  <SelectItem key={ind} value={ind.toLowerCase()}>{ind}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-1 border border-border rounded-none">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="icon"
                onClick={() => setViewMode('grid')}
                className="rounded-none"
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="icon"
                onClick={() => setViewMode('list')}
                className="rounded-none"
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Leads Grid/List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="status-working h-8 w-8"></div>
        </div>
      ) : leads.length === 0 ? (
        <Card className="bg-card border-border/40">
          <CardContent className="py-20 text-center">
            <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <h3 className="text-lg font-semibold mb-2">No Leads Found</h3>
            <p className="text-muted-foreground mb-4">
              Start by generating leads with AI or adding them manually
            </p>
            <div className="flex items-center justify-center gap-3">
              <GenerateLeadsDialog onGenerate={handleGenerateLeads} />
              <AddLeadDialog onAdd={handleAddLead} />
            </div>
          </CardContent>
        </Card>
      ) : (
        <AnimatePresence mode="popLayout">
          <div className={viewMode === 'grid' 
            ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
            : 'space-y-2'
          }>
            {leads.map((lead) => (
              <LeadCard
                key={lead.id}
                lead={lead}
                onClick={() => navigate(`/leads/${lead.id}`)}
              />
            ))}
          </div>
        </AnimatePresence>
      )}
    </div>
  );
};

export default Leads;
