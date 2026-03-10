import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { toast } from 'sonner';
import { 
  ArrowLeft,
  MapPin,
  Star,
  Phone,
  Mail,
  Globe,
  MessageSquare,
  FileText,
  Send,
  Bot,
  User,
  Clock,
  DollarSign,
  TrendingUp,
  Upload
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const pipelineStages = [
  { value: 'new', label: 'New', color: 'bg-gray-500' },
  { value: 'contacted', label: 'Contacted', color: 'bg-blue-500' },
  { value: 'interested', label: 'Interested', color: 'bg-purple-500' },
  { value: 'statement_received', label: 'Statement Received', color: 'bg-yellow-500' },
  { value: 'proposal_sent', label: 'Proposal Sent', color: 'bg-orange-500' },
  { value: 'closed', label: 'Closed', color: 'bg-green-500' },
];

const ConversationMessage = ({ message }) => {
  const isOutbound = message.direction === 'outbound';
  const isAI = message.ai_generated;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex ${isOutbound ? 'justify-end' : 'justify-start'} mb-4`}
    >
      <div className={`max-w-[80%] ${isOutbound ? 'order-2' : ''}`}>
        <div className={`flex items-center gap-2 mb-1 ${isOutbound ? 'justify-end' : ''}`}>
          {!isOutbound && <User className="h-3 w-3 text-muted-foreground" />}
          {isOutbound && isAI && <Bot className="h-3 w-3 text-primary" />}
          <span className="text-xs text-muted-foreground">
            {isOutbound ? (isAI ? 'AI Agent' : 'You') : 'Merchant'}
          </span>
          <span className="text-xs text-muted-foreground">
            {new Date(message.timestamp).toLocaleTimeString()}
          </span>
        </div>
        <div className={`p-3 rounded-sm ${
          isOutbound 
            ? 'bg-primary/20 border border-primary/30' 
            : 'bg-muted border border-border'
        }`}>
          <p className="text-sm">{message.content}</p>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <Badge variant="outline" className="text-xs">
            {message.channel.toUpperCase()}
          </Badge>
        </div>
      </div>
    </motion.div>
  );
};

const StatementCard = ({ statement }) => {
  const formatCurrency = (value) => {
    if (!value) return 'N/A';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
  };

  return (
    <Card className="bg-card border-border/40">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">
            {statement.filename}
          </CardTitle>
          <Badge className={statement.analysis_status === 'completed' ? 'bg-green-500' : 'bg-yellow-500'}>
            {statement.analysis_status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Monthly Volume</p>
            <p className="font-semibold">{formatCurrency(statement.monthly_volume)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Effective Rate</p>
            <p className="font-semibold">{statement.effective_rate ? `${statement.effective_rate}%` : 'N/A'}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Fees Paid</p>
            <p className="font-semibold text-red-400">{formatCurrency(statement.fees_paid)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Potential Savings</p>
            <p className="font-semibold text-green-400">{formatCurrency(statement.potential_savings)}</p>
          </div>
        </div>
        {statement.processor_name && (
          <div className="mt-4 pt-4 border-t border-border">
            <p className="text-muted-foreground text-xs">Current Processor</p>
            <p className="font-medium">{statement.processor_name}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const LeadDetail = () => {
  const { leadId } = useParams();
  const navigate = useNavigate();
  const { getAuthHeaders } = useAuth();
  
  const [lead, setLead] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [statements, setStatements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  const [messageChannel, setMessageChannel] = useState('sms');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [uploadingStatement, setUploadingStatement] = useState(false);

  const fetchData = async () => {
    try {
      const [leadRes, convRes, stmtRes] = await Promise.all([
        axios.get(`${API}/leads/${leadId}`, { headers: getAuthHeaders() }),
        axios.get(`${API}/leads/${leadId}/conversations`, { headers: getAuthHeaders() }),
        axios.get(`${API}/statements?lead_id=${leadId}`, { headers: getAuthHeaders() })
      ]);
      setLead(leadRes.data);
      setConversations(convRes.data);
      setStatements(stmtRes.data);
    } catch (error) {
      toast.error('Failed to load lead details');
      navigate('/leads');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [leadId]);

  const handleStageChange = async (newStage) => {
    try {
      await axios.patch(
        `${API}/leads/${leadId}`,
        { pipeline_stage: newStage },
        { headers: getAuthHeaders() }
      );
      setLead({ ...lead, pipeline_stage: newStage });
      toast.success('Pipeline stage updated');
    } catch (error) {
      toast.error('Failed to update stage');
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    setSendingMessage(true);
    try {
      await axios.post(
        `${API}/conversations`,
        {
          lead_id: leadId,
          channel: messageChannel,
          direction: 'outbound',
          content: newMessage,
          ai_generated: false
        },
        { headers: getAuthHeaders() }
      );
      setNewMessage('');
      toast.success('Message sent (simulated)');
      fetchData();
    } catch (error) {
      toast.error('Failed to send message');
    } finally {
      setSendingMessage(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      toast.error('Please upload a PDF file');
      return;
    }

    setUploadingStatement(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      await axios.post(
        `${API}/statements/upload?lead_id=${leadId}`,
        formData,
        { 
          headers: { 
            ...getAuthHeaders(),
            'Content-Type': 'multipart/form-data'
          }
        }
      );
      toast.success('Statement uploaded and analyzed');
      fetchData();
    } catch (error) {
      toast.error('Failed to upload statement');
    } finally {
      setUploadingStatement(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-screen">
        <div className="status-working h-8 w-8"></div>
      </div>
    );
  }

  if (!lead) {
    return null;
  }

  const getScoreColor = (score) => {
    if (score >= 70) return 'text-green-400';
    if (score >= 50) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div className="p-6 lg:p-8" data-testid="lead-detail-page">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/leads')}
          className="rounded-none"
          data-testid="back-btn"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight" style={{ fontFamily: 'Barlow Condensed' }}>
            {lead.business_name}
          </h1>
          <p className="text-muted-foreground">{lead.owner_name || 'No owner info'}</p>
        </div>
        <div className={`text-4xl font-bold ${getScoreColor(lead.score)}`} style={{ fontFamily: 'Barlow Condensed' }}>
          {lead.score}
          <span className="text-sm text-muted-foreground ml-1">/ 100</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Lead Info */}
        <div className="space-y-6">
          {/* Pipeline Stage */}
          <Card className="bg-card border-border/40">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Pipeline Stage</CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={lead.pipeline_stage} onValueChange={handleStageChange}>
                <SelectTrigger className="bg-background border-border rounded-none" data-testid="stage-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {pipelineStages.map((stage) => (
                    <SelectItem key={stage.value} value={stage.value}>
                      <div className="flex items-center gap-2">
                        <div className={`h-2 w-2 rounded-full ${stage.color}`}></div>
                        {stage.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Contact Info */}
          <Card className="bg-card border-border/40">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {lead.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{lead.phone}</span>
                </div>
              )}
              {lead.email && (
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{lead.email}</span>
                </div>
              )}
              {lead.website && (
                <div className="flex items-center gap-3">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <a href={`https://${lead.website}`} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">
                    {lead.website}
                  </a>
                </div>
              )}
              {(lead.city || lead.state) && (
                <div className="flex items-center gap-3">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{lead.city}, {lead.state}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Business Info */}
          <Card className="bg-card border-border/40">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Business Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Industry</span>
                <Badge variant="outline">{lead.industry}</Badge>
              </div>
              {lead.google_rating && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Google Rating</span>
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 text-yellow-400" />
                    <span className="text-sm font-medium">{lead.google_rating}</span>
                    <span className="text-xs text-muted-foreground">({lead.review_count} reviews)</span>
                  </div>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Source</span>
                <Badge variant="outline">{lead.source}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Created</span>
                <span className="text-sm">{new Date(lead.created_at).toLocaleDateString()}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Tabs */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="conversations" className="h-full">
            <TabsList className="bg-card border border-border rounded-none w-full justify-start">
              <TabsTrigger value="conversations" className="rounded-none data-[state=active]:bg-primary/20">
                <MessageSquare className="h-4 w-4 mr-2" />
                Conversations
              </TabsTrigger>
              <TabsTrigger value="statements" className="rounded-none data-[state=active]:bg-primary/20">
                <FileText className="h-4 w-4 mr-2" />
                Statements
              </TabsTrigger>
            </TabsList>

            <TabsContent value="conversations" className="mt-4">
              <Card className="bg-card border-border/40 h-[600px] flex flex-col">
                <CardContent className="flex-1 flex flex-col p-4">
                  {/* Messages */}
                  <ScrollArea className="flex-1 pr-4">
                    {conversations.length > 0 ? (
                      <div className="space-y-2">
                        {conversations.map((message) => (
                          <ConversationMessage key={message.id} message={message} />
                        ))}
                      </div>
                    ) : (
                      <div className="h-full flex items-center justify-center text-muted-foreground">
                        <div className="text-center">
                          <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
                          <p>No conversations yet</p>
                          <p className="text-sm">Send the first message to this lead</p>
                        </div>
                      </div>
                    )}
                  </ScrollArea>

                  {/* Message Input */}
                  <div className="border-t border-border pt-4 mt-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Select value={messageChannel} onValueChange={setMessageChannel}>
                        <SelectTrigger className="w-32 bg-background border-border rounded-none h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="sms">SMS</SelectItem>
                          <SelectItem value="email">Email</SelectItem>
                          <SelectItem value="voice">Voice</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex gap-2">
                      <Textarea
                        placeholder="Type your message..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        className="bg-background border-border rounded-none resize-none"
                        rows={2}
                        data-testid="message-input"
                      />
                      <Button
                        onClick={handleSendMessage}
                        disabled={sendingMessage || !newMessage.trim()}
                        className="bg-primary rounded-none h-auto"
                        data-testid="send-message-btn"
                      >
                        {sendingMessage ? (
                          <div className="status-working h-4 w-4"></div>
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="statements" className="mt-4">
              <Card className="bg-card border-border/40">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg" style={{ fontFamily: 'Barlow Condensed' }}>
                      STATEMENT ANALYSIS
                    </CardTitle>
                    <label htmlFor="statement-upload">
                      <input
                        id="statement-upload"
                        type="file"
                        accept=".pdf"
                        onChange={handleFileUpload}
                        className="hidden"
                        data-testid="statement-upload"
                      />
                      <Button
                        asChild
                        className="bg-primary rounded-none cursor-pointer"
                        disabled={uploadingStatement}
                      >
                        <span>
                          {uploadingStatement ? (
                            <div className="status-working h-4 w-4 mr-2"></div>
                          ) : (
                            <Upload className="h-4 w-4 mr-2" />
                          )}
                          Upload Statement
                        </span>
                      </Button>
                    </label>
                  </div>
                </CardHeader>
                <CardContent>
                  {statements.length > 0 ? (
                    <div className="space-y-4">
                      {statements.map((statement) => (
                        <StatementCard key={statement.id} statement={statement} />
                      ))}
                    </div>
                  ) : (
                    <div className="py-12 text-center text-muted-foreground">
                      <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>No statements uploaded</p>
                      <p className="text-sm">Upload a merchant statement to analyze fees</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default LeadDetail;
