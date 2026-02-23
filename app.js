const express = require("express");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
const mongoSanitize = require("mongo-sanitizer");
const { xss } = require("express-xss-sanitizer");
const hpp = require("hpp");
const path = require("path");
const cookieParser = require("cookie-parser");
const compression = require("compression");
const cors = require("cors");

const AppError = require("./utils/appError");
const globalErrorHandler = require("./controllers/errorController");

const bookingRouter = require("./routes/bookingRouter");
const tourRouter = require("./routes/tourRouter");
const userRouter = require("./routes/userRouter");
const reviewRouter = require("./routes/reviewRouter");
const viewRouter = require("./routes/viewRouter");

const app = express();

app.set("view engine", "pug");
app.set("views", path.join(__dirname, "views"));

app.use(express.static(path.join(__dirname, "public")));

// CORS middleware
app.use(
  cors({
    origin: ["http://localhost:3000", "http://127.0.0.1:3000"],
    credentials: true,
    methods: ["GET", "POST", "PATCH", "DELETE", "PUT"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

// Compress responses
app.use(compression());

// Security middleware
if (process.env.NODE_ENV === "development") {
  // More permissive CSP for development
  app.use(
    helmet({
      contentSecurityPolicy: false, // Disable CSP in development for easier testing
    }),
  );
} else {
  // Strict CSP for production
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          baseUri: ["'self'"],
          fontSrc: ["'self'", "https:", "data:"],
          formAction: ["'self'"],
          frameAncestors: ["'self'"],
          frameSrc: ["'self'", "https://js.stripe.com"],
          imgSrc: ["'self'", "data:", "https:"],
          objectSrc: ["'none'"],
          scriptSrc: [
            "'self'",
            "https://js.stripe.com",
            "https://cdn.jsdelivr.net",
            "https://api.mapbox.com",
          ],
          scriptSrcAttr: ["'none'"],
          styleSrc: ["'self'", "https:", "'unsafe-inline'"],
          connectSrc: [
            "'self'",
            "https://js.stripe.com",
            "https://api.stripe.com",
            "https://api.mapbox.com",
          ],
          workerSrc: ["'self'", "blob:"],
          upgradeInsecureRequests: [],
        },
      },
    }),
  );
}

if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

const limiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 100,
  message: "Too many requests",
});

app.use("/api", limiter);
app.use(express.json({ limit: "10kb" }));
app.use(cookieParser());

// Data sanitization against NoSQL query injection
app.use((req, res, next) => {
  req.params = mongoSanitize.sanitize(req.params);
  next();
});

app.use(xss());
app.use(
  hpp({
    whitelist: [
      "duration",
      "ratingQuantity",
      "ratingsAverage",
      "maxGroupSize",
      "difficulty",
      "price",
    ],
  }),
);

app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Test route for debugging
app.get("/test", (req, res) => {
  console.log("Test route hit");
  res.send("OK - Server is responding");
});

app.use("/", viewRouter);
app.use("/api/v1/tours", tourRouter);
app.use("/api/v1/users", userRouter);
app.use("/api/v1/:tourId/reviews", reviewRouter);
app.use("/api/v1/reviews", reviewRouter);
app.use("/api/v1/bookings", bookingRouter);

app.use((req, res, next) => {
  next(AppError.create(`Can't find ${req.originalUrl} on this server`, 404));
});

app.use(globalErrorHandler);

module.exports = app;
