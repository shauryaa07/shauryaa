import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { registerSchema, loginSchema, type RegisterInput, type LoginInput } from "@shared/schema";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, LogIn, UserPlus } from "lucide-react";

interface AuthFormProps {
  onAuthSuccess: (user: { id: string; username: string; email: string }) => void;
}

export function AuthForm({ onAuthSuccess }: AuthFormProps) {
  const [activeTab, setActiveTab] = useState<"login" | "register">("login");
  const { toast } = useToast();

  // Login form
  const loginForm = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  // Register form
  const registerForm = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
    },
  });

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async (data: LoginInput) => {
      const response = await apiRequest("POST", "/api/auth/login", data);
      return await response.json();
    },
    onSuccess: (data: { user: { id: string; username: string; email: string } }) => {
      toast({
        title: "Welcome back!",
        description: "You've successfully logged in.",
      });
      localStorage.setItem("currentUser", JSON.stringify(data.user));
      onAuthSuccess(data.user);
    },
    onError: (error: any) => {
      toast({
        title: "Login failed",
        description: error.message || "Invalid username or password",
        variant: "destructive",
      });
    },
  });

  // Register mutation
  const registerMutation = useMutation({
    mutationFn: async (data: RegisterInput) => {
      const response = await apiRequest("POST", "/api/auth/register", data);
      return await response.json();
    },
    onSuccess: (data: { user: { id: string; username: string; email: string } }) => {
      toast({
        title: "Account created!",
        description: "Your account has been successfully created.",
      });
      localStorage.setItem("currentUser", JSON.stringify(data.user));
      onAuthSuccess(data.user);
    },
    onError: (error: any) => {
      toast({
        title: "Registration failed",
        description: error.message || "Username already exists or validation failed",
        variant: "destructive",
      });
    },
  });

  const onLogin = (data: LoginInput) => {
    loginMutation.mutate(data);
  };

  const onRegister = (data: RegisterInput) => {
    registerMutation.mutate(data);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
              <span className="text-3xl font-bold text-white">SC</span>
            </div>
          </div>
          <CardTitle className="text-2xl text-center font-bold">StudyConnect</CardTitle>
          <CardDescription className="text-center">
            Connect with study partners in real-time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "login" | "register")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login" data-testid="tab-login">Login</TabsTrigger>
              <TabsTrigger value="register" data-testid="tab-register">Sign Up</TabsTrigger>
            </TabsList>

            {/* Login Tab */}
            <TabsContent value="login" className="space-y-4">
              <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
                  <Input
                    id="login-email"
                    data-testid="input-login-email"
                    type="email"
                    placeholder="Enter your email"
                    {...loginForm.register("email")}
                    disabled={loginMutation.isPending}
                  />
                  {loginForm.formState.errors.email && (
                    <p className="text-sm text-red-500">{loginForm.formState.errors.email.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="login-password">Password</Label>
                  <Input
                    id="login-password"
                    data-testid="input-login-password"
                    type="password"
                    placeholder="Enter your password"
                    {...loginForm.register("password")}
                    disabled={loginMutation.isPending}
                  />
                  {loginForm.formState.errors.password && (
                    <p className="text-sm text-red-500">{loginForm.formState.errors.password.message}</p>
                  )}
                </div>

                <Button
                  type="submit"
                  data-testid="button-login"
                  className="w-full"
                  disabled={loginMutation.isPending}
                >
                  {loginMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Logging in...
                    </>
                  ) : (
                    <>
                      <LogIn className="mr-2 h-4 w-4" />
                      Login
                    </>
                  )}
                </Button>
              </form>
            </TabsContent>

            {/* Register Tab */}
            <TabsContent value="register" className="space-y-4">
              <form onSubmit={registerForm.handleSubmit(onRegister)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="register-username">Username</Label>
                  <Input
                    id="register-username"
                    data-testid="input-register-username"
                    placeholder="Choose a username"
                    {...registerForm.register("username")}
                    disabled={registerMutation.isPending}
                  />
                  {registerForm.formState.errors.username && (
                    <p className="text-sm text-red-500">{registerForm.formState.errors.username.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="register-email">Email</Label>
                  <Input
                    id="register-email"
                    data-testid="input-register-email"
                    type="email"
                    placeholder="Enter your email"
                    {...registerForm.register("email")}
                    disabled={registerMutation.isPending}
                  />
                  {registerForm.formState.errors.email && (
                    <p className="text-sm text-red-500">{registerForm.formState.errors.email.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="register-password">Password</Label>
                  <Input
                    id="register-password"
                    data-testid="input-register-password"
                    type="password"
                    placeholder="Create a password (min 6 characters)"
                    {...registerForm.register("password")}
                    disabled={registerMutation.isPending}
                  />
                  {registerForm.formState.errors.password && (
                    <p className="text-sm text-red-500">{registerForm.formState.errors.password.message}</p>
                  )}
                </div>

                <Button
                  type="submit"
                  data-testid="button-register"
                  className="w-full"
                  disabled={registerMutation.isPending}
                >
                  {registerMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating account...
                    </>
                  ) : (
                    <>
                      <UserPlus className="mr-2 h-4 w-4" />
                      Sign Up
                    </>
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
