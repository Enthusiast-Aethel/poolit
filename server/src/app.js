import express from "express";
import cors from "cors";
import morgan from "morgan";
import authRoutes from "./routes/authRoutes.js";
import routes from "./routes/index.js";
import { notFound, errorHandler } from "./middleware/errors.js";

const app = express();

app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(express.json());
app.use(morgan("dev"));

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", app: "PoolIt API" });
});

// Mount authentication routes
app.use("/api/auth", authRoutes);
app.use("/api", routes);

// Must be LAST
app.use(notFound);
app.use(errorHandler);

export default app;