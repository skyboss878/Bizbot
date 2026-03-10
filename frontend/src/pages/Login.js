import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { toast } from 'sonner';
import { Zap, Mail, Lock } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await login(email, password);
      toast.success('Welcome back!');
      navigate('/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-8">
            <div className="h-10 w-10 ai-active rounded-sm flex items-center justify-center">
              <Zap className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: 'Barlow Condensed' }}>
                AUTOMERCHANT AI
              </h1>
              <p className="text-xs text-muted-foreground">Merchant Services Automation</p>
            </div>
          </div>

          <Card className="border-border/40 bg-card/50">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl font-bold" style={{ fontFamily: 'Barlow Condensed' }}>
                SIGN IN
              </CardTitle>
              <CardDescription>
                Enter your credentials to access your dashboard
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 h-12 bg-background border-border rounded-none"
                      required
                      data-testid="login-email"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 h-12 bg-background border-border rounded-none"
                      required
                      data-testid="login-password"
                    />
                  </div>
                </div>
                <Button 
                  type="submit" 
                  className="w-full h-12 bg-primary hover:bg-primary/90 text-white font-bold uppercase tracking-wider rounded-none glow-primary"
                  disabled={loading}
                  data-testid="login-submit"
                >
                  {loading ? (
                    <div className="status-working h-5 w-5"></div>
                  ) : (
                    'Sign In'
                  )}
                </Button>
              </form>
              <div className="mt-6 text-center">
                <p className="text-sm text-muted-foreground">
                  Don't have an account?{' '}
                  <Link to="/register" className="text-primary hover:underline font-medium">
                    Create Account
                  </Link>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Right Panel - Image */}
      <div 
        className="hidden lg:flex w-1/2 items-center justify-center relative overflow-hidden"
        style={{
          backgroundImage: 'url(https://images.pexels.com/photos/28428591/pexels-photo-28428591.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940)',
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-primary/80 to-secondary/80"></div>
        <div className="relative z-10 text-center px-8">
          <h2 className="text-4xl font-bold text-white mb-4" style={{ fontFamily: 'Barlow Condensed' }}>
            AI-POWERED SALES
          </h2>
          <p className="text-lg text-white/90 max-w-md">
            Find leads, contact merchants, analyze statements, and close deals automatically with our autonomous AI sales agent.
          </p>
          <div className="mt-8 flex justify-center gap-8">
            <div className="text-center">
              <div className="text-3xl font-bold text-white" style={{ fontFamily: 'Barlow Condensed' }}>24/7</div>
              <div className="text-sm text-white/70">AI Working</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-white" style={{ fontFamily: 'Barlow Condensed' }}>0%</div>
              <div className="text-sm text-white/70">Processing Fees</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-white" style={{ fontFamily: 'Barlow Condensed' }}>$$$</div>
              <div className="text-sm text-white/70">Residual Revenue</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
