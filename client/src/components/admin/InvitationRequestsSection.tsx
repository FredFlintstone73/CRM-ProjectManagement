import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { UserPlus, Check, X, Clock, User, Mail, MessageSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface InvitationRequest {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  message?: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export default function InvitationRequestsSection() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: requests = [], isLoading, error } = useQuery({
    queryKey: ['/api/invitation-requests'],
    staleTime: 30000,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: 'approved' | 'rejected' }) => {
      return apiRequest('PATCH', `/api/invitation-requests/${id}`, { status });
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/invitation-requests'] });
      // Also invalidate user invitations since approved requests create invitations
      queryClient.invalidateQueries({ queryKey: ['/api/user-invitations'] });
      
      const message = variables.status === 'approved' 
        ? 'Invitation request approved and user invitation created'
        : 'Invitation request rejected and removed';
        
      toast({
        title: "Request Processed",
        description: message,
      });
    },
    onError: (error) => {
      console.error('Error updating invitation request:', error);
      toast({
        title: "Error",
        description: "Failed to update invitation request.",
        variant: "destructive",
      });
    },
  });

  const handleStatusUpdate = (id: number, status: 'approved' | 'rejected') => {
    updateStatusMutation.mutate({ id, status });
  };

  const getStatusBadge = (status: string) => {
    // Only pending requests will be shown since approved/rejected are deleted
    return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200"><Clock className="w-3 h-3 mr-1" />Pending Review</Badge>;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const pendingCount = requests.filter((r: InvitationRequest) => r.status === 'pending').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <UserPlus className="w-6 h-6" />
        <h2 className="text-xl font-semibold">Invitation Requests</h2>
        {pendingCount > 0 && (
          <Badge variant="secondary" className="ml-2">
            {pendingCount} pending
          </Badge>
        )}
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="text-center py-8">
            <div className="text-center">Loading invitation requests...</div>
          </CardContent>
        </Card>
      ) : requests.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <UserPlus className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500">No invitation requests yet.</p>
            <p className="text-sm text-gray-400 mt-2">
              People can request access through the public landing page.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {requests.map((request: InvitationRequest) => (
            <Card key={request.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-500" />
                      <CardTitle className="text-lg">
                        {request.firstName} {request.lastName}
                      </CardTitle>
                    </div>
                    {getStatusBadge(request.status)}
                  </div>
                  <div className="text-sm text-gray-500">
                    {formatDate(request.createdAt)}
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Mail className="w-4 h-4" />
                  {request.email}
                </div>
              </CardHeader>
              
              {request.message && (
                <CardContent className="pt-0">
                  <div className="flex items-start gap-2 mb-4">
                    <MessageSquare className="w-4 h-4 text-gray-500 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">
                        {request.message}
                      </p>
                    </div>
                  </div>
                </CardContent>
              )}

              {request.status === 'pending' && (
                <CardContent className="pt-0">
                  <Separator className="mb-4" />
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleStatusUpdate(request.id, 'approved')}
                      disabled={updateStatusMutation.isPending}
                      className="bg-green-600 hover:bg-green-700"
                      size="sm"
                    >
                      <Check className="w-4 h-4 mr-2" />
                      Approve
                    </Button>
                    <Button
                      onClick={() => handleStatusUpdate(request.id, 'rejected')}
                      disabled={updateStatusMutation.isPending}
                      variant="outline"
                      className="border-red-200 text-red-700 hover:bg-red-50"
                      size="sm"
                    >
                      <X className="w-4 h-4 mr-2" />
                      Reject
                    </Button>
                  </div>
                </CardContent>
              )}

              {request.status !== 'pending' && request.reviewedAt && (
                <CardContent className="pt-0">
                  <Separator className="mb-4" />
                  <p className="text-sm text-gray-500">
                    {request.status === 'approved' ? 'Approved' : 'Rejected'} on {formatDate(request.reviewedAt)}
                  </p>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}