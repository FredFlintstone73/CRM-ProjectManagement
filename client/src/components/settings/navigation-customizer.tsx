import { useState, useEffect } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import {
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { 
  BarChart3,
  MessageSquare,
  Users,
  FolderOpen,
  CheckSquare,
  TrendingUp,
  FileText,
  Calendar,
  UserCog,
  Shield,
  Phone,
  Settings,
  GripVertical,
  RotateCcw
} from "lucide-react";
import { useAccessControl } from "@/hooks/useAccessControl";

interface NavigationItem {
  id: string;
  name: string;
  href: string;
  icon: any;
  adminOnly?: boolean;
}

const iconMap = {
  BarChart3,
  MessageSquare,
  Users,
  FolderOpen,
  CheckSquare,
  TrendingUp,
  FileText,
  Calendar,
  UserCog,
  Shield,
  Phone,
  Settings,
};

const defaultNavigation = [
  { id: 'dashboard', name: 'Dashboard', href: '/', icon: 'BarChart3' },
  { id: 'messages', name: 'Messages', href: '/messages', icon: 'MessageSquare' },
  { id: 'contacts', name: 'Contacts', href: '/contacts', icon: 'Users' },
  { id: 'projects', name: 'Projects', href: '/projects', icon: 'FolderOpen' },
  { id: 'tasks', name: 'Tasks', href: '/tasks', icon: 'CheckSquare' },
  { id: 'marketing', name: 'Marketing', href: '/marketing', icon: 'TrendingUp' },
  { id: 'templates', name: 'Templates', href: '/templates', icon: 'FileText' },
  { id: 'calendar', name: 'Calendar', href: '/calendar', icon: 'Calendar' },
  { id: 'user-management', name: 'User Management', href: '/user-management', icon: 'UserCog', adminOnly: true },
  { id: 'administration', name: 'Administration', href: '/administration', icon: 'Shield', adminOnly: true },
  { id: 'dialpad', name: 'Dialpad', href: '/dialpad', icon: 'Phone', adminOnly: true },
  { id: 'settings', name: 'Settings', href: '/settings', icon: 'Settings' },
];

interface SortableItemProps {
  item: NavigationItem;
}

function SortableItem({ item }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const IconComponent = iconMap[item.icon as keyof typeof iconMap];

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 p-3 bg-white border rounded-lg cursor-grab active:cursor-grabbing shadow-sm pt-[0px] pb-[0px]"
      {...attributes}
      {...listeners}
    >
      <GripVertical className="h-4 w-4 text-muted-foreground" />
      <IconComponent className="h-5 w-5 text-primary" />
      <span className="font-medium">{item.name}</span>
      {item.adminOnly && (
        <span className="ml-auto text-xs bg-primary/10 text-primary px-2 py-1 rounded">
          Admin Only
        </span>
      )}
    </div>
  );
}

export default function NavigationCustomizer() {
  const { isAdministrator } = useAccessControl();
  const { toast } = useToast();
  const [items, setItems] = useState<NavigationItem[]>([]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Load saved navigation order on mount
  useEffect(() => {
    const savedOrder = localStorage.getItem('navigationOrder');
    if (savedOrder) {
      try {
        const orderIds = JSON.parse(savedOrder);
        const orderedItems = orderIds
          .map((id: string) => defaultNavigation.find(item => item.id === id))
          .filter((item): item is NavigationItem => Boolean(item))
          .filter((item: NavigationItem) => !item.adminOnly || isAdministrator);
        
        // Add any new items that might not be in saved order
        const existingIds = orderedItems.map(item => item.id);
        const newItems = defaultNavigation
          .filter(item => !existingIds.includes(item.id))
          .filter(item => !item.adminOnly || isAdministrator);
          
        setItems([...orderedItems, ...newItems]);
      } catch (error) {
        // Fallback to default if parsing fails
        setItems(defaultNavigation.filter(item => !item.adminOnly || isAdministrator));
      }
    } else {
      setItems(defaultNavigation.filter(item => !item.adminOnly || isAdministrator));
    }
  }, [isAdministrator]);

  function handleDragEnd(event: any) {
    const { active, over } = event;

    if (active.id !== over.id) {
      setItems((items) => {
        const oldIndex = items.findIndex(item => item.id === active.id);
        const newIndex = items.findIndex(item => item.id === over.id);

        return arrayMove(items, oldIndex, newIndex);
      });
    }
  }

  const saveOrder = () => {
    const orderIds = items.map(item => item.id);
    localStorage.setItem('navigationOrder', JSON.stringify(orderIds));
    
    // Dispatch custom event to notify sidebar of the change
    window.dispatchEvent(new CustomEvent('navigationOrderChanged'));
    
    toast({
      title: "Navigation Order Saved",
      description: "Your navigation preferences have been saved.",
    });
  };

  const resetToDefault = () => {
    localStorage.removeItem('navigationOrder');
    setItems(defaultNavigation.filter(item => !item.adminOnly || isAdministrator));
    
    // Dispatch custom event to notify sidebar of the change
    window.dispatchEvent(new CustomEvent('navigationOrderChanged'));
    
    toast({
      title: "Navigation Reset",
      description: "Navigation order has been reset to default.",
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Navigation Customization</CardTitle>
        <p className="text-sm text-muted-foreground">
          Drag and drop to reorder navigation items in your sidebar
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={items.map(item => item.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {items.map((item) => (
                <SortableItem key={item.id} item={item} />
              ))}
            </div>
          </SortableContext>
        </DndContext>

        <div className="flex gap-2 pt-4 border-t">
          <Button onClick={saveOrder} className="flex-1">
            Save Order
          </Button>
          <Button onClick={resetToDefault} variant="outline">
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset to Default
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}