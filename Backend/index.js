import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "./utils/db.js";
import userRoute from "./routes/user.route.js";
import path from 'path';
import { fileURLToPath } from 'url';
import productRoutes from "./routes/products.route.js";
import categoryRoutes from './routes/category.route.js';
import cartRoutes from './routes/cart.route.js';
import orderRoutes from './routes/order.route.js';



const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


dotenv.config({});
const app = express();

const corsOptions = {
  origin: ["http://localhost:5173"],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));

//middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());



const PORT = process.env.PORT || 5001;

 
//api's

app.use("/api/user", userRoute);


app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/cart', cartRoutes);
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/api/orders', orderRoutes);

app.listen(PORT, () => {
  connectDB();
  console.log(`Server is running on port ${PORT}`);
});
