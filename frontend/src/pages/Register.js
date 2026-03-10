import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { toast } from 'sonner';
import { Zap, Mail, Lock, User, Building } from 'lucide-react';

const Register = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [company, setCompany] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await register(name, email, password, company);
      toast.success('Account created successfully!');
      navigate('/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Registration Form */}
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
                CREATE ACCOUNT
              </CardTitle>
              <CardDescription>
                Start automating your merchant services sales
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="name"
                      type="text"
                      placeholder="John Smith"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="pl-10 h-12 bg-background border-border rounded-none"
                      required
                      data-testid="register-name"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company">Company (Optional)</Label>
                  <div className="relative">
                    <Building className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="company"
                      type="text"
                      placeholder="Your Company"
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                      className="pl-10 h-12 bg-background border-border rounded-none"
                      data-testid="register-company"
                    />
                  </div>
                </div>
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
                      data-testid="register-email"
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
                      placeholder="Min 6 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 h-12 bg-background border-border rounded-none"
                      minLength={6}
                      required
                      data-testid="register-password"
                    />
                  </div>
                </div>
                <Button 
                  type="submit" 
                  className="w-full h-12 bg-primary hover:bg-primary/90 text-white font-bold uppercase tracking-wider rounded-none glow-primary"
                  disabled={loading}
                  data-testid="register-submit"
                >
                  {loading ? (
                    <div className="status-working h-5 w-5"></div>
                  ) : (
                    'Create Account'
                  )}
                </Button>
              </form>
              <div className="mt-6 text-center">
                <p className="text-sm text-muted-foreground">
                  Already have an account?{' '}
                  <Link to="/login" className="text-primary hover:underline font-medium">
                    Sign In
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
        <div className="absolute inset-0 bg-gradient-to-br from-secondary/80 to-primary/80"></div>
        <div className="relative z-10 text-center px-8">
          <h2 className="text-4xl font-bold text-white mb-4" style={{ fontFamily: 'Barlow Condensed' }}>
            ZERO-FEE PROCESSING
          </h2>
          <p className="text-lg text-white/90 max-w-md">
            Help merchants eliminate credit card processing fees with our cash discount program. Earn residual income while they save thousands.
          </p>
          <div className="mt-8 space-y-4 text-left max-w-sm mx-auto">
            <div className="flex items-center gap-3 text-white/90">
              <div className="h-8 w-8 bg-white/20 rounded-sm flex items-center justify-center">
                <span className="text-lg">1</span>
              </div>
              <span>AI finds qualified leads automatically</span>
            </div>
            <div className="flex items-center gap-3 text-white/90">
              <div className="h-8 w-8 bg-white/20 rounded-sm flex items-center justify-center">
                <span className="text-lg">2</span>
              </div>
              <span>Automated outreach via SMS & Email</span>
            </div>
            <div className="flex items-center gap-3 text-white/90">
              <div className="h-8 w-8 bg-white/20 rounded-sm flex items-center justify-center">
                <span className="text-lg">3</span>
              </div>
              <span>AI analyzes merchant statements</span>
            </div>
            <div className="flex items-center gap-3 text-white/90">
              <div className="h-8 w-8 bg-white/20 rounded-sm flex items-center justify-center">
                <span className="text-lg">4</span>
              </div>
              <span>Close deals and earn residuals</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
