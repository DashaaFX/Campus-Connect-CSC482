//Dashnyam - Navbar component

import React, { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Avatar, AvatarImage } from "../ui/avatar";
import { Button } from "../ui/button";
import {
  LogOut,
  User2,
  ShoppingCart,
  PackageCheck,
  PackageSearch,
  Home,
  Package,
  Info,
  Settings,
} from "lucide-react";
import { toast } from "sonner";
import { useCartStore } from "@/store/useCartStore"; // Zustand store
import { useAuthStore } from "@/store/useAuthStore"; // Zustand auth store
import { useChatStore } from "@/store/useChatStore"; // Chat store for block subscriptions
import { useNotificationStore } from "@/store/useNotificationStore"; // Notifications store
import { Bell } from 'lucide-react';
import NotificationDropdown from './NotificationDropdown';

const Navbar = () => {
  const navigate = useNavigate();

  // Auth store
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);

  // Cart store
  const items = useCartStore((state) => state.items);

  // Notifications store
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const subscribeNotifications = useNotificationStore((s) => s.subscribe);
  const clearNotifications = useNotificationStore((s) => s.clear);

  // Recalculate item count whenever `items` changes
  const itemCount = items.reduce((acc, item) => acc + (item.quantity || 0), 0);

  // Fetch cart + notifications when user is present
  useEffect(() => {
    if (user) {
      // Fetch cart items
      useCartStore.getState().fetchCart();
      // Subscribe to notifications
      subscribeNotifications();
    } else {
      clearNotifications();
    }
    // Cleanup when component unmounts or user changes
    return () => {
      if (!user) return;
      // Leave subscription cleanup to store clear()
    };
  }, [user, subscribeNotifications, clearNotifications]);

  // Early block subscription for persisted sessions 
  useEffect(() => {
    if (import.meta.env.VITE_ENABLE_FIREBASE_CHAT === 'true' && user?.firebaseUid) {
      try { useChatStore.getState().ensureBlockSubscriptions(); } catch {/* ignore */}
    }
  }, [user?.firebaseUid]);

  // Logout handler
  // Navbar.jsx (inside the component)
const logoutHandler = async () => {
  if (!user) return;

  try {
    // Call Zustand store logout
    await useAuthStore.getState().logout();

    // Clear cart & notifications on logout
    useCartStore.getState().clearCart?.();
    clearNotifications();

    toast.success("Logged out successfully!");
    navigate("/"); 
  } catch (err) {
    console.error("Logout failed:", err);
    toast.error(err?.message || "Error logging out. Please try again.");
  }
};

 return (
  <div className="sticky top-0 z-50 text-white border-b shadow-md bg-gradient-to-br from-gray-950 via-gray-900 to-gray-800 border-white/10 backdrop-blur">
      <div className="flex items-center justify-between h-16 px-4 mx-auto max-w-7xl">
        <div>
          <Link to="/" className="cursor-pointer">
            <h1 className="text-2xl font-bold">
              <span className="text-yellow-300">Campus</span>{" "}
              <span className="text-pink-300">Connect</span>
            </h1>
          </Link>
        </div>

        <div className="flex items-center gap-10">
          <ul className="flex items-center gap-6 font-medium text-white">
            <li className="flex items-center gap-1">
              <Home size={18} className="text-yellow-300" />
              <Link to={"/Home"} className="hover:text-yellow-300">Home</Link>
            </li>
            <li className="flex items-center gap-1">
              <Package size={18} className="text-pink-300" />
              <Link to={"/products"} className="hover:text-pink-300">Products</Link>
            </li>
            <li className="flex items-center gap-1">
              <Info size={18} className="text-blue-300" />
              <Link to={"/Creator"} className="hover:text-blue-300">About</Link>
            </li>
            {/*Modified Navbar for admin to show Category Management and Product Approval */}
            {user && user.role !== 'Admin' && (
              <>
                <li>
                  <Link to={"/cart"} className="relative flex items-center gap-1 hover:text-red-300">
                    <ShoppingCart size={18} className="text-red-300" />
                    Cart
                    {itemCount > 0 && (
                      <span className="ml-1 inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold text-white bg-red-500 rounded-full">
                        {itemCount}
                      </span>
                    )}
                  </Link>
                </li>
                <li>
                  <Link to={"/my-orders"} className="flex items-center gap-1 hover:text-green-300">
                    <PackageCheck size={18} className="text-green-300" />
                    My Orders
                  </Link>
                </li>
                <li>
                  <Link to={"/my-sales"} className="flex items-center gap-1 hover:text-purple-300">
                    <PackageSearch size={18} className="text-purple-300" />
                    My Sales
                  </Link>
                </li>
              </>
            )}
            {user && user.role === 'Admin' && (
              <>
                <li className="flex items-center gap-1">
                  <Settings size={18} className="text-green-300" />
                  <Link to={"/admin/categories"} className="hover:text-green-300">Manage Categories</Link>
                </li>
                <li className="flex items-center gap-1">
                  <Settings size={18} className="text-purple-300" />
                  <Link to={"/admin/products/approval"} className="hover:text-purple-300">Product Approval</Link>
                </li>
              </>
            )}
            {user && (
              <li className="relative">
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      aria-label="Notifications"
                      type="button"
                      className="relative flex items-center hover:text-yellow-300 focus:outline-none"
                    >
                      <Bell size={20} className="text-yellow-300" />
                      {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-2 inline-flex items-center justify-center px-1.5 py-[2px] 
                        text-[10px] font-bold text-white bg-red-600 rounded-full min-w-[20px]">
                          {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                      )}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent align="end" className="p-0 bg-gradient-to-br from-gray-950 via-gray-900 to-gray-800 border border-white/10 shadow-xl w-[400px] backdrop-blur-md overflow-hidden rounded-lg">
                    <NotificationDropdown />
                  </PopoverContent>
                </Popover>
              </li>
            )}
          </ul>

          {!user ? (
            <div className="flex items-center gap-2">
              <Link to={"/login"}>
                <Button variant="outline" className="text-black bg-white hover:bg-gray-300">Login</Button>
              </Link>
              <Link to={"/register"}>
                <Button className="text-white bg-red-600 hover:bg-red-700">Register</Button>
              </Link>
            </div>
          ) : (
            <Popover>
              <PopoverTrigger asChild>
                <Avatar className="cursor-pointer">
                  <AvatarImage src={user?.profile?.profilePhoto} alt="profile" />
                </Avatar>
              </PopoverTrigger>
              <PopoverContent className="w-80">
                <div className="flex items-center gap-4 space-y-2">
                  <Avatar>
                    <AvatarImage src={user?.profile?.profilePhoto} alt="profile" />
                  </Avatar>
                  <div>
                    <h3 className="font-medium">{user?.fullname}</h3>
                    <p className="text-sm text-muted-foreground">{user?.profile?.bio}</p>
                  </div>
                </div>

                <div className="flex flex-col my-2 text-gray-600">
                  <div className="flex items-center gap-2 cursor-pointer w-fit">
                    <User2 />
                    <Button variant="link">
                      <Link to={"/profile"}>Profile</Link>
                    </Button>
                  </div>

                  {/* Removed admin navigation duplicates in popover; now in top bar */}

                  <div className="flex items-center gap-2 cursor-pointer w-fit">
                  <LogOut className="text-red-500" /> 
                  <Button 
                    onClick={logoutHandler} 
                    variant="link" 
                    className="text-red-500 hover:text-red-600"
                  >
                    Logout
                  </Button>
                </div>
                </div>
              </PopoverContent>
            </Popover>
          )}
        </div>
      </div>
    </div>
  );
};

export default Navbar;