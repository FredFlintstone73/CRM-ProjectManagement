import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Search, 
  User, 
  FolderOpen, 
  MessageSquare, 
  FileText, 
  Loader2,
  X,
  ExternalLink
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Link } from "wouter";

interface SearchResult {
  id: string;
  type: 'contact' | 'project' | 'task' | 'note' | 'communication';
  title: string;
  content: string;
  relevance: number;
  metadata: {
    contactName?: string;
    projectName?: string;
    taskName?: string;
    date?: string;
    [key: string]: any;
  };
}

interface AISearchProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AISearch({ isOpen, onClose }: AISearchProps) {
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 500);

    return () => clearTimeout(timer);
  }, [query]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  const { data: searchData, isLoading, error } = useQuery({
    queryKey: ['/api/search', debouncedQuery],
    queryFn: async () => {
      if (!debouncedQuery || debouncedQuery.length < 3) return { results: [], summary: "" };
      const response = await fetch(`/api/search?q=${encodeURIComponent(debouncedQuery)}`, {
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
        },
      });
      if (!response.ok) {
        throw new Error(`${response.status}: ${response.statusText}`);
      }
      return response.json();
    },
    enabled: isAuthenticated && debouncedQuery.length > 2,
    staleTime: 30000,
    retry: (failureCount, error) => {
      if (isUnauthorizedError(error as Error)) {
        return false;
      }
      return failureCount < 2;
    },
  });

  const searchResults = searchData?.results || [];
  const aiSummary = searchData?.summary || "";

  // Debug logging
  console.log('Search query:', debouncedQuery);
  console.log('Search data:', searchData);
  console.log('Search results:', searchResults);
  console.log('AI summary:', aiSummary);

  const getTypeIcon = (type: SearchResult['type']) => {
    switch (type) {
      case 'contact':
        return <User className="h-4 w-4" />;
      case 'project':
        return <FolderOpen className="h-4 w-4" />;
      case 'task':
        return <FileText className="h-4 w-4" />;
      case 'note':
        return <MessageSquare className="h-4 w-4" />;
      case 'communication':
        return <MessageSquare className="h-4 w-4" />;
      default:
        return <Search className="h-4 w-4" />;
    }
  };

  const getTypeColor = (type: SearchResult['type']) => {
    switch (type) {
      case 'contact':
        return 'bg-blue-100 text-blue-800';
      case 'project':
        return 'bg-green-100 text-green-800';
      case 'task':
        return 'bg-orange-100 text-orange-800';
      case 'note':
        return 'bg-purple-100 text-purple-800';
      case 'communication':
        return 'bg-pink-100 text-pink-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getResultLink = (result: SearchResult) => {
    switch (result.type) {
      case 'contact':
        return `/contacts/${result.id}`;
      case 'project':
        return `/projects/${result.id}`;
      case 'task':
        return `/task/${result.id}`;
      default:
        return '#';
    }
  };

  const handleResultClick = () => {
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center pt-20">
      <Card className="w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col">
        <div className="p-4 border-b">
          <div className="flex items-center gap-3">
            <Search className="h-5 w-5 text-muted-foreground" />
            <Input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask AI about your contacts, projects, tasks, or notes..."
              className="flex-1 border-0 focus-visible:ring-0 text-base"
            />
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <CardContent className="flex-1 overflow-y-auto p-0">
          {query.length > 0 && query.length <= 2 && (
            <div className="p-6 text-center text-muted-foreground">
              Type at least 3 characters to search...
            </div>
          )}

          {debouncedQuery.length > 2 && isLoading && (
            <div className="p-6 text-center">
              <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
              <p className="text-muted-foreground">AI is searching your database...</p>
            </div>
          )}

          {error && (
            <div className="p-6 text-center">
              <p className="text-red-600">
                {isUnauthorizedError(error as Error) 
                  ? "Please log in to search"
                  : "Search temporarily unavailable"
                }
              </p>
            </div>
          )}

          {searchResults && searchResults.length === 0 && (
            <div className="p-6 text-center text-muted-foreground">
              <Search className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No results found for "{debouncedQuery}"</p>
              <p className="text-sm mt-2">Try different keywords or ask a question about your data</p>
            </div>
          )}

          {searchResults && searchResults.length > 0 && (
            <div className="p-4">
              {aiSummary && (
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800 font-medium mb-1">AI Insights:</p>
                  <p className="text-sm text-blue-700">{aiSummary}</p>
                </div>
              )}
              <p className="text-sm text-muted-foreground mb-4">
                Found {searchResults.length} result{searchResults.length !== 1 ? 's' : ''}
              </p>
              <div className="space-y-3">
                {searchResults.map((result) => (
                  <Link
                    key={`${result.type}-${result.id}`}
                    href={getResultLink(result)}
                    onClick={handleResultClick}
                  >
                    <Card className="p-4 hover:bg-muted/50 cursor-pointer transition-colors">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-1">
                          {getTypeIcon(result.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="secondary" className={getTypeColor(result.type)}>
                              {result.type}
                            </Badge>
                            {result.metadata.date && (
                              <span className="text-xs text-muted-foreground">
                                {new Date(result.metadata.date).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                          <h4 className="font-medium text-sm mb-1 line-clamp-1">
                            {result.title}
                          </h4>
                          <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                            {result.content}
                          </p>
                          {(result.metadata.contactName || result.metadata.projectName) && (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              {result.metadata.contactName && (
                                <span>Contact: {result.metadata.contactName}</span>
                              )}
                              {result.metadata.projectName && (
                                <span>Project: {result.metadata.projectName}</span>
                              )}
                            </div>
                          )}
                        </div>
                        <ExternalLink className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      </div>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </CardContent>

        <div className="p-4 border-t bg-muted/30">
          <p className="text-xs text-muted-foreground text-center">
            Press <kbd className="px-1.5 py-0.5 text-xs bg-background border rounded">Esc</kbd> to close • 
            AI search across contacts, projects, tasks, and notes
          </p>
        </div>
      </Card>
    </div>
  );
}