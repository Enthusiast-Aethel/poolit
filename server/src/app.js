import express from "express";
import cors from "cors";
import morgan from "morgan";

const app = express();

app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(express.json());
app.use(morgan("dev"));

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", app: "PoolIt API" });
});

export default app;