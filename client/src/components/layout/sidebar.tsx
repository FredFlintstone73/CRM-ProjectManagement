import { Link, useLocation } from "wouter";
import { Users, BarChart3, CheckSquare, FolderOpen, LogOut, Building2, TrendingUp, Calendar, MessageSquare, Settings, ChevronDown, ChevronRight, UserCheck, UserPlus, UserCog, Handshake, FileText, ChevronLeft, Shield, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import type { User } from "@shared/schema";
import { useAccessControl } from "@/hooks/useAccessControl";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useState, useEffect, useRef, useCallback } from "react";
import SearchTrigger from "@/components/search/search-trigger";

interface SidebarProps {
  width: number;
  onWidthChange: (width: number) => void;
}

export default function Sidebar({ width, onWidthChange }: SidebarProps) {
  const [location] = useLocation();
  const { user, isAuthenticated, isLoading } = useAuth() as { user: User | null; isAuthenticated: boolean; isLoading: boolean };
  const { isAdministrator } = useAccessControl();

  const [isResizing, setIsResizing] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  
  const collapsedWidth = 64;
  const currentWidth = isCollapsed ? collapsedWidth : width;





  const navigation = [
    { name: 'Dashboard', href: '/', icon: BarChart3 },
    { name: 'Projects', href: '/projects', icon: FolderOpen },
    { name: 'Templates', href: '/templates', icon: FileText },
    { name: 'Tasks', href: '/tasks', icon: CheckSquare },
    { name: 'Marketing', href: '/marketing', icon: TrendingUp },
    { name: 'Calendar', href: '/calendar', icon: Calendar },
    { name: 'Messages', href: '/messages', icon: MessageSquare },
    ...(isAdministrator ? [
      { name: 'User Management', href: '/user-management', icon: Users },
      { name: 'Administration', href: '/administration', icon: Shield },
      { name: 'Dialpad', href: '/dialpad', icon: Phone }
    ] : []),
    { name: 'Settings', href: '/settings', icon: Settings },
  ];



  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('Mouse down on resize handle');
    setIsResizing(true);
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing) return;
    
    const newWidth = e.clientX;
    const minWidth = 200;
    const maxWidth = 400;
    
    console.log('Resizing to width:', newWidth);
    
    if (newWidth >= minWidth && newWidth <= maxWidth) {
      onWidthChange(newWidth);
    }
  }, [isResizing, onWidthChange]);

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
  }, []);

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    } else {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing, handleMouseMove, handleMouseUp]);

  return (
    <div 
      ref={sidebarRef}
      className="relative flex flex-col bg-slate-900 border-r border-slate-700 h-full transition-all duration-300"
      style={{ 
        width: `${currentWidth}px`, 
        minWidth: isCollapsed ? `${collapsedWidth}px` : '200px', 
        maxWidth: isCollapsed ? `${collapsedWidth}px` : '400px' 
      }}
    >
      <div className="sidebar-nav flex flex-col flex-grow overflow-hidden h-full">
        {/* Logo */}
        <div className="flex items-center px-6 py-6 border-b border-white/10">
          <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'}`}>
            <div className="p-2 bg-primary/10 rounded-lg">
              <Building2 size={24} className="text-primary" />
            </div>
            {!isCollapsed && (
              <div>
                <h1 className="text-lg font-bold text-white">ClientHub</h1>
                <p className="text-xs text-sidebar-foreground/70">CRM Platform</p>
              </div>
            )}
          </div>
        </div>
        
        {/* Search Bar */}
        {!isCollapsed && (
          <div className="px-4 py-3">
            <SearchTrigger />
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {/* Dashboard */}
          <Link 
            href="/" 
            className={`sidebar-nav-item ${isCollapsed ? 'justify-center' : ''} ${location === '/' ? 'active' : ''}`}
            title={isCollapsed ? "Dashboard" : ""}
          >
            <BarChart3 size={20} />
            {!isCollapsed && <span>Dashboard</span>}
          </Link>

          {/* Contacts */}
          <Link 
            href="/contacts" 
            className={`sidebar-nav-item ${isCollapsed ? 'justify-center' : ''} ${location.startsWith('/contacts') ? 'active' : ''}`}
            title={isCollapsed ? "Contacts" : ""}
          >
            <Users size={20} />
            {!isCollapsed && <span>Contacts</span>}
          </Link>

          {/* Other navigation items */}
          {navigation.slice(1).map((item) => {
            const Icon = item.icon;
            const isActive = location === item.href;
            return (
              <Link 
                key={item.name} 
                href={item.href} 
                className={`sidebar-nav-item ${isCollapsed ? 'justify-center' : ''} ${isActive ? 'active' : ''}`}
                title={isCollapsed ? item.name : ""}
              >
                <Icon size={20} />
                {!isCollapsed && <span>{item.name}</span>}
              </Link>
            );
          })}
        </nav>
        
        {/* User Profile */}
        <div className="px-4 py-4 border-t border-white/10">
          <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
            <div className={`flex items-center ${isCollapsed ? '' : 'gap-3'}`}>
              <Avatar className="w-8 h-8">
                <AvatarImage src={user?.profileImageUrl || ''} alt={user?.firstName || ''} />
                <AvatarFallback className="bg-primary/20 text-primary">
                  {user?.firstName?.charAt(0) || 'U'}{user?.lastName?.charAt(0) || ''}
                </AvatarFallback>
              </Avatar>
              {!isCollapsed && (
                <div className="flex-1">
                  <p className="text-sm font-medium text-white">
                    {user?.firstName} {user?.lastName}
                  </p>
                  <p className="text-xs text-sidebar-foreground/70 truncate">{user?.email}</p>
                </div>
              )}
            </div>
            {!isCollapsed && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="ml-2 text-sidebar-foreground/70 hover:text-white hover:bg-white/5"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
      
      {/* Resize Handle */}
      <div
        className="absolute top-0 right-0 w-6 h-full transition-colors"
        style={{ 
          backgroundColor: '#1e293b',
          zIndex: 999 
        }}
        title={isCollapsed ? "Expand sidebar" : "Collapse sidebar or drag to resize"}
      >
        {/* Collapse/Expand Button */}
        <div 
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-6 h-8 flex items-center justify-center hover:bg-slate-600 rounded transition-colors cursor-pointer"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleCollapse();
          }}
          style={{ zIndex: 1000 }}
        >
          <span 
            className="text-slate-300 text-base font-mono select-none"
            dangerouslySetInnerHTML={{
              __html: isCollapsed ? '&#62;' : '&#60;'
            }}
          />
        </div>
        
        {/* Resize Drag Area (only when not collapsed) */}
        {!isCollapsed && (
          <div
            className="absolute top-0 left-0 w-full h-full cursor-col-resize hover:bg-slate-600/50 transition-colors"
            onMouseDown={(e) => {
              // Only trigger resize if not clicking on the chevron
              const rect = e.currentTarget.getBoundingClientRect();
              const centerX = rect.left + rect.width / 2;
              const centerY = rect.top + rect.height / 2;
              const clickDistance = Math.sqrt(
                Math.pow(e.clientX - centerX, 2) + Math.pow(e.clientY - centerY, 2)
              );
              
              // If click is far from center, allow resize
              if (clickDistance > 20) {
                handleMouseDown(e);
              }
            }}
            style={{ zIndex: 998 }}
          />
        )}
      </div>
    </div>
  );
}
