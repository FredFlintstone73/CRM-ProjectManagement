import { useQuery } from "@tanstack/react-query";
import { Clock, User } from "lucide-react";
import type { ContactNote } from "@shared/schema";

interface NotesDisplayProps {
  contactId: number;
  legacyNotes?: string | null;
}

export default function NotesDisplay({ contactId, legacyNotes }: NotesDisplayProps) {
  const { data: notes = [], isLoading } = useQuery<ContactNote[]>({
    queryKey: ['/api/contacts', contactId, 'notes'],
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + " at " + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getUserDisplayName = (note: ContactNote) => {
    const firstName = note.userFirstName || "";
    const lastName = note.userLastName || "";
    return (firstName + " " + lastName).trim() || "Unknown User";
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Legacy notes from contact form */}
      {legacyNotes && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h4 className="font-medium text-yellow-800 mb-2">Contact Form Notes</h4>
          <div className="whitespace-pre-wrap text-sm text-yellow-700">
            {legacyNotes}
          </div>
        </div>
      )}

      {/* Interactive notes */}
      {notes.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-medium text-gray-700">Notes History</h4>
          {notes.map((note: ContactNote) => (
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
          ))}
        </div>
      )}

      {/* Empty state */}
      {!legacyNotes && notes.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <p>No notes yet. Use the "Add Note" button to create the first note.</p>
        </div>
      )}
    </div>
  );
}