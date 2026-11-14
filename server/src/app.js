import express from "express";
import cors from "cors";
import morgan from "morgan";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import path from "path";
import { fileURLToPath } from "url";
import authRoutes from "./routes/authRoutes.js";
import routes from "./routes/index.js";
import { deliveryReport } from "./controllers/smsController.js";
import { notFound, errorHandler } from "./middleware/errors.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isProd = process.env.NODE_ENV === "production";

const app = express();
app.set("trust proxy", 1); // the host (Render, Railway...) sits in front of the app

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        "default-src": ["'self'"],
        "script-src": ["'self'"],
        "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        "font-src": ["'self'", "https://fonts.gstatic.com", "data:"],
        "img-src": ["'self'", "data:"],
        "connect-src": ["'self'"],
      },
    },
  })
);
if (process.env.CLIENT_URL) app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false, limit: "20kb" })); // SMS delivery reports
app.use(morgan(isProd ? "combined" : "dev"));

// Slow down password guessing
app.use(
  "/api/auth/login",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "Too many sign-in attempts. Please wait 15 minutes and try again." },
  })
);

app.get("/api/health", (req, res) => res.json({ status: "ok", app: "PoolIt API" }));
// the SMS provider calls this itself, so it has no login; it is protected by a secret in the address
app.post("/api/sms/delivery", deliveryReport);
app.use("/api/auth", authRoutes);
app.use("/api", routes);

// In production the same server also serves the built React app (one service, one web address)
if (isProd) {
  const dist = path.resolve(__dirname, "../../client/dist");
  app.use(express.static(dist));
  app.get(/^\/(?!api\/).*/, (req, res) => res.sendFile(path.join(dist, "index.html")));
}

// must be LAST
app.use(notFound);
app.use(errorHandler);

export default app;
