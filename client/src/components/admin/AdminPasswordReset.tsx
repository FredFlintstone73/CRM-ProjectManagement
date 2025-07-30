import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { KeyRound, Shield } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { User } from "@shared/schema";
import { strongPasswordSchema } from "@/lib/password-validation";

const adminResetPasswordSchema = z.object({
  newPassword: strongPasswordSchema,
  confirmPassword: z.string().min(12, "Password confirmation is required"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type AdminResetPasswordForm = z.infer<typeof adminResetPasswordSchema>;

interface AdminPasswordResetProps {
  user: User;
}

export function AdminPasswordReset({ user }: AdminPasswordResetProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);

  const form = useForm<AdminResetPasswordForm>({
    resolver: zodResolver(adminResetPasswordSchema),
    defaultValues: {
      newPassword: "",
      confirmPassword: "",
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async (data: AdminResetPasswordForm) => {
      const response = await apiRequest("POST", `/api/admin/reset-password/${user.id}`, {
        password: data.newPassword,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Password reset successful",
        description: `Password has been reset for ${user.firstName} ${user.lastName}`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setIsOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to reset password",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: AdminResetPasswordForm) => {
    resetPasswordMutation.mutate(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <KeyRound className="w-4 h-4 mr-2" />
          Reset Password
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Reset Password for {user.firstName} {user.lastName}
          </DialogTitle>
        </DialogHeader>
        
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Administrator Password Reset</CardTitle>
            <p className="text-sm text-muted-foreground">
              Set a new password for this user. They will be able to log in immediately with the new password.
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  placeholder="Min 12 chars with letters, numbers & symbols"
                  {...form.register("newPassword")}
                  disabled={resetPasswordMutation.isPending}
                />
                {form.formState.errors.newPassword && (
                  <p className="text-sm text-red-500">
                    {form.formState.errors.newPassword.message}
                  </p>
                )}
                <p className="text-sm text-muted-foreground">
                  Password must be at least 12 characters with letters, numbers, and special characters
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirm new password"
                  {...form.register("confirmPassword")}
                  disabled={resetPasswordMutation.isPending}
                />
                {form.formState.errors.confirmPassword && (
                  <p className="text-sm text-red-500">
                    {form.formState.errors.confirmPassword.message}
                  </p>
                )}
              </div>

              <div className="flex gap-2 pt-4">
                <Button 
                  type="submit" 
                  className="flex-1"
                  disabled={resetPasswordMutation.isPending}
                >
                  {resetPasswordMutation.isPending ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  ) : null}
                  Reset Password
                </Button>
                <Button 
                  type="button"
                  variant="outline" 
                  onClick={() => setIsOpen(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  );
}