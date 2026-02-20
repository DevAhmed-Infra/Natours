const express = require("express");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
const mongoSanitize = require("mongo-sanitizer");
const { xss } = require("express-xss-sanitizer");
const hpp = require("hpp");
const path = require("path");
const cookieParser = require("cookie-parser");

const AppError = require("./utils/appError");
const globalErrorHandler = require("./controllers/errorController");
const tourRouter = require("./routes/tourRoutes");
const userRouter = require("./routes/userRoutes");
const reviewRouter = require("./routes/reviewRouter");
const viewRouter = require("./routes/viewRouter");

const app = express();

app.set("view engine", "pug");
app.set("views", path.join(__dirname, "views"));

app.use(express.static(path.join(__dirname, "public")));
app.use(helmet());

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

// Health check for templates
app.get("/health", (req, res) => {
  console.log("Health check route hit");
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use("/", viewRouter);
app.use("/api/v1/tours", tourRouter);
app.use("/api/v1/users", userRouter);
app.use("/api/v1/:tourId/reviews", reviewRouter);
app.use("/api/v1/reviews", reviewRouter);

app.use((req, res, next) => {
  next(AppError.create(`Can't find ${req.originalUrl} on this server`, 404));
});

app.use(globalErrorHandler);

module.exports = app;
