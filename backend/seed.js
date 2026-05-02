const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const dotenv = require("dotenv");
const User = require("./models/User");
const Workout = require("./models/Workout");
const Post = require("./models/Post");
const NutritionProfile = require("./models/NutritionProfile");
const MealEntry = require("./models/MealEntry");
const WaterLog = require("./models/WaterLog");

dotenv.config();

const runSeed = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB for seeding.");

    await Promise.all([
      User.deleteMany({}),
      Workout.deleteMany({}),
      Post.deleteMany({}),
      NutritionProfile.deleteMany({}),
      MealEntry.deleteMany({}),
      WaterLog.deleteMany({}),
    ]);

    const password = await bcrypt.hash("Password123", 10);
    const user = await User.create({
      name: "Demo Athlete",
      email: "demo@sportsfit.com",
      password,
      goal: "muscle_gain",
      gender: "male",
      age: 24,
      heightCm: 175,
      weightKg: 72,
    });

    const workouts = await Workout.insertMany([
      {
        user: user._id,
        type: "Strength Training",
        duration: 60,
        caloriesBurned: 500,
        date: new Date(Date.now() - 2 * 86400000),
        notes: "Upper body focus",
      },
      {
        user: user._id,
        type: "Running",
        duration: 35,
        caloriesBurned: 320,
        date: new Date(Date.now() - 1 * 86400000),
        notes: "5 km tempo run",
      },
      {
        user: user._id,
        type: "HIIT",
        duration: 25,
        caloriesBurned: 280,
        date: new Date(),
        notes: "Core and conditioning",
      },
    ]);

    await Post.insertMany([
      {
        user: user._id,
        content: "Crushed my HIIT session today! Feeling stronger every week.",
        likes: [user._id],
        comments: [{ user: user._id, text: "Consistency beats intensity. Keep pushing!" }],
      },
      {
        user: user._id,
        content: "New goal: run 10 km under 55 minutes this month.",
        likes: [],
        comments: [],
      },
    ]);

    const today = new Date().toISOString().slice(0, 10);
    await NutritionProfile.create({
      user: user._id,
      age: 24,
      gender: "male",
      heightCm: 175,
      weightKg: 72,
      activityLevel: "active",
      goal: "weight_gain",
    });

    await MealEntry.insertMany([
      {
        user: user._id,
        date: today,
        mealType: "breakfast",
        foodName: "Moong Dal Chilla",
        quantity: 1,
        unit: "plate",
        nutrients: { calories: 180, protein: 10, carbs: 22, fats: 5, fiber: 4 },
      },
      {
        user: user._id,
        date: today,
        mealType: "lunch",
        foodName: "Rajma Chawal",
        quantity: 1,
        unit: "plate",
        nutrients: { calories: 350, protein: 14, carbs: 55, fats: 8, fiber: 10 },
      },
    ]);

    await WaterLog.insertMany([
      { user: user._id, date: today, amountMl: 500 },
      { user: user._id, date: today, amountMl: 400 },
    ]);

    console.log("Seed completed successfully.");
    console.log("Demo credentials: demo@sportsfit.com / Password123");
    console.log(`Inserted workouts: ${workouts.length}`);
    console.log("Inserted nutrition profile + meal and water logs for demo.");
    process.exit(0);
  } catch (error) {
    console.error("Seeding failed:", error);
    process.exit(1);
  }
};

runSeed();
