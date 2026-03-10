import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Switch } from '../components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { toast } from 'sonner';
import { 
  User,
  Key,
  Bell,
  CreditCard,
  Shield,
  Bot,
  MessageSquare,
  Mail,
  Phone,
  Zap,
  Check
} from 'lucide-react';

const Settings = () => {
  const { user } = useAuth();
  const [apiKeys, setApiKeys] = useState({
    anthropic: '',
    twilio_sid: '',
    twilio_token: '',
    sendgrid: '',
    google_maps: '',
    vapi: '',
    elevenlabs: ''
  });

  const [notifications, setNotifications] = useState({
    new_lead: true,
    response_received: true,
    statement_analyzed: true,
    deal_closed: true,
    daily_summary: false
  });

  const handleSaveApiKeys = () => {
    // In production, these would be saved to backend
    toast.success('API keys saved (demo mode)');
  };

  const pricingPlans = [
    {
      name: 'Starter',
      price: 49,
      features: [
        '100 leads/month',
        '500 messages/month',
        'Basic AI agent',
        'Email support',
        '1 user'
      ],
      current: true
    },
    {
      name: 'Pro',
      price: 149,
      features: [
        '500 leads/month',
        '2,500 messages/month',
        'Advanced AI agent',
        'Voice calling',
        'Priority support',
        '5 users'
      ],
      recommended: true
    },
    {
      name: 'Agency',
      price: 499,
      features: [
        'Unlimited leads',
        'Unlimited messages',
        'Custom AI training',
        'Voice + SMS + Email',
        'Dedicated support',
        'Unlimited users',
        'White-label option'
      ]
    }
  ];

  return (
    <div className="p-6 lg:p-8" data-testid="settings-page">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight" style={{ fontFamily: 'Barlow Condensed' }}>
          SETTINGS
        </h1>
        <p className="text-muted-foreground mt-1">
          Manage your account and integrations
        </p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="bg-card border border-border rounded-none">
          <TabsTrigger value="profile" className="rounded-none data-[state=active]:bg-primary/20">
            <User className="h-4 w-4 mr-2" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="integrations" className="rounded-none data-[state=active]:bg-primary/20">
            <Key className="h-4 w-4 mr-2" />
            Integrations
          </TabsTrigger>
          <TabsTrigger value="notifications" className="rounded-none data-[state=active]:bg-primary/20">
            <Bell className="h-4 w-4 mr-2" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="billing" className="rounded-none data-[state=active]:bg-primary/20">
            <CreditCard className="h-4 w-4 mr-2" />
            Billing
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile">
          <Card className="bg-card border-border/40">
            <CardHeader>
              <CardTitle style={{ fontFamily: 'Barlow Condensed' }}>PROFILE INFORMATION</CardTitle>
              <CardDescription>
                Update your account details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Full Name</Label>
                  <Input
                    defaultValue={user?.name}
                    className="bg-background border-border rounded-none"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    defaultValue={user?.email}
                    disabled
                    className="bg-background border-border rounded-none"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Company</Label>
                  <Input
                    defaultValue={user?.company || ''}
                    className="bg-background border-border rounded-none"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Input
                    defaultValue={user?.role || 'user'}
                    disabled
                    className="bg-background border-border rounded-none"
                  />
                </div>
              </div>
              <Button className="bg-primary rounded-none glow-primary">
                Save Changes
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Integrations Tab */}
        <TabsContent value="integrations">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* AI / LLM */}
            <Card className="bg-card border-border/40">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-purple-500/20 rounded-sm flex items-center justify-center">
                    <Bot className="h-5 w-5 text-purple-400" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Claude AI (Anthropic)</CardTitle>
                    <CardDescription>AI-powered conversations</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label>API Key</Label>
                  <Input
                    type="password"
                    placeholder="sk-ant-..."
                    value={apiKeys.anthropic}
                    onChange={(e) => setApiKeys({...apiKeys, anthropic: e.target.value})}
                    className="bg-background border-border rounded-none"
                    data-testid="anthropic-key"
                  />
                </div>
              </CardContent>
            </Card>

            {/* SMS */}
            <Card className="bg-card border-border/40">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-blue-500/20 rounded-sm flex items-center justify-center">
                    <MessageSquare className="h-5 w-5 text-blue-400" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Twilio SMS</CardTitle>
                    <CardDescription>SMS messaging</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Account SID</Label>
                  <Input
                    type="password"
                    placeholder="AC..."
                    value={apiKeys.twilio_sid}
                    onChange={(e) => setApiKeys({...apiKeys, twilio_sid: e.target.value})}
                    className="bg-background border-border rounded-none"
                    data-testid="twilio-sid"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Auth Token</Label>
                  <Input
                    type="password"
                    placeholder="Token..."
                    value={apiKeys.twilio_token}
                    onChange={(e) => setApiKeys({...apiKeys, twilio_token: e.target.value})}
                    className="bg-background border-border rounded-none"
                    data-testid="twilio-token"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Email */}
            <Card className="bg-card border-border/40">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-green-500/20 rounded-sm flex items-center justify-center">
                    <Mail className="h-5 w-5 text-green-400" />
                  </div>
                  <div>
                    <CardTitle className="text-base">SendGrid</CardTitle>
                    <CardDescription>Email outreach</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label>API Key</Label>
                  <Input
                    type="password"
                    placeholder="SG..."
                    value={apiKeys.sendgrid}
                    onChange={(e) => setApiKeys({...apiKeys, sendgrid: e.target.value})}
                    className="bg-background border-border rounded-none"
                    data-testid="sendgrid-key"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Voice */}
            <Card className="bg-card border-border/40">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-orange-500/20 rounded-sm flex items-center justify-center">
                    <Phone className="h-5 w-5 text-orange-400" />
                  </div>
                  <div>
                    <CardTitle className="text-base">VAPI Voice</CardTitle>
                    <CardDescription>AI voice calling</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label>API Key</Label>
                  <Input
                    type="password"
                    placeholder="vapi_..."
                    value={apiKeys.vapi}
                    onChange={(e) => setApiKeys({...apiKeys, vapi: e.target.value})}
                    className="bg-background border-border rounded-none"
                    data-testid="vapi-key"
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          <Button onClick={handleSaveApiKeys} className="mt-6 bg-primary rounded-none glow-primary">
            Save All API Keys
          </Button>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications">
          <Card className="bg-card border-border/40">
            <CardHeader>
              <CardTitle style={{ fontFamily: 'Barlow Condensed' }}>NOTIFICATION PREFERENCES</CardTitle>
              <CardDescription>
                Configure when you want to be notified
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {Object.entries(notifications).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium capitalize">{key.replace(/_/g, ' ')}</p>
                    <p className="text-sm text-muted-foreground">
                      Get notified when this event occurs
                    </p>
                  </div>
                  <Switch
                    checked={value}
                    onCheckedChange={(checked) => setNotifications({...notifications, [key]: checked})}
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Billing Tab */}
        <TabsContent value="billing">
          <div className="space-y-6">
            {/* Current Plan */}
            <Card className="bg-card border-border/40">
              <CardHeader>
                <CardTitle style={{ fontFamily: 'Barlow Condensed' }}>CURRENT PLAN</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold" style={{ fontFamily: 'Barlow Condensed' }}>
                      Starter
                    </p>
                    <p className="text-muted-foreground">$49/month</p>
                  </div>
                  <Badge className="bg-green-500">Active</Badge>
                </div>
              </CardContent>
            </Card>

            {/* Plans */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {pricingPlans.map((plan) => (
                <Card 
                  key={plan.name}
                  className={`bg-card border-border/40 relative ${
                    plan.recommended ? 'border-primary' : ''
                  }`}
                >
                  {plan.recommended && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="bg-primary">Recommended</Badge>
                    </div>
                  )}
                  <CardHeader>
                    <CardTitle style={{ fontFamily: 'Barlow Condensed' }}>{plan.name.toUpperCase()}</CardTitle>
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-bold">${plan.price}</span>
                      <span className="text-muted-foreground">/month</span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3">
                      {plan.features.map((feature, i) => (
                        <li key={i} className="flex items-center gap-2 text-sm">
                          <Check className="h-4 w-4 text-green-400" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                    <Button 
                      className={`w-full mt-6 rounded-none ${
                        plan.current 
                          ? 'bg-muted text-muted-foreground cursor-default' 
                          : plan.recommended 
                            ? 'bg-primary glow-primary' 
                            : 'bg-secondary'
                      }`}
                      disabled={plan.current}
                    >
                      {plan.current ? 'Current Plan' : 'Upgrade'}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;
