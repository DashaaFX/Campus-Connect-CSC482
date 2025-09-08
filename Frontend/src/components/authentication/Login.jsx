import React, { useEffect } from "react";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuthStore } from "@/store/useAuthStore";
import { useForm } from "@/hooks/useForm"; 

const Login = () => {
  const navigate = useNavigate();
  const { user, loading, login, error, clearError } = useAuthStore();

  const validationRules = {
    email: {
      required: true,
      pattern: { value: /^\S+@\S+\.\S+$/, message: "Invalid email" },
    },
    password: { required: true },
  };

  const { input, errors, handleChange, validate } = useForm(
    { email: "", password: "" },
    error,
    clearError,
    validationRules
  );

  // Redirect if already logged in
  useEffect(() => {
    if (user) navigate("/");
  }, [user, navigate]);

  const submitHandler = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      await login({ email: input.email, password: input.password });
      toast.success("Logged in successfully!");
      navigate("/");
    } catch {
      toast.error("Login failed");
    }
  };

  return (
    <div className="flex items-center justify-center mx-auto max-w-7xl">
      <form
        onSubmit={submitHandler}
        className="w-1/2 p-4 my-10 border border-gray-500 rounded-md"
      >
        <h1 className="mb-5 text-xl font-bold text-center text-blue-600">Login</h1>

        <div className="my-2">
          <Label>Email</Label>
          <Input
            type="email"
            name="email"
            value={input.email}
            onChange={handleChange}
            placeholder="hello@gmail.com"
          />
          {errors.email && <p className="text-sm text-red-500">{errors.email}</p>}
        </div>

        <div className="my-2">
          <Label>Password</Label>
          <Input
            type="password"
            name="password"
            value={input.password}
            onChange={handleChange}
            placeholder="********"
          />
          {errors.password && <p className="text-sm text-red-500">{errors.password}</p>}
        </div>

        {loading ? (
          <div className="flex items-center justify-center my-10">
            <div className="text-blue-600 spinner-border" role="status">
              <span className="sr-only">Loading...</span>
            </div>
          </div>
        ) : (
          <button
            type="submit"
            className="flex items-center justify-center w-3/4 py-3 mx-auto my-3 text-white bg-blue-600 rounded-md hover:bg-blue-800/90"
          >
            Login
          </button>
        )}

        <p className="my-2 text-center text-gray-700">
          Don't have an account?{" "}
          <Link to="/register" className="font-semibold text-blue-700">
            Register
          </Link>
        </p>
      </form>
    </div>
  );
};

export default Login;
