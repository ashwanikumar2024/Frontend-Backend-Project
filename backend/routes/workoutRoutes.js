const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const {
  getWorkouts,
  addWorkout,
  updateWorkout,
  deleteWorkout,
  getWorkoutAnalytics,
} = require("../controllers/workoutController");

const router = express.Router();

router.use(protect);
router.get("/", getWorkouts);
router.post("/", addWorkout);
router.put("/:id", updateWorkout);
router.delete("/:id", deleteWorkout);
router.get("/analytics/overview", getWorkoutAnalytics);

module.exports = router;
