// App router component to set up all the routes for components and pages
import React from "react";
import { createBrowserRouter, RouterProvider } from "react-router-dom";

//temporary fix for persisted auth state during developement
if (import.meta.env.DEV && !sessionStorage.getItem('cleared-auth')) {
  localStorage.removeItem('auth-storage');
  sessionStorage.setItem('cleared-auth', 'true');
}

// Pages & Components
import Layout from "./Layout";
import Home from "./components/components_lite/Home";
import Login from "./components/authentication/Login";
import Register from "./components/authentication/Register";
import ProfilePage from "./pages/ProfilePage";
import PrivacyPolicy from "./components/components_lite/PrivacyPolicy";
import TermsofService from "./components/components_lite/TermsofService";
import Creator from "./components/creator/Creator";
import PostProduct from "./components/product/PostProduct";
import EditProductForm from "./components/product/EditProductForm";
import CategoryManagement from "./components/admin/CategoryManagement";
import AdminRoute from "./components/admin/AdminRoute";
import PublicProductPage from "./pages/ProductPage";
import Products from "./components/product/Products";
import CartPage from "./pages/CartPage";
import CheckoutPage from "./pages/CheckoutPage";
import MyOrdersPage from "./pages/MyOrdersPage";
import MySalesPage from "./pages/MySalesPage";
import ProductStatus from "./components/product/ProductStatus";
import OrderDetailPage from "./pages/OrderDetailPage";
import ChatPage from './pages/ChatPage';

const appRouter = createBrowserRouter([
  {
    path: "/",
    element: <Layout />,
    children: [
      { path: "", element: <Home /> },
      { path: "home", element: <Home /> },
      { path: "login", element: <Login /> },
      { path: "register", element: <Register /> },
      { path: "profile", element: <ProfilePage /> },
      { path: "PrivacyPolicy", element: <PrivacyPolicy /> },
      { path: "TermsOfService", element: <TermsofService /> },
      { path: "creator", element: <Creator /> },
      { path: "products", element: <PublicProductPage /> },
      { path: "products/:id", element: <Products /> },
      { path: "admin/products/:productId/status", element: <ProductStatus /> },

      
      { path: "cart", element: <CartPage /> },
      { path: "checkout", element: <CheckoutPage /> },

      
      { path: "my-orders", element: <MyOrdersPage /> },
      { path: "order/:orderId", element: <OrderDetailPage /> }, 
      { path: "my-sales", element: <MySalesPage /> },
      { path: "products/create", element: <PostProduct /> },
      { path: "admin/products/:id", element: <EditProductForm /> },
      { 
        path: "admin/categories", 
        element: (
          <AdminRoute>
            <CategoryManagement />
          </AdminRoute>
        ) 
      },
      //enable chat route if testing chat feature is enabled in env
      ...(import.meta.env.VITE_ENABLE_FIREBASE_CHAT === 'true' ? [{ path: 'chat', element: <ChatPage /> }] : []),
     
    ]
  }
]);

function App() {
  return <RouterProvider router={appRouter} />;
}

export default App;