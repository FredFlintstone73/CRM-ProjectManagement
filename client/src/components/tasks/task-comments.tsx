import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { formatDistanceToNow } from "date-fns";
import { MessageCircle, Send, Trash2, Edit3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import type { TaskComment, User } from "@shared/schema";

interface TaskCommentsProps {
  taskId: number;
  taskTitle: string;
}

export function TaskComments({ taskId, taskTitle }: TaskCommentsProps) {
  const [newComment, setNewComment] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [editingText, setEditingText] = useState("");
  const queryClient = useQueryClient();


  // Fetch current user
  const { data: currentUser } = useQuery<User>({
    queryKey: ["/api/auth/user"],
  });

  // Fetch task comments with user data
  const { data: comments = [], isLoading } = useQuery<(TaskComment & { user: User })[]>({
    queryKey: ["/api/tasks", taskId, "comments"],
    queryFn: async () => {
      const response = await fetch(`/api/tasks/${taskId}/comments`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch comments");
      return response.json();
    },
  });

  // Fetch team members for @mentions
  const { data: teamMembers = [] } = useQuery<any[]>({
    queryKey: ["/api/contacts"],
    queryFn: async () => {
      const response = await fetch("/api/contacts", {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch team members");
      return response.json();
    },
    select: (contacts: any[]) => contacts.filter(contact => contact.contactType === "team_member"),
  });

  // Create comment mutation
  const createCommentMutation = useMutation({
    mutationFn: async (comment: string) => {
      return apiRequest("POST", `/api/tasks/${taskId}/comments`, { comment });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", taskId, "comments"] });
      setNewComment("");
    },
    onError: (error) => {
      console.error('Failed to create comment:', error);
    }
  });

  // Update comment mutation
  const updateCommentMutation = useMutation({
    mutationFn: async ({ commentId, comment }: { commentId: number; comment: string }) => {
      return apiRequest("PUT", `/api/task-comments/${commentId}`, { comment });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", taskId, "comments"] });
      setEditingCommentId(null);
      setEditingText("");
    },
    onError: (error) => {
      console.error('Failed to update comment:', error);
    }
  });

  // Delete comment mutation
  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: number) => {
      return apiRequest("DELETE", `/api/task-comments/${commentId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", taskId, "comments"] });
    },
    onError: (error) => {
      console.error('Failed to delete comment:', error);
    }
  });

  const handleSubmitComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    createCommentMutation.mutate(newComment);
  };

  const handleUpdateComment = (commentId: number) => {
    if (!editingText.trim()) return;
    updateCommentMutation.mutate({ commentId, comment: editingText });
  };

  const handleStartEditing = (comment: TaskComment & { user: User }) => {
    setEditingCommentId(comment.id);
    setEditingText(comment.comment);
  };

  const handleCancelEditing = () => {
    setEditingCommentId(null);
    setEditingText("");
  };

  // Extract @mentions from comment text
  const extractMentions = (text: string): string[] => {
    const mentionRegex = /@(\w+)/g;
    const mentions = [];
    let match;
    while ((match = mentionRegex.exec(text)) !== null) {
      mentions.push(match[1]);
    }
    return mentions;
  };

  // Render comment text with @mention highlighting
  const renderCommentText = (text: string) => {
    const parts = text.split(/(@\w+)/g);
    return parts.map((part, index) => {
      if (part.startsWith('@')) {
        return (
          <span key={index} className="bg-blue-100 text-blue-800 px-1 rounded font-medium">
            {part}
          </span>
        );
      }
      return part;
    });
  };

  const getInitials = (firstName?: string, lastName?: string) => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase() || '?';
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Comments
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5" />
          Comments ({comments.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Comments List */}
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {comments.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No comments yet. Start the conversation!
            </p>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className="flex gap-3 p-3 bg-gray-50 rounded-lg">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={comment.user?.profileImageUrl || undefined} />
                  <AvatarFallback className="text-xs">
                    {getInitials(comment.user?.firstName, comment.user?.lastName)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">
                      {comment.user?.firstName} {comment.user?.lastName}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                  {editingCommentId === comment.id ? (
                    <div className="space-y-2">
                      <Textarea
                        value={editingText}
                        onChange={(e) => setEditingText(e.target.value)}
                        className="min-h-[60px]"
                        placeholder="Edit your comment..."
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleUpdateComment(comment.id)}
                          disabled={updateCommentMutation.isPending}
                        >
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleCancelEditing}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-sm whitespace-pre-wrap">
                        {renderCommentText(comment.comment)}
                      </p>
                      {currentUser?.id === comment.userId && (
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleStartEditing(comment)}
                            className="h-6 px-2 text-xs"
                          >
                            <Edit3 className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => deleteCommentMutation.mutate(comment.id)}
                            className="h-6 px-2 text-xs text-red-600 hover:text-red-700"
                            disabled={deleteCommentMutation.isPending}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Add Comment Form */}
        <form onSubmit={handleSubmitComment} className="space-y-3">
          <Textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment... Use @username to mention team members"
            className="min-h-[80px]"
          />
          <div className="flex justify-between items-center">
            <div className="text-xs text-muted-foreground">
              Tip: Use @username to mention team members
            </div>
            <Button
              type="submit"
              disabled={!newComment.trim() || createCommentMutation.isPending}
              className="flex items-center gap-2"
            >
              <Send className="h-4 w-4" />
              Post Comment
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}