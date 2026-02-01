const dotenv = require("dotenv");
dotenv.config({ path: "./config.env" });

const mongoose = require("mongoose");

const app = require("./app");

mongoose
  .connect(process.env.MONGO_URL)
  .then((con) => {
    // console.log(con.connections);
    console.log("MongoDB connected successfully");
  })
  .catch((err) => {
    console.log(err.message);
  });

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`App running on port ${port}...`);
});
