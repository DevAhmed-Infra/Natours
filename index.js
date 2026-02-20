const dotenv = require("dotenv");
dotenv.config({ path: "./config.env" });

const mongoose = require("mongoose");
const app = require("./app");

// Validate required environment variables
const requiredEnvVars = ["MONGO_URL", "JWT_SECRET", "EMAIL_USER", "EMAIL_PASSWORD"];
const missingEnvVars = requiredEnvVars.filter((v) => !process.env[v]);

if (missingEnvVars.length > 0) {
  console.error(
    `Missing required environment variables: ${missingEnvVars.join(", ")}`
  );
  process.exit(1);
}

// Connect to MongoDB and start server
console.log('[MongoDB] Attempting to connect to:', process.env.MONGO_URL.replace(/mongodb\+srv:\/\/(\w+):(.*)@/, 'mongodb+srv://***:***@'));
mongoose
  .connect(process.env.MONGO_URL)
  .then(() => {
    console.log('[MongoDB] Connected successfully');

    const port = process.env.PORT || 3000;
    app.listen(port, () => {
      console.log(`[Server] Running on port ${port}`);
    });
  })
  .catch((err) => {
    console.error('[MongoDB] Connection failed:', err.message);
    process.exit(1);
  });
