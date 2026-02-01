The canonical Express app order (battle-tested)

Think: Environment → Core → App → Middleware → Routes → Errors → Server


// Code Example 

// 1. ENV
require("dotenv").config();

// 2. Core imports
const express = require("express");
const morgan = require("morgan");
const cors = require("cors");

// 3. App init
const app = express();

// 4. Middlewares
app.use(express.json());
app.use(cors());
app.use(morgan("dev"));

// 5. DB
const connectDB = require("./config/db");
connectDB();

// 6. Routes
app.use("/api/users", require("./routes/user.routes"));

// 7. 404
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// 8. Error handler
app.use((err, req, res, next) => {
  res.status(err.status || 500).json({ message: err.message });
});

// 9. Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on ${PORT}`));
