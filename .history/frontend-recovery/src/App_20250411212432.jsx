import React from "react";
import Navbar from "./components/components_lite/Navbar";
import Login from "./components/authentication/Login";
import Register from "./components/authentication/Register";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import Home from "./components/components_lite/Home";
import PrivacyPolicy from "./components/components_lite/PrivacyPolicy.jsx";
import TermsofService from "./components/components_lite/TermsofService.jsx";
import Profile from "./components/components_lite/Profile.jsx";
import ProtectedRoute from "./components/admincomponent/ProtectedRoute";
import Creator from "./components/creator/Creator.jsx";
import PostProduct from "./components/admincomponent/PostProduct";
import EditProductForm from "./components/admincomponent/EditProductForm";
import AdminProducts from "./pages/AdminProducts"; // Import the new component

const appRouter = createBrowserRouter([
  { path: "/", element: <Home /> },
  {
    path: "/login",
    element: <Login />,
  },
  {
    path: "/register",
    element: <Register />,
  },
  {
    path: "/profile",
    element: <Profile />,
  },
  {
    path: "/privacy-policy",
    element: <PrivacyPolicy />,
  },
  {
    path: "/terms-of-service",
    element: <TermsofService />,
  },
  {
    path: "/home",
    element: <Home />,
  },
  {
    path: "/creator",
    element: <Creator />
  },
  {
    path: "/admin",
    children: [
      {
        path: "products",
        element: (
          <ProtectedRoute>
            <AdminProducts />
          </ProtectedRoute>
        ),
      },
      {
        path: "products/create",
        element: (
          <ProtectedRoute>
            <PostProduct />
          </ProtectedRoute>
        ),
      },
      {
        path: "products/:id",
        element: (
          <ProtectedRoute>
            <EditProductForm />
          </ProtectedRoute>
        ),
      },
    ],
  },
]);

function App() {
  return (
    <div>
      
      <RouterProvider router={appRouter} />
    </div>
  );
}

export default App;