const NutritionProfile = require("../models/NutritionProfile");
const MealEntry = require("../models/MealEntry");
const WaterLog = require("../models/WaterLog");
const foodDatabase = require("../data/foodDatabase");
const { calculateTargets, sumNutrition } = require("../utils/nutritionEngine");

const getToday = () => new Date().toISOString().slice(0, 10);
const round1 = (num) => Math.round(num * 10) / 10;
const normalize = (text) => String(text || "").trim().toLowerCase();
const stopWords = new Set(["and", "with", "the", "a", "an", "of", "meal", "dish", "food"]);
const countWords = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
};

const toTokens = (text) =>
  normalize(text)
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .map((token) => {
      if (token.endsWith("s") && token.length > 3) return token.slice(0, -1);
      return token;
    })
    .filter((token) => token && !stopWords.has(token));

const splitMealParts = (text) =>
  String(text || "")
    .split(/\s*(?:\+|,|&|\band\b|\bwith\b)\s*/i)
    .map((part) => part.trim())
    .filter(Boolean);

const extractCount = (text) => {
  const normalized = normalize(text);
  const digits = normalized.match(/(\d+(?:\.\d+)?)/);
  if (digits) return Number(digits[1]);

  const words = normalized.split(/\s+/);
  for (const word of words) {
    if (countWords[word]) return countWords[word];
  }

  return null;
};

const inferServingCount = (food) => {
  const label = normalize(food.servingLabel || "1 serving");
  const digits = label.match(/(\d+(?:\.\d+)?)/);
  if (digits) return Number(digits[1]);
  const [firstWord] = label.split(/\s+/);
  return countWords[firstWord] || 1;
};

const scaleNutrients = (base, factor) => ({
  calories: round1(Number(base.calories || 0) * factor),
  protein: round1(Number(base.protein || 0) * factor),
  carbs: round1(Number(base.carbs || 0) * factor),
  fats: round1(Number(base.fats || 0) * factor),
  fiber: round1(Number(base.fiber || 0) * factor),
});

const addNutrients = (items) =>
  items.reduce(
    (acc, item) => ({
      calories: round1(acc.calories + item.calories),
      protein: round1(acc.protein + item.protein),
      carbs: round1(acc.carbs + item.carbs),
      fats: round1(acc.fats + item.fats),
      fiber: round1(acc.fiber + item.fiber),
    }),
    { calories: 0, protein: 0, carbs: 0, fats: 0, fiber: 0 }
  );

const getSearchTexts = (food) => [food.name, ...(food.aliases || [])];

const scoreFoodMatch = (query, food) => {
  const cleanedQuery = normalize(query);
  const queryTokens = toTokens(query);

  if (!cleanedQuery) return 0;
  return Math.max(
    ...getSearchTexts(food).map((candidate) => {
      const cleanedCandidate = normalize(candidate);
      const candidateTokens = toTokens(candidate);

      if (cleanedQuery === cleanedCandidate) return 1000;
      if (cleanedCandidate.includes(cleanedQuery) || cleanedQuery.includes(cleanedCandidate)) return 850;

      const overlap = queryTokens.filter((token) =>
        candidateTokens.some((candidateToken) => candidateToken.includes(token) || token.includes(candidateToken))
      ).length;
      const missingPenalty = Math.max(0, queryTokens.length - overlap) * 18;
      return overlap * 110 - missingPenalty - Math.abs(queryTokens.length - candidateTokens.length) * 8;
    })
  );
};

const resolveSingleFood = (foodName) => {
  const rankedFoods = foodDatabase
    .map((food) => ({ food, score: scoreFoodMatch(foodName, food) }))
    .sort((a, b) => b.score - a.score);
  const best = rankedFoods[0];

  if (!best || best.score < 60) return null;
  return best;
};

