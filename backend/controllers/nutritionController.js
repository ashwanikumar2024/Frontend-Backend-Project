const NutritionProfile = require("../models/NutritionProfile");
const MealEntry = require("../models/MealEntry");
const WaterLog = require("../models/WaterLog");
const foodDatabase = require("../data/foodDatabase");
const { calculateTargets, sumNutrition } = require("../utils/nutritionEngine");

const getToday = () => new Date().toISOString().slice(0, 10);
const round1 = (num) => Math.round(num * 10) / 10;
const normalize = (text) => String(text || "").trim().toLowerCase();

const findFoodByName = (foodName) => {
  const cleaned = normalize(foodName);
  if (!cleaned) return null;
  return (
    foodDatabase.find((food) => normalize(food.name) === cleaned) ||
    foodDatabase.find((food) => normalize(food.name).includes(cleaned) || cleaned.includes(normalize(food.name)))
  );
};

const getNutritionProfile = async (req, res, next) => {
  try {
    const profile = await NutritionProfile.findOne({ user: req.user._id });
    if (!profile) return res.status(404).json({ message: "Nutrition profile not found." });

    const targets = calculateTargets(profile);
    res.json({ profile, targets });
  } catch (error) {
    next(error);
  }
};

const upsertNutritionProfile = async (req, res, next) => {
  try {
    const allowedKeys = ["age", "gender", "heightCm", "weightKg", "activityLevel", "goal"];
    const updates = {};
    allowedKeys.forEach((key) => {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    });

    const profile = await NutritionProfile.findOneAndUpdate(
      { user: req.user._id },
      { ...updates, user: req.user._id },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
    );

    const userUpdates = {};
    if (updates.age !== undefined) userUpdates.age = updates.age;
    if (updates.heightCm !== undefined) userUpdates.heightCm = updates.heightCm;
    if (updates.weightKg !== undefined) userUpdates.weightKg = updates.weightKg;
    if (updates.goal !== undefined) userUpdates.goal = updates.goal;
    if (Object.keys(userUpdates).length > 0) {
      Object.assign(req.user, userUpdates);
      await req.user.save();
    }

    const targets = calculateTargets(profile);
    res.json({ profile, targets });
  } catch (error) {
    next(error);
  }
};

const getFoods = async (req, res, next) => {
  try {
    const query = (req.query.q || "").trim().toLowerCase();
    const data = query
      ? foodDatabase.filter(
          (food) => food.name.toLowerCase().includes(query) || food.cuisine.toLowerCase().includes(query)
        )
      : foodDatabase;

    res.json(data.slice(0, 30));
  } catch (error) {
    next(error);
  }
};

const addMeal = async (req, res, next) => {
  try {
    const {
      date = getToday(),
      mealType,
      foodName,
      quantity = 1,
      unit = "serving",
      nutrients,
    } = req.body;

    if (!mealType || !foodName) {
      res.status(400);
      throw new Error("Meal type and food name are required.");
    }

    const safeQuantity = Math.max(0.1, Number(quantity) || 1);
    const dbFood = findFoodByName(foodName);
    const baseNutrients = nutrients || dbFood;

    if (!baseNutrients) {
      res.status(400);
      throw new Error(
        "Food not found in nutrition database. Please search and select an available food item."
      );
    }

    const scaledNutrients = {
      calories: round1(Number(baseNutrients.calories || 0) * safeQuantity),
      protein: round1(Number(baseNutrients.protein || 0) * safeQuantity),
      carbs: round1(Number(baseNutrients.carbs || 0) * safeQuantity),
      fats: round1(Number(baseNutrients.fats || 0) * safeQuantity),
      fiber: round1(Number(baseNutrients.fiber || 0) * safeQuantity),
    };

    const meal = await MealEntry.create({
      user: req.user._id,
      date,
      mealType,
      foodName,
      quantity: safeQuantity,
      unit,
      nutrients: scaledNutrients,
    });

    res.status(201).json(meal);
  } catch (error) {
    next(error);
  }
};

const getMealsByDate = async (req, res, next) => {
  try {
    const date = req.query.date || getToday();
    const meals = await MealEntry.find({ user: req.user._id, date }).sort({ createdAt: -1 });
    const waterLogs = await WaterLog.find({ user: req.user._id, date });
    res.json({ date, meals, waterLogs });
  } catch (error) {
    next(error);
  }
};

const deleteMeal = async (req, res, next) => {
  try {
    const deleted = await MealEntry.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!deleted) {
      res.status(404);
      throw new Error("Meal entry not found.");
    }
    res.json({ message: "Meal deleted successfully." });
  } catch (error) {
    next(error);
  }
};

const addWater = async (req, res, next) => {
  try {
    const date = req.body.date || getToday();
    const amountMl = Number(req.body.amountMl);
    if (!amountMl || amountMl < 50) {
      res.status(400);
      throw new Error("Water amount must be at least 50 ml.");
    }
    const log = await WaterLog.create({ user: req.user._id, date, amountMl });
    res.status(201).json(log);
  } catch (error) {
    next(error);
  }
};

