import React from "react";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { Provider } from "react-redux";
import store from "./redux/store";

// Pages & Components
import Layout from "./Layout";
import Home from "./components/components_lite/Home";
import Login from "./components/authentication/Login";
import Register from "./components/authentication/Register";
import Profile from "./components/components_lite/Profile";
import PrivacyPolicy from "./components/components_lite/PrivacyPolicy";
import TermsofService from "./components/components_lite/TermsofService";
import Creator from "./components/creator/Creator";
import PostProduct from "./components/admincomponent/PostProduct";
import EditProductForm from "./components/admincomponent/EditProductForm";
import AdminProducts from "./pages/AdminProducts";

import PublicProductPage from "./components/components_lite/PublicProductPage";
import Products from "./components/components_lite/Products";
import CartPage from "./pages/CartPage";
import CheckoutPage from "./pages/CheckoutPage";
import MyOrdersPage from "./pages/MyOrdersPage";
import MySalesPage from "./pages/MySalesPage";

const appRouter = createBrowserRouter([
  {
    path: "/",
    element: <Layout />,
    children: [
      { path: "", element: <Home /> },
      { path: "home", element: <Home /> },
      { path: "login", element: <Login /> },
      { path: "register", element: <Register /> },
      { path: "profile", element: <Profile /> },
      { path: "privacy-policy", element: <PrivacyPolicy /> },
      { path: "terms-of-service", element: <TermsofService /> },
      { path: "creator", element: <Creator /> },

    
      { path: "products", element: <PublicProductPage /> },
      { path: "products/:id", element: <Products /> },

      
      { path: "cart", element: <CartPage /> },
      { path: "checkout", element: <CheckoutPage /> },

      
      { path: "my-orders", element: <MyOrdersPage /> },
      { path: "my-sales", element: <MySalesPage /> },
      { path: "products/create", element: <PostProduct /> }
     
      {
        path: "admin",
        children: [
          { path: "products", element: <AdminProducts /> },
          
          { path: "products/:id", element: <EditProductForm /> }
        ]
      }
    ]
  }
]);

function App() {
  return (
    <Provider store={store}>
      <RouterProvider router={appRouter} />
    </Provider>
  );
}

export default App;
