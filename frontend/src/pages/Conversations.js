import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { ScrollArea } from '../components/ui/scroll-area';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { toast } from 'sonner';
import { 
  MessageSquare,
  Mail,
  Phone,
  Bot,
  User,
  Filter
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ConversationItem = ({ conversation, leadName }) => {
  const isOutbound = conversation.direction === 'outbound';
  const isAI = conversation.ai_generated;

  const getChannelIcon = () => {
    switch (conversation.channel) {
      case 'sms':
        return <MessageSquare className="h-4 w-4" />;
      case 'email':
        return <Mail className="h-4 w-4" />;
      case 'voice':
        return <Phone className="h-4 w-4" />;
      default:
        return <MessageSquare className="h-4 w-4" />;
    }
  };

  const getChannelColor = () => {
    switch (conversation.channel) {
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 border border-border/40 rounded-sm bg-card hover:border-primary/30 transition-colors"
    >
      <div className="flex items-start gap-4">
        <div className={`h-10 w-10 rounded-sm flex items-center justify-center ${getChannelColor()}`}>
          {getChannelIcon()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm">{leadName || 'Unknown Lead'}</span>
              <Badge variant="outline" className="text-xs">
                {conversation.channel.toUpperCase()}
              </Badge>
              {isOutbound && isAI && (
                <Badge className="bg-primary/20 text-primary text-xs">
                  <Bot className="h-3 w-3 mr-1" />
                  AI
                </Badge>
              )}
            </div>
            <span className="text-xs text-muted-foreground">
              {new Date(conversation.timestamp).toLocaleString()}
            </span>
          </div>
          <p className="text-sm text-muted-foreground line-clamp-2">
            {isOutbound ? 'Sent: ' : 'Received: '}
            {conversation.content}
          </p>
          <div className="flex items-center gap-2 mt-2">
            {isOutbound ? (
              <Badge variant="outline" className="text-xs bg-primary/10">
                <User className="h-3 w-3 mr-1" />
                Outbound
              </Badge>
            ) : (
              <Badge variant="outline" className="text-xs bg-green-500/10">
                <User className="h-3 w-3 mr-1" />
                Inbound
              </Badge>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const Conversations = () => {
  const [conversations, setConversations] = useState([]);
  const [leads, setLeads] = useState({});
  const [loading, setLoading] = useState(true);
  const [channelFilter, setChannelFilter] = useState('');
  const { getAuthHeaders } = useAuth();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const params = new URLSearchParams();
        if (channelFilter) params.append('channel', channelFilter);

        const [convRes, leadsRes] = await Promise.all([
          axios.get(`${API}/conversations?${params.toString()}`, { headers: getAuthHeaders() }),
          axios.get(`${API}/leads`, { headers: getAuthHeaders() })
        ]);

        setConversations(convRes.data);
        
        // Create a lookup map for lead names
        const leadMap = {};
        leadsRes.data.forEach(lead => {
          leadMap[lead.id] = lead.business_name;
        });
        setLeads(leadMap);
      } catch (error) {
        toast.error('Failed to fetch conversations');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [channelFilter, getAuthHeaders]);

  const stats = {
    total: conversations.length,
    sms: conversations.filter(c => c.channel === 'sms').length,
    email: conversations.filter(c => c.channel === 'email').length,
    voice: conversations.filter(c => c.channel === 'voice').length,
    ai: conversations.filter(c => c.ai_generated).length
  };

  return (
    <div className="p-6 lg:p-8" data-testid="conversations-page">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight" style={{ fontFamily: 'Barlow Condensed' }}>
          CONVERSATIONS
        </h1>
        <p className="text-muted-foreground mt-1">
          All merchant communications across channels
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <Card className="bg-card border-border/40">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="text-2xl font-bold" style={{ fontFamily: 'Barlow Condensed' }}>{stats.total}</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/40">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">SMS</p>
            <p className="text-2xl font-bold text-blue-400" style={{ fontFamily: 'Barlow Condensed' }}>{stats.sms}</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/40">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Email</p>
            <p className="text-2xl font-bold text-purple-400" style={{ fontFamily: 'Barlow Condensed' }}>{stats.email}</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/40">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Voice</p>
            <p className="text-2xl font-bold text-green-400" style={{ fontFamily: 'Barlow Condensed' }}>{stats.voice}</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/40">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">AI Generated</p>
            <p className="text-2xl font-bold text-primary" style={{ fontFamily: 'Barlow Condensed' }}>{stats.ai}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <Card className="bg-card border-border/40 mb-6">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={channelFilter || "all"} onValueChange={(v) => setChannelFilter(v === "all" ? "" : v)}>
              <SelectTrigger className="w-48 bg-background border-border rounded-none" data-testid="channel-filter">
                <SelectValue placeholder="All Channels" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Channels</SelectItem>
                <SelectItem value="sms">SMS</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="voice">Voice</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Conversations List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="status-working h-8 w-8"></div>
        </div>
      ) : conversations.length === 0 ? (
        <Card className="bg-card border-border/40">
          <CardContent className="py-20 text-center">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <h3 className="text-lg font-semibold mb-2">No Conversations</h3>
            <p className="text-muted-foreground">
              Start communicating with leads to see conversations here
            </p>
          </CardContent>
        </Card>
      ) : (
        <ScrollArea className="h-[600px]">
          <div className="space-y-3 pr-4">
            {conversations.map((conversation) => (
              <ConversationItem
                key={conversation.id}
                conversation={conversation}
                leadName={leads[conversation.lead_id]}
              />
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
};

export default Conversations;
