const Workout = require("../models/Workout");

const parseWorkoutDate = (value) => {
  if (!value) return new Date();

  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, month - 1, day, 12, 0, 0, 0);
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
};

const getDayKey = (value) => {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getWorkouts = async (req, res, next) => {
  try {
    const workouts = await Workout.find({ user: req.user._id }).sort({ date: -1 });
    res.json(workouts);
  } catch (error) {
    next(error);
  }
};

const addWorkout = async (req, res, next) => {
  try {
    const { type, duration, caloriesBurned, date, notes } = req.body;
    if (!type || !duration || caloriesBurned === undefined) {
      res.status(400);
      throw new Error("Type, duration, and calories burned are required.");
    }

    const workout = await Workout.create({
      user: req.user._id,
      type,
      duration,
      caloriesBurned,
      date: parseWorkoutDate(date),
      notes,
    });
    res.status(201).json(workout);
  } catch (error) {
    next(error);
  }
};

const updateWorkout = async (req, res, next) => {
  try {
    const workout = await Workout.findOne({ _id: req.params.id, user: req.user._id });
    if (!workout) {
      res.status(404);
      throw new Error("Workout not found.");
    }

    ["type", "duration", "caloriesBurned", "date", "notes"].forEach((key) => {
      if (req.body[key] !== undefined) {
        workout[key] = key === "date" ? parseWorkoutDate(req.body[key]) : req.body[key];
      }
    });

    const savedWorkout = await workout.save();
    res.json(savedWorkout);
  } catch (error) {
    next(error);
  }
};

const deleteWorkout = async (req, res, next) => {
  try {
    const workout = await Workout.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id,
    });
    if (!workout) {
      res.status(404);
      throw new Error("Workout not found.");
    }
    res.json({ message: "Workout deleted." });
  } catch (error) {
    next(error);
  }
};

const getWorkoutAnalytics = async (req, res, next) => {
  try {
    const workouts = await Workout.find({ user: req.user._id });
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0, 0);
    const weekAgo = new Date(today);
    weekAgo.setDate(today.getDate() - 6);
    const monthAgo = new Date(today);
    monthAgo.setDate(today.getDate() - 29);

    const totalCalories = workouts.reduce((sum, w) => sum + w.caloriesBurned, 0);
    const weeklyWorkouts = workouts.filter((w) => parseWorkoutDate(w.date) >= weekAgo);
    const monthlyWorkouts = workouts.filter((w) => parseWorkoutDate(w.date) >= monthAgo);

    const weeklyStats = {
      workouts: weeklyWorkouts.length,
      calories: weeklyWorkouts.reduce((sum, w) => sum + w.caloriesBurned, 0),
      duration: weeklyWorkouts.reduce((sum, w) => sum + w.duration, 0),
    };
    const monthlyStats = {
      workouts: monthlyWorkouts.length,
      calories: monthlyWorkouts.reduce((sum, w) => sum + w.caloriesBurned, 0),
      duration: monthlyWorkouts.reduce((sum, w) => sum + w.duration, 0),
    };

    const caloriesByDay = weeklyWorkouts.reduce((acc, workout) => {
      const key = getDayKey(workout.date);
      acc[key] = (acc[key] || 0) + Number(workout.caloriesBurned || 0);
      return acc;
    }, {});

    const progressByDay = Array.from({ length: 7 }, (_, i) => {
      const day = new Date(weekAgo);
      day.setDate(weekAgo.getDate() + i);
      const key = getDayKey(day);
      return { day: key, calories: caloriesByDay[key] || 0 };
    });

    res.json({
      totalWorkouts: workouts.length,
      totalCalories,
      weeklyStats,
      monthlyStats,
      progressByDay,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getWorkouts,
  addWorkout,
  updateWorkout,
  deleteWorkout,
  getWorkoutAnalytics,
};
