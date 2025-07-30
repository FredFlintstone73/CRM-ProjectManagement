import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Users, BarChart3, CheckSquare, Mail, UserPlus, Send } from "lucide-react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

const invitationRequestSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Valid email is required"),
  message: z.string().optional(),
});

type InvitationRequestForm = z.infer<typeof invitationRequestSchema>;

export default function Landing() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showRequestForm, setShowRequestForm] = useState(false);

  const form = useForm<InvitationRequestForm>({
    resolver: zodResolver(invitationRequestSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      message: "",
    },
  });
  
  const handleLogin = () => {
    window.location.href = "/";
  };

  const handleJoinTeam = () => {
    setLocation("/accept-invitation");
  };

  const onSubmitRequest = async (data: InvitationRequestForm) => {
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/invitation-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Failed to submit invitation request');
      }

      toast({
        title: "Request Submitted",
        description: "Your invitation request has been sent. You'll receive an email if approved.",
      });

      form.reset();
      setShowRequestForm(false);
    } catch (error) {
      toast({
        title: "Failed to Submit Request",
        description: "There was an error submitting your request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-6">
            <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-white" />
            </div>
            <h1 className="ml-4 text-4xl font-bold text-gray-900">ClientHub</h1>
          </div>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            The all-in-one CRM and project management platform that unifies your contact management and streamlines your workflow.
          </p>
        </div>

        {/* Get Started Today - Moved to top */}
        <div className="text-center mb-16">
          <Card className="max-w-md mx-auto">
            <CardHeader>
              <CardTitle>Get Started Today</CardTitle>
              <CardDescription>
                Start managing your contacts and projects more efficiently
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button onClick={handleLogin} className="w-full" size="lg">
                Sign In to Continue
              </Button>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span>New team member?</span>
                <Button 
                  variant="link" 
                  className="p-0 h-auto text-sm text-primary font-medium" 
                  onClick={handleJoinTeam}
                >
                  <UserPlus className="w-4 h-4 mr-1" />
                  Join the Team
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Request Invitation Section */}
        <div className="text-center mb-16">
          <Card className="max-w-md mx-auto">
            <CardHeader>
              <CardTitle>Need an Invitation?</CardTitle>
              <CardDescription>
                Don't have an invitation code? Request access to join the team
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!showRequestForm ? (
                <Button 
                  onClick={() => setShowRequestForm(true)} 
                  variant="outline" 
                  className="w-full"
                  size="lg"
                >
                  <Send className="w-4 h-4 mr-2" />
                  Request Invitation
                </Button>
              ) : (
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmitRequest)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <FormField
                        control={form.control}
                        name="firstName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>First Name</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="lastName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Last Name</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email Address</FormLabel>
                          <FormControl>
                            <Input type="email" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="message"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Message (Optional)</FormLabel>
                          <FormControl>
                            <Input placeholder="Why would you like to join?" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowRequestForm(false)}
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={isSubmitting}
                        className="flex-1"
                      >
                        {isSubmitting ? "Submitting..." : "Submit Request"}
                      </Button>
                    </div>
                  </form>
                </Form>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          <Card className="text-center">
            <CardHeader>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <CardTitle className="text-lg">Unified Contacts</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Manage clients, prospects, team members, and strategic partners all in one place.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <BarChart3 className="w-6 h-6 text-emerald-600" />
              </div>
              <CardTitle className="text-lg">Project Tracking</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Asana-style project management with templates, assignments, and progress tracking.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <CheckSquare className="w-6 h-6 text-amber-600" />
              </div>
              <CardTitle className="text-lg">Task Management</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Create, assign, and track tasks with priorities and deadlines for efficient workflow.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Mail className="w-6 h-6 text-purple-600" />
              </div>
              <CardTitle className="text-lg">Communication Hub</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Track email interactions and call transcripts for complete client communication history.
              </CardDescription>
            </CardContent>
          </Card>
        </div>


      </div>
    </div>
  );
}
