import { Link, useLocation } from "wouter";
import { Users, BarChart3, CheckSquare, FolderOpen, LogOut, Building2, TrendingUp, Calendar, MessageSquare, Settings, ChevronDown, ChevronRight, UserCheck, UserPlus, UserCog, Handshake, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useState, useEffect } from "react";

export default function Sidebar() {
  const [location] = useLocation();
  const { user } = useAuth();
  const [isContactsExpanded, setIsContactsExpanded] = useState(false);

  // Auto-expand contacts when on contacts page
  useEffect(() => {
    if (location.startsWith('/contacts')) {
      setIsContactsExpanded(true);
    }
  }, [location]);

  const navigation = [
    { name: 'Dashboard', href: '/', icon: BarChart3 },
    { name: 'Projects', href: '/projects', icon: FolderOpen },
    { name: 'Templates', href: '/templates', icon: FileText },
    { name: 'Tasks', href: '/tasks', icon: CheckSquare },
    { name: 'Analytics', href: '/analytics', icon: TrendingUp },
    { name: 'Calendar', href: '/calendar', icon: Calendar },
    { name: 'Messages', href: '/messages', icon: MessageSquare },
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  const contactSubCategories = [
    { name: 'Clients', href: '/contacts?type=client', icon: UserCheck },
    { name: 'Prospects', href: '/contacts?type=prospect', icon: UserPlus },
    { name: 'Strategic Partners', href: '/contacts?type=strategic_partner', icon: Handshake },
    { name: 'Team Members', href: '/contacts?type=team_member', icon: UserCog },
  ];

  const handleLogout = () => {
    console.log('Logout button clicked');
    window.location.href = "/api/logout";
  };

  return (
    <div className="hidden md:flex md:w-64 md:flex-col">
      <div className="sidebar-nav flex flex-col flex-grow">
        {/* Logo */}
        <div className="flex items-center px-6 py-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Building2 size={24} className="text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">ClientHub</h1>
              <p className="text-xs text-sidebar-foreground/70">CRM Platform</p>
            </div>
          </div>
        </div>
        
        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-1">
          {/* Dashboard */}
          <Link 
            href="/" 
            className={`sidebar-nav-item ${location === '/' ? 'active' : ''}`}
            onClick={() => console.log('Navigating to Dashboard')}
          >
            <BarChart3 size={20} />
            <span>Dashboard</span>
          </Link>

          {/* Contacts with Sub-categories */}
          <div className="space-y-1">
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Contacts button clicked, current state:', isContactsExpanded);
                setIsContactsExpanded(!isContactsExpanded);
              }}
              className={`sidebar-nav-item w-full ${location.startsWith('/contacts') ? 'active' : ''}`}
              type="button"
            >
              <Users size={20} />
              <span>Contacts</span>
              {isContactsExpanded ? (
                <ChevronDown size={16} className="ml-auto" />
              ) : (
                <ChevronRight size={16} className="ml-auto" />
              )}
            </button>
            
            {isContactsExpanded && (
              <div className="ml-4 space-y-1">
                {contactSubCategories.map((subItem) => {
                  const SubIcon = subItem.icon;
                  const isSubActive = location === subItem.href;
                  return (
                    <Link key={subItem.name} href={subItem.href} className={`sidebar-nav-item text-sm ${isSubActive ? 'active' : ''}`}>
                      <SubIcon size={16} />
                      <span>{subItem.name}</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* Other navigation items */}
          {navigation.slice(1).map((item) => {
            const Icon = item.icon;
            const isActive = location === item.href;
            return (
              <Link 
                key={item.name} 
                href={item.href} 
                className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
                onClick={() => console.log(`Navigating to ${item.name}: ${item.href}`)}
              >
                <Icon size={20} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
        
        {/* User Profile */}
        <div className="px-4 py-4 border-t border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="w-8 h-8">
                <AvatarImage src={user?.profileImageUrl || ''} alt={user?.firstName || ''} />
                <AvatarFallback className="bg-primary/20 text-primary">
                  {user?.firstName?.charAt(0) || 'U'}{user?.lastName?.charAt(0) || ''}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="text-sm font-medium text-white">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-xs text-sidebar-foreground/70 truncate">{user?.email}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="ml-2 text-sidebar-foreground/70 hover:text-white hover:bg-white/5"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
