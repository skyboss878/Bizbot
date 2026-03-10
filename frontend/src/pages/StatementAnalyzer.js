import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { ScrollArea } from '../components/ui/scroll-area';
import { Progress } from '../components/ui/progress';
import { toast } from 'sonner';
import { 
  FileText,
  Upload,
  DollarSign,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const StatementCard = ({ statement }) => {
  const formatCurrency = (value) => {
    if (!value) return 'N/A';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card className="bg-card border-border/40 card-hover">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-primary/20 rounded-sm flex items-center justify-center">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-sm font-medium">
                  {statement.filename}
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  {new Date(statement.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
            <Badge className={statement.analysis_status === 'completed' ? 'bg-green-500' : 'bg-yellow-500'}>
              {statement.analysis_status === 'completed' ? (
                <><CheckCircle className="h-3 w-3 mr-1" /> Analyzed</>
              ) : (
                <><AlertTriangle className="h-3 w-3 mr-1" /> Pending</>
              )}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="p-3 bg-muted/50 rounded-sm">
              <p className="text-xs text-muted-foreground mb-1">Monthly Volume</p>
              <p className="text-lg font-bold" style={{ fontFamily: 'Barlow Condensed' }}>
                {formatCurrency(statement.monthly_volume)}
              </p>
            </div>
            <div className="p-3 bg-muted/50 rounded-sm">
              <p className="text-xs text-muted-foreground mb-1">Effective Rate</p>
              <p className="text-lg font-bold" style={{ fontFamily: 'Barlow Condensed' }}>
                {statement.effective_rate ? `${statement.effective_rate}%` : 'N/A'}
              </p>
            </div>
            <div className="p-3 bg-red-500/10 rounded-sm">
              <p className="text-xs text-muted-foreground mb-1">Current Fees</p>
              <p className="text-lg font-bold text-red-400" style={{ fontFamily: 'Barlow Condensed' }}>
                {formatCurrency(statement.fees_paid)}
              </p>
            </div>
            <div className="p-3 bg-green-500/10 rounded-sm">
              <p className="text-xs text-muted-foreground mb-1">Annual Savings</p>
              <p className="text-lg font-bold text-green-400" style={{ fontFamily: 'Barlow Condensed' }}>
                {formatCurrency(statement.potential_savings)}
              </p>
            </div>
          </div>

          {statement.processor_name && (
            <div className="flex items-center justify-between pt-4 border-t border-border">
              <div>
                <p className="text-xs text-muted-foreground">Current Processor</p>
                <p className="font-medium">{statement.processor_name}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">With Cash Discount</p>
                <p className="font-bold text-green-400">$0/month</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

const StatementAnalyzer = () => {
  const [statements, setStatements] = useState([]);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedLead, setSelectedLead] = useState('');
  const { getAuthHeaders } = useAuth();

  const fetchData = async () => {
    try {
      const [stmtRes, leadsRes] = await Promise.all([
        axios.get(`${API}/statements`, { headers: getAuthHeaders() }),
        axios.get(`${API}/leads`, { headers: getAuthHeaders() })
      ]);
      setStatements(stmtRes.data);
      setLeads(leadsRes.data);
    } catch (error) {
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [getAuthHeaders]);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      toast.error('Please upload a PDF file');
      return;
    }

    if (!selectedLead) {
      toast.error('Please select a lead first');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      await axios.post(
        `${API}/statements/upload?lead_id=${selectedLead}`,
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
      setUploading(false);
    }
  };

  const totalSavings = statements.reduce((sum, s) => sum + (s.potential_savings || 0), 0);
  const totalVolume = statements.reduce((sum, s) => sum + (s.monthly_volume || 0), 0);
  const avgRate = statements.length > 0 
    ? statements.reduce((sum, s) => sum + (s.effective_rate || 0), 0) / statements.length
    : 0;

  return (
    <div className="p-6 lg:p-8" data-testid="statements-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" style={{ fontFamily: 'Barlow Condensed' }}>
            STATEMENT ANALYZER
          </h1>
          <p className="text-muted-foreground mt-1">
            AI-powered merchant statement analysis
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedLead}
            onChange={(e) => setSelectedLead(e.target.value)}
            className="bg-background border border-border h-10 px-3 text-sm rounded-none"
            data-testid="select-lead"
          >
            <option value="">Select a lead...</option>
            {leads.map((lead) => (
              <option key={lead.id} value={lead.id}>
                {lead.business_name}
              </option>
            ))}
          </select>
          <label htmlFor="statement-upload-main">
            <input
              id="statement-upload-main"
              type="file"
              accept=".pdf"
              onChange={handleFileUpload}
              className="hidden"
              data-testid="upload-statement"
            />
            <Button
              asChild
              className="bg-primary rounded-none glow-primary cursor-pointer"
              disabled={uploading || !selectedLead}
            >
              <span>
                {uploading ? (
                  <div className="status-working h-4 w-4 mr-2"></div>
                ) : (
                  <Upload className="h-4 w-4 mr-2" />
                )}
                Upload Statement
              </span>
            </Button>
          </label>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="bg-card border-border/40">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 bg-primary/20 rounded-sm flex items-center justify-center">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Analyzed</p>
                <p className="text-3xl font-bold" style={{ fontFamily: 'Barlow Condensed' }}>
                  {statements.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/40">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 bg-blue-500/20 rounded-sm flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Volume</p>
                <p className="text-3xl font-bold" style={{ fontFamily: 'Barlow Condensed' }}>
                  ${(totalVolume / 1000).toFixed(0)}K
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/40">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 bg-red-500/20 rounded-sm flex items-center justify-center">
                <TrendingDown className="h-6 w-6 text-red-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg Rate</p>
                <p className="text-3xl font-bold" style={{ fontFamily: 'Barlow Condensed' }}>
                  {avgRate.toFixed(2)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/40">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 bg-green-500/20 rounded-sm flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-green-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Savings</p>
                <p className="text-3xl font-bold text-green-400" style={{ fontFamily: 'Barlow Condensed' }}>
                  ${(totalSavings / 1000).toFixed(0)}K
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Statements List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="status-working h-8 w-8"></div>
        </div>
      ) : statements.length === 0 ? (
        <Card className="bg-card border-border/40">
          <CardContent className="py-20 text-center">
            <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <h3 className="text-lg font-semibold mb-2">No Statements Analyzed</h3>
            <p className="text-muted-foreground mb-4">
              Upload merchant statements to analyze fees and calculate savings
            </p>
          </CardContent>
        </Card>
      ) : (
        <ScrollArea className="h-[600px]">
          <div className="space-y-4 pr-4">
            {statements.map((statement) => (
              <StatementCard key={statement.id} statement={statement} />
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
};

export default StatementAnalyzer;
