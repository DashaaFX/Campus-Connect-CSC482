//Editing profile page is currently not working as intended.
//Able to change profile information, but can't save for now.

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Label } from "../ui/label";
import { Button } from "../ui/button";
import api from "@/utils/axios";
import { toast } from "sonner";
import { USER_API_ENDPOINT, UPLOAD_API_ENDPOINT } from "@/utils/data";
import { useAuthStore } from "@/store/useAuthStore";
import { Loader2 } from "lucide-react";
import ImageUploader from "../ui/ImageUploader";

const EditProfileModal = ({ open, setOpen }) => {
  const { user, token, setUser } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [profilePictureFile, setProfilePictureFile] = useState(null);

  // Initialize form state with current user info
  const [input, setInput] = useState({
    fullname: user?.fullname || "",
    email: user?.email || "",
    phoneNumber: user?.phoneNumber || "",
    idnum: user?.idnum || "",
    role: user?.role || "",
    profilePicture: user?.profilePicture || "",
  });

  // Handle input changes
  const changeEventHandler = (e) => {
    setInput({ ...input, [e.target.name]: e.target.value });
  };

  // Handle form submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Only update personal info, do not change profile picture
      const userData = {
        ...input,
        profilePicture: user?.profilePicture || "",
      };

      // Update user profile (without changing profile picture)
      const res = await api.put(
        `${USER_API_ENDPOINT}/profile/update`,
        userData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );
      if (res.data.success && res.data.user) {
        setUser(res.data.user); // Update Zustand store
        toast.success("Profile updated successfully!");
      } else {
        toast.error(res.data.message || "Failed to update profile.");
      }
      setOpen(false);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Error updating profile.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open}>
      <DialogContent
        className="sm:max-w-[500px]"
        onInteractOutside={() => setOpen(false)}
      >
        <DialogHeader>
          <DialogTitle>Edit Personal Information</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid items-center grid-cols-4 gap-4">
              <Label htmlFor="fullname" className="text-right">
                Name
              </Label>
              <input
                type="text"
                id="fullname"
                name="fullname"
                value={input.fullname}
                onChange={changeEventHandler}
                className="col-span-3 p-2 border border-gray-300 rounded-md"
                required
              />
            </div>
            <div className="grid items-center grid-cols-4 gap-4">
              <Label htmlFor="email" className="text-right">
                Email
              </Label>
              <input
                type="email"
                id="email"
                name="email"
                value={input.email}
                onChange={changeEventHandler}
                className="col-span-3 p-2 border border-gray-300 rounded-md"
                required
                disabled // Email should not be editable for security
              />
            </div>
            <div className="grid items-center grid-cols-4 gap-4">
              <Label htmlFor="phoneNumber" className="text-right">
                Phone Number
              </Label>
              <input
                type="tel"
                id="phoneNumber"
                name="phoneNumber"
                value={input.phoneNumber}
                onChange={changeEventHandler}
                className="col-span-3 p-2 border border-gray-300 rounded-md"
              />
            </div>
            <div className="grid items-center grid-cols-4 gap-4">
              <Label htmlFor="idnum" className="text-right">
                ID Number
              </Label>
              <input
                type="text"
                id="idnum"
                name="idnum"
                value={input.idnum}
                onChange={changeEventHandler}
                className="col-span-3 p-2 border border-gray-300 rounded-md"
              />
            </div>
            <div className="grid items-center grid-cols-4 gap-4">
              <Label htmlFor="role" className="text-right">
                Account Type
              </Label>
              <input
                type="text"
                id="role"
                name="role"
                value={input.role}
                onChange={changeEventHandler}
                className="col-span-3 p-2 border border-gray-300 rounded-md"
                disabled // Usually not editable by user
              />
            </div>
            {/* Profile picture uploader is present but does not update profile picture */}
            <div className="grid items-center grid-cols-4 gap-4">
              <Label htmlFor="profilePicture" className="text-right">
                Profile Picture
              </Label>
              <div className="col-span-3">
                <ImageUploader
                  onUploadComplete={setProfilePictureFile}
                  uploadType="profile"
                  requireAuth={true}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            {loading ? (
              <Button className="w-full my-4" disabled>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Please wait
              </Button>
            ) : (
              <Button type="submit" className="w-full my-4">
                Save
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditProfileModal;