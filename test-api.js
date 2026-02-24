const mongoose = require("mongoose");
const dotenv = require("dotenv");
dotenv.config({ path: "./config.env" });

const User = require("./models/userModel");
const Tour = require("./models/tourModel");
const Review = require("./models/reviewModel");
const Booking = require("./models/bookingModel");
const app = require("./app");
const generateToken = require("./utils/generateToken");

let server;
let testTokens = {};
let testUsers = {};
let testTours = {};
let testIds = {};

const http = require("http");

// Helper function to make HTTP requests
const makeRequest = (method, path, body = null, token = null) => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: "localhost",
      port: 3000,
      path,
      method,
      headers: {
        "Content-Type": "application/json",
      },
    };

    if (token) {
      options.headers.Authorization = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let data = "";

      res.on("data", (chunk) => {
        data += chunk;
      });

      res.on("end", () => {
        try {
          const parsed = JSON.parse(data);
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: parsed,
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: data,
          });
        }
      });
    });

    req.on("error", reject);

    if (body) {
      req.write(JSON.stringify(body));
    }

    req.end();
  });
};

const results = {
  passed: [],
  failed: [],
  skipped: [],
};

const test = async (name, fn) => {
  try {
    await fn();
    results.passed.push(name);
    console.log(`✅ ${name}`);
  } catch (error) {
    results.failed.push({ name, error: error.message });
    console.log(`❌ ${name}: ${error.message}`);
  }
};

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

// ==================== SETUP ====================
const setupDatabase = async () => {
  console.log("\n📊 SEEDING TEST DATA...\n");

  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URL);
    console.log("[MongoDB] Connected");

    // Clear existing data
    await User.deleteMany({});
    await Tour.deleteMany({});
    await Review.deleteMany({});
    await Booking.deleteMany({});
    console.log("[Database] Cleared");

    // Create test users
    const users = [
      {
        name: "Test Admin",
        email: "admin@test.com",
        password: "Test@1234",
        passwordConfirm: "Test@1234",
        role: "admin",
      },
      {
        name: "Test User",
        email: "user@test.com",
        password: "Test@1234",
        passwordConfirm: "Test@1234",
        role: "user",
      },
      {
        name: "Test Guide",
        email: "guide@test.com",
        password: "Test@1234",
        passwordConfirm: "Test@1234",
        role: "guide",
      },
      {
        name: "Test Lead Guide",
        email: "leadguide@test.com",
        password: "Test@1234",
        passwordConfirm: "Test@1234",
        role: "lead-guide",
      },
    ];

    for (const userData of users) {
      const user = await User.create(userData);
      testUsers[user.role] = user;
      console.log(`[User] Created ${user.role}: ${user.email}`);
    }

    // Create test tours
    const tours = [
      {
        name: "Amazing Forest Hiker",
        duration: 5,
        maxGroupSize: 25,
        difficulty: "easy",
        price: 397,
        summary: "Breathtaking hike through the Forest Hiker",
        description: "Test tour description",
        imageCover: "tour-1-cover.jpg",
        startLocation: {
          coordinates: [-122.4194, 37.7749],
          address: "San Francisco, CA",
          description: "Start location",
        },
      },
      {
        name: "Ocean Sea Explorer Tour",
        duration: 7,
        maxGroupSize: 15,
        difficulty: "medium",
        price: 497,
        summary: "Explore the sea",
        description: "Test tour description 2",
        imageCover: "tour-2-cover.jpg",
        startLocation: {
          coordinates: [-122.4194, 37.7749],
          address: "San Francisco, CA",
          description: "Start location",
        },
      },
    ];

    for (const tourData of tours) {
      try {
        const tour = await Tour.create(tourData);
        testTours[tour.name] = tour;
        testIds[`tour_${tour._id}`] = tour._id;
        console.log(`[Tour] Created: ${tour.name}`);
      } catch (err) {
        console.error(`[Tour Creation Error] ${tourData.name}:`, err.message);
        throw err;
      }
    }

    // Create test reviews
    const tour1 = testTours["The Forest Hiker"];
    const user1 = testUsers.user;

    if (tour1 && user1) {
      const review = await Review.create({
        review: "Amazing tour!",
        rating: 5,
        tour: tour1._id,
        user: user1._id,
      });
      console.log(`[Review] Created: ${review._id}`);
    }

    console.log("\n✅ TEST DATA SEEDED\n");
  } catch (error) {
    console.error("[Setup Error]", error.message);
    process.exit(1);
  }
};

// ==================== AUTHENTICATION TESTS ====================
const authenticationTests = async () => {
  console.log("\n🔐 TESTING AUTHENTICATION...\n");

  // Test signup
  await test("POST /api/v1/users/signup - Valid", async () => {
    const res = await makeRequest("POST", "/api/v1/users/signup", {
      name: "New User",
      email: "newuser@test.com",
      password: "NewPass@123",
      passwordConfirm: "NewPass@123",
      role: "user",
    });
    assert(res.status === 201, `Expected 201, got ${res.status}`);
    assert(res.body.token, "Token not returned");
  });

  // Test login for each role
  for (const [role, user] of Object.entries(testUsers)) {
    await test(`POST /api/v1/users/login - ${role}`, async () => {
      const res = await makeRequest("POST", "/api/v1/users/login", {
        identifier: user.email,
        password: "Test@1234",
      });
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      assert(res.body.token, `Token not returned for ${role}`);
      testTokens[role] = res.body.token;
    });
  }

  // Test logout
  await test("GET /api/v1/users/logout - Valid", async () => {
    const res = await makeRequest(
      "GET",
      "/api/v1/users/logout",
      null,
      testTokens.user,
    );
    assert(res.status === 200, `Expected 200, got ${res.status}`);
  });

  // Test protected route without token
  await test("GET /api/v1/users/me - No token (should fail)", async () => {
    const res = await makeRequest("GET", "/api/v1/users/me");
    assert(res.status === 401, `Expected 401, got ${res.status}`);
  });

  // Test protected route with token
  await test("GET /api/v1/users/me - With valid token", async () => {
    const res = await makeRequest(
      "GET",
      "/api/v1/users/me",
      null,
      testTokens.user,
    );
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.body.data.data.email === "user@test.com", "User data mismatch");
  });
};

// ==================== TOUR ROUTES TESTS ====================
const tourRouteTests = async () => {
  console.log("\n🏔️ TESTING TOUR ROUTES...\n");

  const tour1 = testTours["Amazing Forest Hiker"];

  // GET all tours (public)
  await test("GET /api/v1/tours - Public access", async () => {
    const res = await makeRequest("GET", "/api/v1/tours");
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(Array.isArray(res.body.data.doc), "Response should be array");
  });

  // GET single tour
  await test("GET /api/v1/tours/:id - Valid ID", async () => {
    const res = await makeRequest("GET", `/api/v1/tours/${tour1._id}`);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.body.data.data._id === tour1._id.toString(), "Tour ID mismatch");
  });

  // GET single tour - invalid ID
  await test("GET /api/v1/tours/:id - Invalid ID format", async () => {
    const res = await makeRequest("GET", "/api/v1/tours/invalidid");
    assert(
      res.status === 400 || res.status === 404,
      `Expected 400 or 404, got ${res.status}`,
    );
  });

  // GET top 5 cheap tours
  await test("GET /api/v1/tours/top-5-cheap - Alias route", async () => {
    const res = await makeRequest("GET", "/api/v1/tours/top-5-cheap");
    assert(res.status === 200, `Expected 200, got ${res.status}`);
  });

  // GET tour stats
  await test("GET /api/v1/tours/tour-stats - Aggregation", async () => {
    const res = await makeRequest("GET", "/api/v1/tours/tour-stats");
    assert(res.status === 200, `Expected 200, got ${res.status}`);
  });

  // POST tour - without authentication
  await test("POST /api/v1/tours - Without token (should fail)", async () => {
    const res = await makeRequest("POST", "/api/v1/tours", {
      name: "Test Tour",
      duration: 5,
      difficulty: "easy",
    });
    assert(res.status === 401, `Expected 401, got ${res.status}`);
  });

  // POST tour - as user (should fail, needs admin/lead-guide)
  await test("POST /api/v1/tours - As user (should fail)", async () => {
    const res = await makeRequest(
      "POST",
      "/api/v1/tours",
      {
        name: "Unauthorized Tour",
        duration: 5,
        maxGroupSize: 10,
        difficulty: "easy",
        price: 999,
        summary: "Test",
        imageCover: "test.jpg",
        startLocation: {
          type: "Point",
          coordinates: [0, 0],
        },
        locations: [],
      },
      testTokens.user,
    );
    assert(res.status === 403, `Expected 403, got ${res.status}`);
  });

  // POST tour - as admin (should succeed)
  await test("POST /api/v1/tours - As admin", async () => {
    const res = await makeRequest(
      "POST",
      "/api/v1/tours",
      {
        name: "Admin Created Tour",
        duration: 5,
        maxGroupSize: 10,
        difficulty: "easy",
        price: 999,
        summary: "Test tour by admin",
        imageCover: "test.jpg",
        startLocation: {
          type: "Point",
          coordinates: [0, 0],
        },
        locations: [],
      },
      testTokens.admin,
    );
    assert(res.status === 201, `Expected 201, got ${res.status}`);
    testIds.newTourId = res.body.data.data._id;
  });

  // PATCH tour - as user (should fail)
  await test("PATCH /api/v1/tours/:id - As user (should fail)", async () => {
    const res = await makeRequest(
      "PATCH",
      `/api/v1/tours/${tour1._id}`,
      { price: 1000 },
      testTokens.user,
    );
    assert(res.status === 403, `Expected 403, got ${res.status}`);
  });

  // PATCH tour - as admin (should succeed)
  await test("PATCH /api/v1/tours/:id - As admin", async () => {
    const res = await makeRequest(
      "PATCH",
      `/api/v1/tours/${tour1._id}`,
      { price: 450 },
      testTokens.admin,
    );
    if (res.status !== 200) {
      console.log(
        "[DEBUG] PATCH tour response:",
        JSON.stringify(res.body, null, 2),
      );
    }
    assert(res.status === 200, `Expected 200, got ${res.status}`);
  });

  // DELETE tour - as user (should fail)
  await test("DELETE /api/v1/tours/:id - As user (should fail)", async () => {
    const res = await makeRequest(
      "DELETE",
      `/api/v1/tours/${tour1._id}`,
      null,
      testTokens.user,
    );
    assert(res.status === 403, `Expected 403, got ${res.status}`);
  });
};

// ==================== REVIEW ROUTES TESTS ====================
const reviewRouteTests = async () => {
  console.log("\n⭐ TESTING REVIEW ROUTES...\n");

  const tour1 = testTours["Amazing Forest Hiker"];

  // GET all reviews
  await test("GET /api/v1/reviews - Public access", async () => {
    const res = await makeRequest("GET", "/api/v1/reviews");
    assert(res.status === 200, `Expected 200, got ${res.status}`);
  });

  // GET reviews for a specific tour (nested)
  await test("GET /api/v1/tours/:tourId/reviews - Nested route", async () => {
    const res = await makeRequest("GET", `/api/v1/tours/${tour1._id}/reviews`);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
  });

  // POST review - without token (should fail)
  await test("POST /api/v1/reviews - Without token (should fail)", async () => {
    const res = await makeRequest("POST", "/api/v1/reviews", {
      review: "Great tour!",
      rating: 5,
      tour: tour1._id,
    });
    assert(res.status === 401, `Expected 401, got ${res.status}`);
  });

  // POST review - as user (should succeed)
  await test("POST /api/v1/reviews - As user (should succeed)", async () => {
    const res = await makeRequest(
      "POST",
      "/api/v1/reviews",
      {
        review: "Excellent tour experience!",
        rating: 5,
        tour: tour1._id,
      },
      testTokens.user,
    );
    assert(res.status === 201, `Expected 201, got ${res.status}`);
    testIds.reviewId = res.body.data.data._id;
  });

  // POST review - nested route
  await test("POST /api/v1/tours/:tourId/reviews - Nested route creation", async () => {
    const tour2 = testTours["Ocean Sea Explorer Tour"];
    const res = await makeRequest(
      "POST",
      `/api/v1/tours/${tour2._id}/reviews`,
      {
        review: "Amazing sea tour!",
        rating: 4,
      },
      testTokens.user,
    );
    assert(res.status === 201, `Expected 201, got ${res.status}`);
  });

  // GET single review
  if (testIds.reviewId) {
    await test("GET /api/v1/reviews/:id - Valid review ID", async () => {
      const res = await makeRequest(
        "GET",
        `/api/v1/reviews/${testIds.reviewId}`,
      );
      assert(res.status === 200, `Expected 200, got ${res.status}`);
    });
  }

  // PATCH review - as user (should succeed)
  if (testIds.reviewId) {
    await test("PATCH /api/v1/reviews/:id - As user", async () => {
      const res = await makeRequest(
        "PATCH",
        `/api/v1/reviews/${testIds.reviewId}`,
        { rating: 4 },
        testTokens.user,
      );
      if (res.status !== 200) {
        console.log(
          "[DEBUG] PATCH response:",
          JSON.stringify(res.body, null, 2),
        );
      }
      assert(res.status === 200, `Expected 200, got ${res.status}`);
    });
  }

  // DELETE review - as user (should succeed)
  if (testIds.reviewId) {
    await test("DELETE /api/v1/reviews/:id - As user", async () => {
      const res = await makeRequest(
        "DELETE",
        `/api/v1/reviews/${testIds.reviewId}`,
        null,
        testTokens.user,
      );
      if (res.status !== 204) {
        console.log(
          "[DEBUG] DELETE response:",
          JSON.stringify(res.body, null, 2),
        );
      }
      assert(res.status === 204, `Expected 204, got ${res.status}`);
    });
  }
};

// ==================== USER ROUTES TESTS ====================
const userRouteTests = async () => {
  console.log("\n👤 TESTING USER ROUTES...\n");

  // GET all users - without token (should fail)
  await test("GET /api/v1/users - Without token (should fail)", async () => {
    const res = await makeRequest("GET", "/api/v1/users");
    assert(res.status === 401, `Expected 401, got ${res.status}`);
  });

  // GET all users - as user (should fail - needs admin)
  await test("GET /api/v1/users - As user (should fail)", async () => {
    const res = await makeRequest(
      "GET",
      "/api/v1/users",
      null,
      testTokens.user,
    );
    assert(res.status === 403, `Expected 403, got ${res.status}`);
  });

  // GET all users - as admin (should succeed)
  await test("GET /api/v1/users - As admin", async () => {
    const res = await makeRequest(
      "GET",
      "/api/v1/users",
      null,
      testTokens.admin,
    );
    assert(res.status === 200, `Expected 200, got ${res.status}`);
  });

  // GET current user
  await test("GET /api/v1/users/me - Current user", async () => {
    const res = await makeRequest(
      "GET",
      "/api/v1/users/me",
      null,
      testTokens.user,
    );
    assert(res.status === 200, `Expected 200, got ${res.status}`);
  });

  // PATCH update password
  await test("PATCH /api/v1/users/updateMyPassword - Valid", async () => {
    const res = await makeRequest(
      "PATCH",
      "/api/v1/users/updateMyPassword",
      {
        passwordCurrent: "Test@1234",
        password: "NewTest@1234",
        passwordConfirm: "NewTest@1234",
      },
      testTokens.user,
    );
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    // Update token after password change
    if (res.body.token) {
      testTokens.user = res.body.token;
    }
  });

  // PATCH update me (profile)
  await test("PATCH /api/v1/users/updateMe - Update profile", async () => {
    const res = await makeRequest(
      "PATCH",
      "/api/v1/users/updateMe",
      { name: "Updated User Name" },
      testTokens.user,
    );
    if (res.status !== 200) {
      console.log(
        "[DEBUG] updateMe response:",
        JSON.stringify(res.body, null, 2),
      );
    }
    assert(res.status === 200, `Expected 200, got ${res.status}`);
  });

  // DELETE account
  await test("DELETE /api/v1/users/deleteMe - Delete account", async () => {
    const res = await makeRequest(
      "DELETE",
      "/api/v1/users/deleteMe",
      null,
      testTokens.user,
    );
    if (res.status !== 204) {
      console.log(
        "[DEBUG] deleteMe response:",
        JSON.stringify(res.body, null, 2),
      );
    }
    assert(res.status === 204, `Expected 204, got ${res.status}`);
  });
};

// ==================== BOOKING ROUTES TESTS ====================
const bookingRouteTests = async () => {
  console.log("\n💳 TESTING BOOKING ROUTES...\n");

  const tour1 = testTours["Amazing Forest Hiker"];

  // GET checkout session - without token (should fail)
  await test("GET /api/v1/bookings/checkout-session/:tourId - Without token (should fail)", async () => {
    const res = await makeRequest(
      "GET",
      `/api/v1/bookings/checkout-session/${tour1._id}`,
    );
    assert(res.status === 401, `Expected 401, got ${res.status}`);
  });

  // GET checkout session - as user
  await test("GET /api/v1/bookings/checkout-session/:tourId - As user", async () => {
    const res = await makeRequest(
      "GET",
      `/api/v1/bookings/checkout-session/${tour1._id}`,
      null,
      testTokens.guide,
    );
    assert(
      res.status === 200 || res.status === 400,
      `Expected 200 or 400, got ${res.status}`,
    );
  });

  // GET all bookings - as user (should fail - needs admin/lead-guide)
  await test("GET /api/v1/bookings - As user (should fail)", async () => {
    const res = await makeRequest(
      "GET",
      "/api/v1/bookings",
      null,
      testTokens.guide,
    );
    assert(
      res.status === 403 || res.status === 401,
      `Expected 403 or 401, got ${res.status}`,
    );
  });

  // GET all bookings - as admin (should succeed)
  await test("GET /api/v1/bookings - As admin", async () => {
    const res = await makeRequest(
      "GET",
      "/api/v1/bookings",
      null,
      testTokens.admin,
    );
    assert(res.status === 200, `Expected 200, got ${res.status}`);
  });

  // POST booking - as admin
  await test("POST /api/v1/bookings - As admin", async () => {
    const res = await makeRequest(
      "POST",
      "/api/v1/bookings",
      {
        tour: tour1._id,
        user: testUsers.user._id,
        price: tour1.price,
        paid: true,
      },
      testTokens.admin,
    );
    assert(res.status === 201, `Expected 201, got ${res.status}`);
    testIds.bookingId = res.body.data.data._id;
  });

  // GET single booking - as admin
  if (testIds.bookingId) {
    await test("GET /api/v1/bookings/:id - As admin", async () => {
      const res = await makeRequest(
        "GET",
        `/api/v1/bookings/${testIds.bookingId}`,
        null,
        testTokens.admin,
      );
      assert(res.status === 200, `Expected 200, got ${res.status}`);
    });
  }

  // PATCH booking - as admin
  if (testIds.bookingId) {
    await test("PATCH /api/v1/bookings/:id - As admin", async () => {
      const res = await makeRequest(
        "PATCH",
        `/api/v1/bookings/${testIds.bookingId}`,
        { paid: false },
        testTokens.admin,
      );
      assert(res.status === 200, `Expected 200, got ${res.status}`);
    });
  }

  // DELETE booking - as admin
  if (testIds.bookingId) {
    await test("DELETE /api/v1/bookings/:id - As admin", async () => {
      const res = await makeRequest(
        "DELETE",
        `/api/v1/bookings/${testIds.bookingId}`,
        null,
        testTokens.admin,
      );
      assert(res.status === 204, `Expected 204, got ${res.status}`);
    });
  }
};

// ==================== MAIN TEST EXECUTION ====================
const runTests = async () => {
  await setupDatabase();

  // Start server
  server = app.listen(3000, async () => {
    console.log("[Server] Started on port 3000 for testing");

    try {
      await authenticationTests();
      await tourRouteTests();
      await reviewRouteTests();
      await userRouteTests();
      await bookingRouteTests();

      // Print summary
      console.log("\n" + "=".repeat(60));
      console.log("📊 TEST SUMMARY");
      console.log("=".repeat(60));
      console.log(`✅ Passed: ${results.passed.length}`);
      console.log(`❌ Failed: ${results.failed.length}`);
      console.log(`⏭️  Skipped: ${results.skipped.length}`);
      console.log(
        `\n⏱️  Total: ${results.passed.length + results.failed.length}`,
      );

      if (results.failed.length > 0) {
        console.log("\n❌ FAILED TESTS:");
        results.failed.forEach((item) => {
          console.log(`  - ${item.name}`);
          console.log(`    Error: ${item.error}`);
        });
      }

      console.log("=".repeat(60) + "\n");

      // Cleanup
      await mongoose.connection.close();
      server.close();
      process.exit(results.failed.length > 0 ? 1 : 0);
    } catch (error) {
      console.error("❌ Test execution error:", error);
      await mongoose.connection.close();
      server.close();
      process.exit(1);
    }
  });
};

// Run tests
runTests();
