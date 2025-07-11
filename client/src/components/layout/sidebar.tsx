import { Link, useLocation } from "wouter";
import { Users, BarChart3, CheckSquare, FolderOpen, LogOut, Building2, TrendingUp, Calendar, MessageSquare, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function Sidebar() {
  const [location] = useLocation();
  const { user } = useAuth();

  const navigation = [
    { name: 'Dashboard', href: '/', icon: BarChart3 },
    { name: 'Contacts', href: '/contacts', icon: Users },
    { name: 'Projects', href: '/projects', icon: FolderOpen },
    { name: 'Tasks', href: '/tasks', icon: CheckSquare },
    { name: 'Analytics', href: '/analytics', icon: TrendingUp },
    { name: 'Calendar', href: '/calendar', icon: Calendar },
    { name: 'Messages', href: '/messages', icon: MessageSquare },
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  const handleLogout = () => {
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
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.href;
            return (
              <Link key={item.name} href={item.href}>
                <a className={`sidebar-nav-item ${isActive ? 'active' : ''}`}>
                  <Icon size={20} />
                  <span>{item.name}</span>
                </a>
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
