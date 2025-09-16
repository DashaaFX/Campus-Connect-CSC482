import React, { useEffect, useState } from "react";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuthStore } from "@/store/useAuthStore";
import { useForm } from "@/hooks/useForm";
import ImageUploader from "../ui/ImageUploader";
import axios from "axios";
import { USER_API_ENDPOINT, UPLOAD_API_ENDPOINT } from "@/utils/data";

const Register = () => {
  const navigate = useNavigate();
  const { user, loading, register, error, clearError } = useAuthStore();
  const [profilePictureFile, setProfilePictureFile] = useState(null);

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
  };

  const { input, errors, handleChange, validate } = useForm(
    { fullname: "", email: "", password: "", phoneNumber: "", idnum: "" },
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

    let profilePictureUrl = null;

    try {
      // First, handle profile picture upload if there's a file
      if (profilePictureFile && profilePictureFile instanceof File) {
        toast.info("Uploading profile picture...");
        
        // Use the registration-specific upload API endpoint (no auth required)
        const uploadResponse = await axios.post(`${UPLOAD_API_ENDPOINT}/registration/url`, {
          fileName: profilePictureFile.name,
          fileType: profilePictureFile.type,
          uploadType: 'profile',
          userId: 'temp-registration-user',
          isRegistration: true
        }, {
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        // Upload the file directly to S3
        await axios.put(uploadResponse.data.uploadUrl, profilePictureFile, {
          headers: { 'Content-Type': profilePictureFile.type }
        });
        
        profilePictureUrl = uploadResponse.data.fileUrl;
      }

      // Create user data with the profile picture URL if available
      const userData = {
        ...input,
        profilePicture: profilePictureUrl
      };

      // Register the user with the profile picture URL
      const registerResult = await register(userData);
      
      toast.success("Registration successful!");
      navigate("/");
    } catch (err) {
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

        <div className="my-2">
          <ImageUploader 
            onUploadComplete={setProfilePictureFile}
            uploadType="profile"
            requireAuth={false}
          />
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

