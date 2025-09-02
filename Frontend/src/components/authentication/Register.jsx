import React, { useEffect } from "react";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuthStore } from "@/store/useAuthStore";
import { useForm } from "@/hooks/useForm";

const Register = () => {
  const navigate = useNavigate();
  const { user, loading, register, error, clearError } = useAuthStore();

  const validationRules = {
    fullname: { required: true },
    email: { 
      required: true, 
      pattern: { value: /^\S+@\S+\.\S+$/, message: "Invalid email" } 
    },
    password: { required: true },
    idnum: { required: true },
    phoneNumber: { 
      required: true, 
      pattern: { value: /^\+?\d{7,15}$/, message: "Invalid phone number" } 
    },
    file: { required: true },
  };

  const { input, errors, handleChange, handleFileChange, validate } = useForm(
    { fullname: "", email: "", password: "", phoneNumber: "", idnum: "", file: null },
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

    const formData = new FormData();
    Object.entries(input).forEach(([key, value]) => {
      if (value) formData.append(key, value);
    });

    try {
      await register(formData);
      toast.success("Registration successful!");
      navigate("/login");
    } catch {
      toast.error(error || "Registration failed");
    }
  };

  return (
    <div className="flex items-center justify-center mx-auto max-w-7xl">
      <form
        onSubmit={submitHandler}
        className="w-1/2 p-4 my-10 border border-gray-500 rounded-md"
      >
        <h1 className="mb-5 text-xl font-bold text-center text-blue-600">Register</h1>

        <div className="my-2">
          <Label>Fullname</Label>
          <Input
            type="text"
            name="fullname"
            value={input.fullname}
            onChange={handleChange}
            placeholder="John Doe"
          />
          {errors.fullname && <p className="text-sm text-red-500">{errors.fullname}</p>}
        </div>

        <div className="my-2">
          <Label>Email</Label>
          <Input
            type="email"
            name="email"
            value={input.email}
            onChange={handleChange}
            placeholder="johndoe@gmail.com"
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

        <div className="my-2">
          <Label>Student ID Number</Label>
          <Input
            type="text"
            name="idnum"
            value={input.idnum}
            onChange={handleChange}
            placeholder="123456789012"
          />
          {errors.idnum && <p className="text-sm text-red-500">{errors.idnum}</p>}
        </div>

        <div className="my-2">
          <Label>Phone Number</Label>
          <Input
            type="tel"
            name="phoneNumber"
            value={input.phoneNumber}
            onChange={handleChange}
            placeholder="+1234567890"
          />
          {errors.phoneNumber && <p className="text-sm text-red-500">{errors.phoneNumber}</p>}
        </div>

        <div className="flex items-center gap-2 my-2">
          <Label>Profile Photo</Label>
          <Input
            type="file"
            accept="image/*"
            onChange={(e) => handleFileChange(e, "file")}
            className="cursor-pointer"
          />
          {errors.file && <p className="text-sm text-red-500">{errors.file}</p>}
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
            className="block w-full py-3 my-3 text-white rounded-md bg-primary hover:bg-primary/90"
          >
            Register
          </button>
        )}

        <p className="my-2 text-center text-gray-500 text-md">
          Already have an account?{" "}
          <Link to="/login" className="font-semibold text-blue-700">
            Login
          </Link>
        </p>
      </form>
    </div>
  );
};

export default Register;