const getDailySummary = async (req, res, next) => {
  try {
    const date = req.query.date || getToday();
    const profile = await NutritionProfile.findOne({ user: req.user._id });
    if (!profile) return res.status(404).json({ message: "Nutrition profile not found." });

    const meals = await MealEntry.find({ user: req.user._id, date });
    const waterLogs = await WaterLog.find({ user: req.user._id, date });
    const targets = calculateTargets(profile);
    const intake = sumNutrition(meals, waterLogs);

    const remaining = {
      calories: round1(targets.calories - intake.calories),
      protein: round1(targets.protein - intake.protein),
      carbs: round1(targets.carbs - intake.carbs),
      fats: round1(targets.fats - intake.fats),
      fiber: round1(targets.fiber - intake.fiber),
      waterMl: round1(targets.waterLiters * 1000 - intake.waterMl),
    };

    const insights = [];
    if (remaining.protein > 20) insights.push("You are low on protein today. Add paneer, eggs, or lentils.");
    if (remaining.fiber > 8) insights.push("Increase fiber intake with fruits, salads, and sprouts.");
    if (remaining.waterMl > 600) insights.push("Hydration alert: drink more water over the next few hours.");
    if (remaining.calories < -200) insights.push("You are above calorie target. Prefer lighter meals next.");

    res.json({ date, targets, intake, remaining, insights });
  } catch (error) {
    next(error);
  }
};

const getAiRecommendations = async (req, res, next) => {
  try {
    const date = req.query.date || getToday();
    const profile = await NutritionProfile.findOne({ user: req.user._id });
    if (!profile) return res.status(404).json({ message: "Nutrition profile not found." });

    const meals = await MealEntry.find({ user: req.user._id, date });
    const waterLogs = await WaterLog.find({ user: req.user._id, date });
    const targets = calculateTargets(profile);
    const intake = sumNutrition(meals, waterLogs);

    const remaining = {
      calories: targets.calories - intake.calories,
      protein: targets.protein - intake.protein,
      carbs: targets.carbs - intake.carbs,
      fats: targets.fats - intake.fats,
      fiber: targets.fiber - intake.fiber,
    };

    const rankByNeed = Object.entries(remaining)
      .filter(([, value]) => value > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([k]) => k);

    const nextMealSuggestions = foodDatabase
      .map((food) => {
        const score =
          (rankByNeed[0] === "protein" ? food.protein * 2 : food.protein) +
          (rankByNeed[0] === "fiber" ? food.fiber * 2 : food.fiber) +
          (rankByNeed[0] === "carbs" ? food.carbs * 1.3 : food.carbs) +
          (remaining.calories < 350 ? -food.calories / 80 : food.calories / 120);
        return { ...food, score: round1(score) };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 4);

    const weeklyPlan = [
      { day: "Monday", meals: ["Moong Dal Chilla", "Rajma Chawal", "Paneer Bhurji"] },
      { day: "Tuesday", meals: ["Oats Upma", "Chicken Curry + Roti", "Chana Salad"] },
      { day: "Wednesday", meals: ["Boiled Eggs + Fruit", "Brown Rice Bowl", "Sprouts Bhel"] },
      { day: "Thursday", meals: ["Paneer Bhurji", "Rajma Chawal", "Greek Yogurt + Nuts"] },
      { day: "Friday", meals: ["Oats Upma", "Chicken Curry", "Moong Dal Chilla"] },
      { day: "Saturday", meals: ["Sprouts Bhel", "Chana Salad + Roti", "Banana Peanut Smoothie"] },
      { day: "Sunday", meals: ["Boiled Eggs + Toast", "Brown Rice Bowl", "Paneer Bhurji"] },
    ];

    res.json({
      whatToEatNext: nextMealSuggestions,
      weeklyPlan,
      reminders: ["08:30 Breakfast", "13:30 Lunch", "17:30 Healthy snack", "20:00 Dinner"],
    });
  } catch (error) {
    next(error);
  }
};

const getWeeklyProgress = async (req, res, next) => {
  try {
    const profile = await NutritionProfile.findOne({ user: req.user._id });
    if (!profile) return res.status(404).json({ message: "Nutrition profile not found." });

    const targets = calculateTargets(profile);
    const now = new Date();
    const days = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(now);
      date.setDate(now.getDate() - (6 - index));
      return date.toISOString().slice(0, 10);
    });

    const records = [];
    for (const date of days) {
      const meals = await MealEntry.find({ user: req.user._id, date });
      const waterLogs = await WaterLog.find({ user: req.user._id, date });
      const intake = sumNutrition(meals, waterLogs);
      records.push({
        date,
        calories: intake.calories,
        protein: intake.protein,
        waterMl: intake.waterMl,
        calorieTarget: targets.calories,
      });
    }

    res.json({ records });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getNutritionProfile,
  upsertNutritionProfile,
  getFoods,
  addMeal,
  getMealsByDate,
  deleteMeal,
  addWater,
  getDailySummary,
  getAiRecommendations,
  getWeeklyProgress,
};
