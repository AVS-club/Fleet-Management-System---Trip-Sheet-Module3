import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../utils/supabaseClient";
import Input from "../ui/Input";
import Button from "../ui/Button";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";

interface LoginFormProps {
  showPassword?: boolean;
  setShowPassword?: (show: boolean) => void;
}

const LoginForm: React.FC<LoginFormProps> = ({ 
  showPassword = false, 
  setShowPassword = () => {} 
}) => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      if (data && data.user)
        localStorage.setItem("user", JSON.stringify(data.user));
      navigate("/"); // Navigate to dashboard
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'message' in error) {
        // @ts-expect-error -- Supabase error object may not match Error
        setError((error as any).error_description || (error as Error).message);
      } else {
        setError('An unexpected error occurred');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleLogin} className="space-y-5">
      {error && (
        <p className="text-error-500 dark:text-error-400 text-xs sm:text-sm bg-error-50 dark:bg-error-900/30 p-3 sm:p-4 rounded-xl">
          {error}
        </p>
      )}
      <div>
        <Input
          id="email"
          type="email"
          label="Email"
          icon={<Mail className="h-4 w-4" />}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="Enter your email"
          className="rounded-xl bg-gray-50 focus:bg-white focus:shadow-md transition-all"
        />
      </div>
      <div className="relative">
        <Input
          id="password"
          type={showPassword ? "text" : "password"}
          label="Password"
          icon={<Lock className="h-4 w-4" />}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          placeholder="Enter your password"
          className="rounded-xl bg-gray-50 focus:bg-white focus:shadow-md transition-all"
        />
        <button
          type="button"
          className="absolute right-3 top-9 text-gray-400 hover:text-primary-600 transition-colors"
          onClick={() => setShowPassword(!showPassword)}
        >
          {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
        </button>
      </div>
      <Button
        type="submit"
        disabled={loading}
        fullWidth
        isLoading={loading}
        inputSize="md"
        className="py-3 text-base font-semibold rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 shadow-md transition-all"
      >
        {loading ? "Signing in..." : "Sign In"}
      </Button>
    </form>
  );
};

export default LoginForm;