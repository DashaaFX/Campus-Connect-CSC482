import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "./utils/db.js";
import userRoute from "./routes/user.route.js";

import path from 'path';
import { fileURLToPath } from 'url';

import productRoutes from "./routes/products.route.js";

dotenv.config({});
const app = express();

//middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

const corsOptions = {
  origin: ["http://localhost:5173"],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));

const PORT = process.env.PORT || 5001;

 
//api's

app.use("/api/user", userRoute);


app.use('/api/products', productRoutes);
app.use('/uploads', express.static('uploads'));
app.listen(PORT, () => {
  connectDB();
  console.log(`Server is running on port ${PORT}`);
});
