import React from "react";
import Navbar from "./components/components_lite/Navbar";
import Login from "./components/authentication/Login";
import Register from "./components/authentication/Register";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import Home from "./components/components_lite/Home";
import PrivacyPolicy from "./components/components_lite/PrivacyPolicy.jsx";
import TermsofService from "./components/components_lite/TermsofService.jsx";
import Profile from "./components/components_lite/Profile.jsx";
import Creator from "./components/creator/Creator.jsx";
import PostProduct from "./components/admincomponent/PostProduct";
import EditProductForm from "./components/admincomponent/EditProductForm";
import AdminProducts from "./pages/AdminProducts"; // Import the new component
import Products from './components/components_lite/Products';
import ProductsList from './components/components_lite/ProductsList'; // Import the new component
import PublicProductPage from "./components/components_lite/PublicProductPage";
import { Provider } from 'react-redux';
import store from "./redux/store";
// ✅ New Pages
import CartPage from "./pages/CartPage.jsx";
import CheckoutPage from "./pages/CheckoutPage.jsx";
import MyOrdersPage from "./pages/MyOrdersPage.jsx";
import MySalesPage from "./pages/MySalesPage.jsx";

const appRouter = createBrowserRouter([
  { path: "/", element: <Home /> },
  { path: '/products/:id', element: <Products /> },
  {path: '/products', element: <PublicProductPage />},
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
  { path: "/cart", element: <CartPage /> },
  { path: "/checkout", element: <CheckoutPage /> },
  { path: "/my-orders", element: <MyOrdersPage /> },
  { path: "/my-sales", element: <MySalesPage /> },
  {
    path: "/admin",
    children: [
      {
        path: "products",
        element: (
          
            <AdminProducts />
          
        ),
      },
      {
        path: "products/create",
        element: (
          
            <PostProduct />
          
        ),
      },
      {
        path: "products/:id",
        element: (
          
            <EditProductForm />
          
        ),
      },
    ],
  },
]);

function App() {
  return (
    <div>
      
      <Provider store={store}>
      <RouterProvider router={appRouter} />
    </Provider>
    </div>
  );
}

export default App;