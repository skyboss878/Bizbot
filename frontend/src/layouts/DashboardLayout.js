import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, 
  Users, 
  MessageSquare, 
  FileText, 
  Megaphone, 
  BarChart3, 
  Settings, 
  LogOut,
  ChevronLeft,
  ChevronRight,
  Bot,
  Zap
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { ScrollArea } from '../components/ui/scroll-area';

const navItems = [
  { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/leads', icon: Users, label: 'Leads' },
  { path: '/conversations', icon: MessageSquare, label: 'Conversations' },
  { path: '/statements', icon: FileText, label: 'Statements' },
  { path: '/campaigns', icon: Megaphone, label: 'Campaigns' },
  { path: '/analytics', icon: BarChart3, label: 'Analytics' },
  { path: '/settings', icon: Settings, label: 'Settings' },
];

const DashboardLayout = () => {
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside 
        className={`${collapsed ? 'w-16' : 'w-64'} transition-all duration-300 glass-panel border-r border-border/40 flex flex-col fixed h-screen z-50`}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-border/40">
          {!collapsed && (
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 ai-active rounded-sm flex items-center justify-center">
                <Zap className="h-5 w-5 text-white" />
              </div>
              <span className="font-bold text-lg tracking-tight" style={{ fontFamily: 'Barlow Condensed' }}>
                AUTOMERCHANT
              </span>
            </div>
          )}
          {collapsed && (
            <div className="h-8 w-8 ai-active rounded-sm flex items-center justify-center mx-auto">
              <Zap className="h-5 w-5 text-white" />
            </div>
          )}
        </div>

        {/* AI Status */}
        <div className={`px-4 py-3 border-b border-border/40 ${collapsed ? 'text-center' : ''}`}>
          {!collapsed ? (
            <div className="flex items-center gap-2 text-xs">
              <div className="status-live h-2 w-2 rounded-full"></div>
              <span className="text-muted-foreground">AI Agent Active</span>
            </div>
          ) : (
            <Bot className="h-4 w-4 text-green-400 mx-auto" />
          )}
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1 py-4">
          <nav className="space-y-1 px-2">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-sm transition-all duration-200 ${
                    isActive 
                      ? 'bg-primary/20 text-primary border-l-2 border-primary' 
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  } ${collapsed ? 'justify-center' : ''}`
                }
                data-testid={`nav-${item.label.toLowerCase()}`}
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
              </NavLink>
            ))}
          </nav>
        </ScrollArea>

        {/* User Section */}
        <div className="border-t border-border/40 p-4">
          {!collapsed && (
            <div className="mb-3">
              <p className="text-sm font-medium truncate">{user?.name}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className={`w-full ${collapsed ? 'px-0' : ''} text-muted-foreground hover:text-destructive`}
            data-testid="logout-btn"
          >
            <LogOut className="h-4 w-4" />
            {!collapsed && <span className="ml-2">Logout</span>}
          </Button>
        </div>

        {/* Collapse Toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-20 h-6 w-6 bg-card border border-border rounded-full flex items-center justify-center hover:bg-muted transition-colors"
          data-testid="sidebar-toggle"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
      </aside>

      {/* Main Content */}
      <main className={`flex-1 ${collapsed ? 'ml-16' : 'ml-64'} transition-all duration-300`}>
        <div className="min-h-screen grid-texture">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;
