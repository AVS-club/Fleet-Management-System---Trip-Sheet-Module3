import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { loginWithOrganization } from "../../utils/auth";
import Input from "../ui/Input";
import Button from "../ui/Button";
import { Building2, Lock, Eye, EyeOff, LogIn } from "lucide-react";
import { toast } from "react-toastify";

interface LoginFormProps {
  showPassword?: boolean;
  setShowPassword?: (show: boolean) => void;
}

const LoginForm: React.FC<LoginFormProps> = ({ 
  showPassword = false, 
  setShowPassword = () => {} 
}) => {
  const navigate = useNavigate();
  const [credentials, setCredentials] = useState({
    organizationUsername: "",
    password: ""
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    
    try {
      const result = await loginWithOrganization(credentials);
      
      toast.success(`Welcome back, ${result.organization.name}!`);
      navigate("/dashboard");
    } catch (error: any) {
      const errorMessage = error.message || 'Login failed';
      setError(errorMessage);
      toast.error(errorMessage);
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
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Organization Username
        </label>
        <div className="relative">
          <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <Input
            id="organizationUsername"
            type="text"
            value={credentials.organizationUsername}
            onChange={(e) => setCredentials({
              ...credentials,
              organizationUsername: e.target.value
            })}
            placeholder="e.g., shree_durga_enterprises"
            className="pl-10 rounded-xl bg-gray-50 focus:bg-white focus:shadow-md transition-all"
            required
          />
        </div>
        <p className="mt-1 text-xs text-gray-500">
          Use your organization's username (not email)
        </p>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Password
        </label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            value={credentials.password}
            onChange={(e) => setCredentials({
              ...credentials,
              password: e.target.value
            })}
            placeholder="Enter your password"
            className="pl-10 rounded-xl bg-gray-50 focus:bg-white focus:shadow-md transition-all"
            required
          />
          <button
            type="button"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-primary-600 transition-colors"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        </div>
      </div>
      <Button
        type="submit"
        disabled={loading}
        fullWidth
        isLoading={loading}
        inputSize="md"
        className="py-3 text-base font-semibold rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 shadow-md transition-all"
        icon={<LogIn className="h-4 w-4" />}
      >
        {loading ? "Signing in..." : "Sign In"}
      </Button>

      <div className="text-center">
        <p className="text-sm text-gray-600">
          Don't have an account?{' '}
          <a href="/register" className="text-primary-600 hover:text-primary-700 font-medium">
            Register your organization
          </a>
        </p>
      </div>
    </form>
  );
};

export default LoginForm;