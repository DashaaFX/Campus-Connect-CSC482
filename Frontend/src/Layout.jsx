import React from "react";
import Navbar from "./components/components_lite/Navbar";
import { Outlet } from "react-router-dom";
//Load chat moderations early to ensure blocking features reflected 
import ChatModerationHydrator from '@/components/chat/ChatModerationHydrator';

const Layout = () => {
  return (
    <div>
      <ChatModerationHydrator />
      <Navbar />
      <Outlet />
    </div>
  );
};

export default Layout;

