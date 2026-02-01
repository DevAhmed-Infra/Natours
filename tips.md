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



//Note 

3️⃣ PUT example (FULL replace)
Request
PUT /users/1


Body:

{
  "name": "Ahmed Ali",
  "email": "ahmed.ali@mail.com",
  "age": 23
}

ExpressJS controller
router.put("/users/:id", async (req, res) => {
  const { id } = req.params;

  const user = await User.findByIdAndUpdate(
    id,
    req.body,
    {
      new: true,
      overwrite: true // ⚠️ FULL replacement
    }
  );

  res.json(user);
});

Result
{
  "name": "Ahmed Ali",
  "email": "ahmed.ali@mail.com",
  "age": 23
}


✔ Entire document replaced
✔ Any missing field → removed

4️⃣ PATCH example (PARTIAL update)
Request
PATCH /users/1


Body:

{
  "age": 24
}

ExpressJS controller
router.patch("/users/:id", async (req, res) => {
  const { id } = req.params;
    
  const user = await User.findByIdAndUpdate(
    id,
    { $set: req.body },
    { new: true }
  );

  res.json(user);
});

Result
{
  "name": "Ahmed",
  "email": "ahmed@mail.com",
  "age": 24
}


✔ Only age changed
✔ Other fields preserved