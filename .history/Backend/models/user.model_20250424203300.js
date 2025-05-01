import mongoose from "mongoose";
const userSchema = new mongoose.Schema(
  {
    fullname: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    phoneNumber: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    idnum: {
      type: String,
      required: true,
      unique: true,
    },
    role: {
      type: String,
      enum: ["Buyer", "Seller"],
      default: "Buyer",
      required: true,
    },
    profile: {
      bio: {
        type: String,
      },
      skills: [{ type: String }],
      resume: {
        type: String, // URL to resume file
      },
      resumeOriginalname: {
        type: String, // Original name of resume file
      },
      profilePhoto: {
        type: String, // URL to profile photo file
        default: "",
      },
    },
  },
  { timestamps: true }
);

export const User = mongoose.model("User", userSchema);
