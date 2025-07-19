import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { StickyNote, Plus, User, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import type { ContactNote, InsertContactNote } from "@shared/schema";

interface ContactNotesProps {
  contactId: number;
  contactName: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function ContactNotes({ contactId, contactName, isOpen, onClose }: ContactNotesProps) {
  const [newNote, setNewNote] = useState("");

  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: notes = [], isLoading } = useQuery({
    queryKey: ['/api/contacts', contactId, 'notes'],
    enabled: isOpen,
  });

  const createNoteMutation = useMutation({
    mutationFn: async (noteData: InsertContactNote) => {
      await apiRequest("POST", `/api/contacts/${contactId}/notes`, noteData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/contacts', contactId, 'notes'] });
      setNewNote("");

    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;
    
    createNoteMutation.mutate({
      contactId,
      content: newNote.trim(),
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + " at " + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getUserDisplayName = (note: ContactNote) => {
    const firstName = note.userFirstName || "";
    const lastName = note.userLastName || "";
    return (firstName + " " + lastName).trim() || "Unknown User";
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <StickyNote className="w-5 h-5" />
            Notes for {contactName}
          </DialogTitle>
          <DialogDescription>
            View and add notes to track important information about this contact.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Notes List */}
          <div className="flex-1 overflow-y-auto space-y-4 mb-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : notes.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <StickyNote className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>No notes yet. Add the first note!</p>
              </div>
            ) : (
              notes.map((note: ContactNote) => (
                <div key={note.id} className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                      <User className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-medium text-sm">
                          {getUserDisplayName(note)}
                        </span>
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDate(note.createdAt)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">
                        {note.content}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Add Note Form */}
          <div className="border-t pt-4">
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label htmlFor="note" className="block text-sm font-medium text-gray-700 mb-1">
                  Add a note
                </label>
                <Textarea
                  id="note"
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Enter your note here..."
                  className="min-h-[80px] resize-none"
                />
              </div>
              <div className="flex justify-end">
                <Button
                  type="submit"
                  disabled={!newNote.trim() || createNoteMutation.isPending}
                  className="flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  {createNoteMutation.isPending ? "Adding..." : "Add Note"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}