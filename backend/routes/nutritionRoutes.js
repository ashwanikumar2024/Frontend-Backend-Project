const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const {
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
} = require("../controllers/nutritionController");

const router = express.Router();

router.use(protect);

router.get("/profile", getNutritionProfile);
router.put("/profile", upsertNutritionProfile);
router.get("/foods", getFoods);
router.get("/meals", getMealsByDate);
router.post("/meals", addMeal);
router.delete("/meals/:id", deleteMeal);
router.post("/water", addWater);
router.get("/summary", getDailySummary);
router.get("/recommendations", getAiRecommendations);
router.get("/weekly-progress", getWeeklyProgress);

module.exports = router;
