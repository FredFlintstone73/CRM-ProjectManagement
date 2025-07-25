import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import ContactForm from "@/components/contacts/contact-form";
import ProjectForm from "@/components/projects/project-form";
import EmailNotificationIcon from "./email-notification-icon";

interface HeaderProps {
  title: string;
  subtitle: string;
  showActions?: boolean;
}

export default function Header({ title, subtitle, showActions = false }: HeaderProps) {
  const queryClient = useQueryClient();
  const [isContactDialogOpen, setIsContactDialogOpen] = useState(false);
  const [isProjectDialogOpen, setIsProjectDialogOpen] = useState(false);

  const handleContactCreated = () => {
    setIsContactDialogOpen(false);
    queryClient.invalidateQueries({ queryKey: ['/api/contacts'] });
  };

  const handleProjectCreated = () => {
    setIsProjectDialogOpen(false);
    queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">{title}</h1>
          <p className="text-sm text-gray-600">{subtitle}</p>
        </div>
        
        <div className="flex items-center space-x-4">
          <EmailNotificationIcon />
          {showActions && (
            <>
            <Dialog open={isContactDialogOpen} onOpenChange={setIsContactDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-primary hover:bg-primary/90">
                  <Plus className="w-4 h-4 mr-2" />
                  New Contact
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Add New Contact</DialogTitle>
                </DialogHeader>
                <ContactForm onSuccess={handleContactCreated} />
              </DialogContent>
            </Dialog>
            
            <Dialog open={isProjectDialogOpen} onOpenChange={setIsProjectDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-emerald-600 hover:bg-emerald-700">
                  <Plus className="w-4 h-4 mr-2" />
                  New Meeting
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Schedule New Meeting</DialogTitle>
                </DialogHeader>
                <ProjectForm onSuccess={handleProjectCreated} />
              </DialogContent>
            </Dialog>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
