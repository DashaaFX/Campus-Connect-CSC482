import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Avatar, AvatarImage } from "../ui/avatar";
import { Button } from "../ui/button";
import { LogOut, User2, ShoppingCart, PackageCheck, PackageSearch,Home, Package, Info } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "sonner";
import axios from "axios";
import { setUser } from "@/redux/authSlice";
import { USER_API_ENDPOINT } from "@/utils/data";


const Navbar = () => {
  const { user } = useSelector((store) => store.auth);
  const cartItems = useSelector((state) => state.cart.items);
  const itemCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);


  const dispatch = useDispatch();
  const navigate = useNavigate();


  const logoutHandler = async () => {
    try {
      const res = await axios.post(`${USER_API_ENDPOINT}/logout`, {
        withCredentials: true,
      });
      if (res && res.data && res.data.success) {
        dispatch(setUser(null));
        navigate("/");
        toast.success(res.data.message);
      } else {
        console.error("Error logging out:", res.data);
      }
    } catch (error) {
      console.error("Axios error:", error);
      if (error.response) {
        console.error("Error response:", error.response.data);
      }
      toast.error("Error logging out. Please try again.");
    }
  };

  return (
    <div className="bg-white sticky top-0 z-50 shadow-sm">
      <div className="flex items-center justify-between mx-auto max-w-7xl h-16 px-4">
        <div>
          <Link to="/" className="cursor-pointer">
            <h1 className="text-2xl font-bold">
              <span className="text-[#6B3AC2]">Campus</span>{" "}
              <span className="text-[#FA4F09]">Connect</span>
            </h1>
          </Link>
        </div>

        <div className="flex items-center gap-10">
          <ul className="flex font-medium items-center gap-6">
          <li className="flex items-center gap-1">
            <Home size={18} />
            <Link to={"/Home"}>Home</Link>
          </li>
          <li className="flex items-center gap-1">
            <Package size={18} />
            <Link to={"/admin/products"}>Products</Link>
          </li>
          <li className="flex items-center gap-1">
            <Info size={18} />
            <Link to={"/Creator"}>About</Link>
          </li>
            
            {user && (
              <>
                <li>
                  <Link to={"/cart"} className="relative flex items-center gap-1">
                    <ShoppingCart size={18} />
                    Cart
                    {itemCount > 0 && (
                      <span className="ml-1 inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold text-white bg-red-500 rounded-full">
                        {itemCount}
                      </span>
                    )}
                  </Link>
                </li>
                <li>
                  <Link to={"/my-orders"} className="flex items-center gap-1">
                    <PackageCheck size={18} />
                    My Orders
                  </Link>
                </li>
                <li>
                  <Link to={"/my-sales"} className="flex items-center gap-1">
                    <PackageSearch size={18} />
                    My Sales
                  </Link>
                </li>

              </>
            )}
          </ul>

          {!user ? (
            <div className="flex items-center gap-2">
              <Link to={"/login"}>
                <Button variant="outline">Login</Button>
              </Link>
              <Link to={"/register"}>
                <Button className="bg-red-600 hover:bg-red-700">
                  Register
                </Button>
              </Link>
            </div>
          ) : (
            <Popover>
              <PopoverTrigger asChild>
                <Avatar className="cursor-pointer">
                  <AvatarImage
                    src={user?.profile?.profilePhoto}
                    alt="profile"
                  />
                </Avatar>
              </PopoverTrigger>
              <PopoverContent className="w-80">
                <div className="flex items-center gap-4 space-y-2">
                  <Avatar>
                    <AvatarImage
                      src={user?.profile?.profilePhoto}
                      alt="profile"
                    />
                  </Avatar>
                  <div>
                    <h3 className="font-medium">{user?.fullname}</h3>
                    <p className="text-sm text-muted-foreground">
                      {user?.profile?.bio}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col my-2 text-gray-600">
                  <div className="flex w-fit items-center gap-2 cursor-pointer">
                    <User2 />
                    <Button variant="link">
                      <Link to={"/Profile"}>Profile</Link>
                    </Button>
                  </div>

                  <div className="flex w-fit items-center gap-2 cursor-pointer">
                    <LogOut />
                    <Button onClick={logoutHandler} variant="link">
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