const resolveMealNutrition = (foodName, quantity = 1, manualNutrients) => {
  const safeQuantity = Math.max(0.1, Number(quantity) || 1);

  if (manualNutrients) {
    return {
      quantity: safeQuantity,
      matchedFood: null,
      confidence: "manual",
      parts: [],
      nutrients: scaleNutrients(manualNutrients, safeQuantity),
    };
  }

  const parts = splitMealParts(foodName);
  const candidates = parts.length > 1 ? parts : [String(foodName || "").trim()];
  const resolvedParts = [];

  for (const part of candidates) {
    const match = resolveSingleFood(part);
    if (!match) return null;

    const partCount = extractCount(part);
    const servingCount = inferServingCount(match.food);
    const factor = partCount ? partCount / servingCount : 1;
    resolvedParts.push({
      query: part,
      matchedFood: match.food,
      score: match.score,
      factor: round1(factor),
      servingLabel: match.food.servingLabel || "1 serving",
      nutrients: scaleNutrients(match.food, factor),
    });
  }

  if (resolvedParts.length === 0) {
    return null;
  }

  const totalsBeforeQuantity = addNutrients(resolvedParts.map((part) => part.nutrients));
  const averageScore = resolvedParts.reduce((sum, part) => sum + part.score, 0) / resolvedParts.length;
  const confidence = averageScore >= 900 ? "high" : averageScore >= 700 ? "medium" : "low";
  const matchedFoodLabel = resolvedParts.map((part) => part.matchedFood.name).join(" + ");

  return {
    quantity: safeQuantity,
    matchedFood: {
      name: matchedFoodLabel,
      servingLabel:
        resolvedParts.length === 1
          ? resolvedParts[0].servingLabel
          : `${resolvedParts.length} matched items`,
    },
    confidence,
    parts: resolvedParts,
    nutrients: scaleNutrients(totalsBeforeQuantity, safeQuantity),
  };
};

const serializeFoodForClient = (food) => ({
  name: food.name,
  cuisine: food.cuisine,
  servingLabel: food.servingLabel || "1 serving",
  calories: food.calories,
  protein: food.protein,
  carbs: food.carbs,
  fats: food.fats,
  fiber: food.fiber,
});

const serializeResolvedMeal = (resolved) => ({
  quantity: resolved.quantity,
  confidence: resolved.confidence,
  matchedFood: resolved.matchedFood
    ? {
        name: resolved.matchedFood.name,
        servingLabel: resolved.matchedFood.servingLabel || "1 serving",
      }
    : null,
  parts: (resolved.parts || []).map((part) => ({
    query: part.query,
    factor: part.factor,
    score: round1(part.score),
    servingLabel: part.servingLabel,
    matchedFood: serializeFoodForClient(part.matchedFood),
    nutrients: part.nutrients,
  })),
  nutrients: resolved.nutrients,
});

const getLookupMessage = (query, resolved) => {
  if (!resolved.matchedFood) {
    return `Using manual nutrition for "${query}".`;
  }

  if ((resolved.parts || []).length > 1) {
    return `Estimated "${query}" using ${resolved.parts.map((part) => part.matchedFood.name).join(" + ")}.`;
  }

  return `Matched "${query}" with "${resolved.matchedFood.name}".`;
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
      ? foodDatabase.filter((food) =>
          [food.name, food.cuisine, ...(food.aliases || [])].some((text) => text.toLowerCase().includes(query))
        )
      : foodDatabase;

    res.json(data.slice(0, 30).map(serializeFoodForClient));
  } catch (error) {
    next(error);
  }
};

const lookupMealNutrition = async (req, res, next) => {
  try {
    const mealName = (req.query.mealName || req.query.foodName || req.body?.mealName || req.body?.foodName || "").trim();
    const quantity = Number(req.query.quantity || req.body?.quantity || 1);

    if (!mealName) {
      res.status(400);
      throw new Error("Meal name is required.");
    }

    const resolved = resolveMealNutrition(mealName, quantity);
    if (!resolved) {
      res.status(404);
      throw new Error(
        "Meal not found in nutrition database. Try a clearer meal name like 2 eggs, paneer bhurji, rajma chawal, or chicken curry + roti."
      );
    }

    res.json({
      query: mealName,
      ...serializeResolvedMeal(resolved),
      message: getLookupMessage(mealName, resolved),
    });
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

    const resolved = resolveMealNutrition(foodName, quantity, nutrients);
    if (!resolved) {
      res.status(400);
      throw new Error(
        "Food not found in nutrition database. Please try a simpler meal name such as paneer, eggs, chicken curry, oats, or rajma chawal."
      );
    }

    const meal = await MealEntry.create({
      user: req.user._id,
      date,
      mealType,
      foodName: String(foodName).trim(),
      matchedFoodName: resolved.matchedFood?.name || "",
      quantity: resolved.quantity,
      unit,
      nutrients: resolved.nutrients,
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
  lookupMealNutrition,
  addMeal,
  getMealsByDate,
  deleteMeal,
  addWater,
  getDailySummary,
  getAiRecommendations,
  getWeeklyProgress,
};
