import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, WifiOff } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
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
    continueAsGuest();
    toast({
      title: "You're exploring with demo data",
      description: "Create an account to analyse your own resume.",
    });
    navigate("/dashboard");
  };

  const passwordToggle = (
    <button
      type="button"
      onClick={() => setShowPassword((v) => !v)}
      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
      aria-label={showPassword ? "Hide password" : "Show password"}
    >
      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
    </button>
  );

  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-2">
      {/* Left: what you get, shown as a real result rather than a promise */}
      <aside className="hidden flex-col justify-between bg-foreground p-10 text-background lg:flex">
        <Logo className="text-background" />
        <div className="max-w-md">
          <h2 className="text-4xl font-bold leading-tight">Your resume, read and ranked in seconds.</h2>
          <div className="mt-8 rounded-lg border-2 border-background/20 bg-background/5 p-5">
            <p className="text-sm opacity-70">Example result</p>
            <div className="mt-3 flex items-baseline justify-between">
              <span className="font-semibold">Data Analyst</span>
              <span className="font-display text-2xl font-bold">79%</span>
            </div>
            <div className="mt-2 flex gap-1" aria-hidden="true">
              {Array.from({ length: 10 }, (_, i) => (
                <span key={i} className={`h-2.5 flex-1 rounded-[2px] ${i < 8 ? "bg-marker" : "bg-background/20"}`} />
              ))}
            </div>
            <p className="mt-4 flex flex-wrap gap-1.5 text-sm">
              {["python", "sql", "excel", "tableau"].map((s) => (
                <span key={s} className="marker font-medium">{s}</span>
              ))}
            </p>
            <p className="mt-3 text-sm opacity-70">To learn next: power bi, data visualization</p>
          </div>
        </div>
        <p className="text-sm opacity-60">Free to use. Your resume is read in your browser.</p>
      </aside>

      {/* Right: the form */}
      <main className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-6">
          <Logo className="lg:hidden" />
          <div>
            <h1 className="text-3xl font-bold">Sign in or create an account</h1>
            <p className="mt-1 text-muted-foreground">Save your resume analysis, matches and applications.</p>
          </div>

          {networkError && (
            <Alert variant="destructive">
              <WifiOff className="h-4 w-4" />
              <AlertDescription className="space-y-2">
                <p className="font-semibold">Can't reach the server</p>
                <p className="text-sm">
                  The database may be paused. You can still look around with demo data.
                </p>
                <Button size="sm" variant="outline" onClick={handleGuestLogin} disabled={isGuestLoading}>
                  Explore with demo data
                </Button>
              </AlertDescription>
            </Alert>
          )}

          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Sign in</TabsTrigger>
              <TabsTrigger value="signup">Create account</TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="mt-5">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
                  <Input id="login-email" name="email" type="email" placeholder="you@example.com" required autoComplete="email" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Password</Label>
                  <div className="relative">
                    <Input
                      id="login-password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      required
                      autoComplete="current-password"
                      className="pr-10"
                    />
                    {passwordToggle}
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Signing in…" : "Sign in"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup" className="mt-5">
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-name">Full name</Label>
                  <Input id="signup-name" name="name" type="text" required autoComplete="name" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input id="signup-email" name="email" type="email" placeholder="you@example.com" required autoComplete="email" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <div className="relative">
                    <Input
                      id="signup-password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="At least 6 characters"
                      required
                      minLength={6}
                      autoComplete="new-password"
                      className="pr-10"
                    />
                    {passwordToggle}
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Creating account…" : "Create account"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <div className="border-t pt-5">
            <Button variant="outline" className="w-full" onClick={handleGuestLogin} disabled={isGuestLoading}>
              Explore with demo data
            </Button>
            <p className="mt-2 text-center text-xs text-muted-foreground">No account needed. Nothing is saved.</p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default SimpleAuth;
