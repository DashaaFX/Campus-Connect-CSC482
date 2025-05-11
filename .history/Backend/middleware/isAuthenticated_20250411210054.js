import jwt from "jsonwebtoken";
import User from "../models/user.model.js";
import asyncHandler from "./asyncHandler.js";

const authenticateToken = asyncHandler(async (req, res, next) => {
  try {
    // Get token from cookies
    const token = req.cookies.token;
    
    if (!token) {
      return res.status(401).json({ 
        message: "Not authorized, no token provided", 
        success: false 
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (!decoded || !decoded.userId) {
      return res.status(401).json({ 
        message: "Not authorized, invalid token", 
        success: false 
      });
    }

    // Get full user document and attach to request
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      return res.status(401).json({ 
        message: "Not authorized, user not found", 
        success: false 
      });
    }

    // Attach full user object to request
    req.user = user;
    next();
    
  } catch (error) {
    // Handle different JWT errors specifically
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        message: "Not authorized, token expired", 
        success: false 
      });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        message: "Not authorized, invalid token", 
        success: false 
      });
    }
    
    // For other unexpected errors
    return res.status(401).json({ 
      message: "Not authorized", 
      success: false 
    });
  }
});

export default authenticateToken;