import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../utils/supabaseClient";
import Input from "../ui/Input";
import Button from "../ui/Button";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";

interface AuthFormProps {
  mode: "login" | "register";
}

const AuthForm: React.FC<AuthFormProps> = ({ mode }) => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (mode === "register" && password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      if (mode === "login") {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        if (data && data.user) {
          localStorage.setItem("user", JSON.stringify(data.user));
        }
        navigate("/");
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        setSuccess(
          "Registration successful! Please check your email to confirm. Redirecting to login...",
        );
        setTimeout(() => {
          navigate("/login");
        }, 3000);
      }
    } catch (error: unknown) {
      if (error && typeof error === "object" && "message" in error) {
        // @ts-expect-error -- Supabase error object may not match Error
        setError((error as any).error_description || (error as Error).message);
      } else {
        setError("An unexpected error occurred");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <p className="text-error-500 dark:text-error-400 text-xs sm:text-sm bg-error-50 dark:bg-error-900/30 p-3 sm:p-4 rounded-xl">
          {error}
        </p>
      )}
      {mode === "register" && success && (
        <p className="text-success-500 dark:text-success-400 text-xs sm:text-sm bg-success-50 dark:bg-success-900/30 p-3 sm:p-4 rounded-xl">
          {success}
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
          placeholder={
            mode === "login" ? "Enter your password" : "Create a password"
          }
          className="rounded-xl bg-gray-50 focus:bg-white focus:shadow-md transition-all"
        />
        <button
          type="button"
          className="absolute right-3 top-9 text-gray-400 hover:text-primary-600 transition-colors"
          onClick={() => setShowPassword(!showPassword)}
        >
          {showPassword ? (
            <EyeOff className="h-5 w-5" />
          ) : (
            <Eye className="h-5 w-5" />
          )}
        </button>
      </div>
      {mode === "register" && (
        <div className="relative">
          <Input
            id="confirmPassword"
            type={showPassword ? "text" : "password"}
            label="Confirm Password"
            icon={<Lock className="h-4 w-4" />}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            placeholder="Confirm your password"
            className="rounded-xl bg-gray-50 focus:bg-white focus:shadow-md transition-all"
          />
        </div>
      )}
      <Button
        type="submit"
        disabled={loading}
        fullWidth
        isLoading={loading}
        size="md"
        className="py-3 text-base font-semibold rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 shadow-md transition-all"
      >
        {loading
          ? mode === "login"
            ? "Signing in..."
            : "Creating account..."
          : mode === "login"
          ? "Sign In"
          : "Create Account"}
      </Button>
    </form>
  );
};

export default AuthForm;
