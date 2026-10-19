import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { useNavigate } from "react-router-dom";
import { Sparkles, ArrowRight, Eye, EyeOff, LogIn, UserPlus, Zap, WifiOff, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/AuthProvider";

// Detect network-related errors from Supabase
function isNetworkError(err: any): boolean {
  const msg = (err?.message || "").toLowerCase();
  return (
    msg.includes("failed to fetch") ||
    msg.includes("networkerror") ||
    msg.includes("fetch failed") ||
    msg.includes("network request failed") ||
    msg.includes("enotfound") ||
    msg.includes("load failed")
  );
}

const SimpleAuth = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isGuestLoading, setIsGuestLoading] = useState(false);
  const [networkError, setNetworkError] = useState(false);

  const { signIn, signUp, continueAsGuest } = useAuth();

  // ─── Login ───────────────────────────────────────────────────────────────
  const handleLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setNetworkError(false);
    try {
      const formData = new FormData(e.currentTarget);
      const email = formData.get("email") as string;
      const password = formData.get("password") as string;

      const { error } = await signIn(email, password);
      if (error) throw error;

      toast({ title: "Welcome back!", description: "Login successful." });
      navigate("/dashboard");
    } catch (error: any) {
      if (isNetworkError(error)) {
        setNetworkError(true);
      } else {
        toast({
          title: "Login Failed",
          description: error?.message || "Please check your credentials.",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Sign Up ──────────────────────────────────────────────────────────────
  const handleSignup = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setNetworkError(false);
    try {
      const formData = new FormData(e.currentTarget);
      const email = formData.get("email") as string;
      const password = formData.get("password") as string;
      const name = formData.get("name") as string;

      const { error } = await signUp(email, password, name);
      if (error) throw error;

      toast({ title: "Account created!", description: "Welcome to CareerPath AI 🎉" });
      navigate("/dashboard");
    } catch (error: any) {
      if (isNetworkError(error)) {
        setNetworkError(true);
      } else {
        toast({
          title: "Signup Failed",
          description: error?.message || "Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Guest ────────────────────────────────────────────────────────────────
  const handleGuestLogin = async () => {
    setIsGuestLoading(true);
    await new Promise(res => setTimeout(res, 600));
    continueAsGuest();
    toast({
      title: "Welcome, Guest! 👋",
      description: "Exploring CareerPath AI with demo data. Create an account to save your progress.",
    });
    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-5">

        {/* Brand Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">CareerPath AI</span>
          </div>
          <h1 className="text-3xl font-bold text-foreground">Welcome</h1>
          <p className="text-muted-foreground">Start your journey to career clarity</p>
        </div>

        {/* Network Error Banner */}
        {networkError && (
          <Alert variant="destructive" className="border-orange-400 bg-orange-50 dark:bg-orange-950/30 text-orange-800 dark:text-orange-200">
            <WifiOff className="h-4 w-4 !text-orange-600" />
            <AlertDescription className="space-y-2">
              <p className="font-semibold flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                Cannot connect to the server
              </p>
              <p className="text-sm">
                The database is temporarily unreachable (it may be paused).
                You can still use all features as a <strong>Guest</strong> right now.
              </p>
              <Button
                size="sm"
                variant="outline"
                className="mt-2 border-orange-400 text-orange-700 hover:bg-orange-100 dark:hover:bg-orange-900"
                onClick={handleGuestLogin}
                disabled={isGuestLoading}
              >
                <Zap className="w-3.5 h-3.5 mr-1.5" />
                {isGuestLoading ? "Loading…" : "Continue as Guest instead"}
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Guest CTA — always visible at top */}
        <Button
          variant="default"
          size="lg"
          className="w-full gap-2 shadow-sm"
          onClick={handleGuestLogin}
          disabled={isGuestLoading}
        >
          <Zap className={`w-5 h-5 ${isGuestLoading ? "animate-pulse" : ""}`} />
          {isGuestLoading ? "Setting up guest session…" : "Try it instantly — Continue as Guest"}
        </Button>

        <div className="flex items-center gap-3">
          <Separator className="flex-1" />
          <span className="text-xs text-muted-foreground font-medium whitespace-nowrap">
            or sign in / create account
          </span>
          <Separator className="flex-1" />
        </div>

        {/* Auth Card */}
        <Card className="shadow-md border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Account Access</CardTitle>
            <CardDescription>Login or sign up to save your career progress</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">
                  <LogIn className="w-3.5 h-3.5 mr-1.5" />
                  Login
                </TabsTrigger>
                <TabsTrigger value="signup">
                  <UserPlus className="w-3.5 h-3.5 mr-1.5" />
                  Sign Up
                </TabsTrigger>
              </TabsList>

              {/* ── Login Tab ── */}
              <TabsContent value="login" className="mt-4">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input
                      id="login-email"
                      name="email"
                      type="email"
                      placeholder="you@example.com"
                      required
                      autoComplete="email"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Password</Label>
                    <div className="relative">
                      <Input
                        id="login-password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        required
                        autoComplete="current-password"
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "Signing in…" : "Sign In"}
                    {!isLoading && <ArrowRight className="ml-2 w-4 h-4" />}
                  </Button>
                </form>
              </TabsContent>

              {/* ── Sign Up Tab ── */}
              <TabsContent value="signup" className="mt-4">
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">Full Name</Label>
                    <Input
                      id="signup-name"
                      name="name"
                      type="text"
                      placeholder="John Doe"
                      required
                      autoComplete="name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      name="email"
                      type="email"
                      placeholder="you@example.com"
                      required
                      autoComplete="email"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <div className="relative">
                      <Input
                        id="signup-password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Min. 6 characters"
                        required
                        minLength={6}
                        autoComplete="new-password"
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "Creating account…" : "Create Account"}
                    {!isLoading && <ArrowRight className="ml-2 w-4 h-4" />}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Guest info */}
        <p className="text-xs text-center text-muted-foreground leading-relaxed">
          Guest mode gives you <span className="font-medium text-foreground">full access</span> with demo data.
          No account needed. Progress is not saved.
        </p>

      </div>
    </div>
  );
};

export default SimpleAuth;