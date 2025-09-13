import React, { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Avatar, AvatarImage } from "../ui/avatar";
import { Button } from "../ui/button";
import { getProfilePictureUrl } from "@/utils/userHelpers";
import {
  LogOut,
  User2,
  ShoppingCart,
  PackageCheck,
  PackageSearch,
  Home,
  Package,
  Info,
  Settings
} from "lucide-react";
import { toast } from "sonner";
import axios from "axios";
import { USER_API_ENDPOINT } from "@/utils/data";
import { useCartStore } from "@/store/useCartStore"; // Zustand store
import { useAuthStore } from "@/store/useAuthStore"; // Zustand auth store

const Navbar = () => {
  const navigate = useNavigate();

  // Auth store
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);

  // Cart store
  const items = useCartStore((state) => state.items);

  // Recalculate item count whenever `items` changes
  const itemCount = items.reduce((acc, item) => acc + (item.quantity || 0), 0);

  // Fetch cart when user is present
  useEffect(() => {
    if (user) {
      useCartStore.getState().fetchCart();
    }
  }, [user]);

  // Logout handler
  // Navbar.jsx (inside the component)
const logoutHandler = async () => {
  if (!user) return;

  try {
    // Call Zustand store logout
    await useAuthStore.getState().logout();

    // Clear cart too (optional, if you want cart cleared on logout)
    useCartStore.getState().clearCart?.();

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

            {user && (
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

                  {/* Admin Navigation */}
                  {user?.role === 'Admin' && (
                    <div className="flex items-center gap-2 cursor-pointer w-fit">
                      <Settings className="text-blue-500" />
                      <Button variant="link" className="text-blue-500 hover:text-blue-600">
                        <Link to={"/admin/categories"}>Manage Categories</Link>
                      </Button>
                    </div>
                  )}

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