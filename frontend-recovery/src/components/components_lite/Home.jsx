import React, { useEffect } from "react";
import { useSelector } from "react-redux";
import Navbar from "./Navbar";
import Header from "./Header";
import Categories from "./Categories";
import Footer from "./Footer";
import { useNavigate } from "react-router-dom";

const Home = () => {
 

    return (
    <div>
      <Navbar />
      <Header />
      
      <Footer />
    </div>
  );
};

export default Home;
