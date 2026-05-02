const Workout = require("../models/Workout");

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
      date,
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
      if (req.body[key] !== undefined) workout[key] = req.body[key];
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
    const weekAgo = new Date(now);
    weekAgo.setDate(now.getDate() - 7);
    const monthAgo = new Date(now);
    monthAgo.setDate(now.getDate() - 30);

    const totalCalories = workouts.reduce((sum, w) => sum + w.caloriesBurned, 0);
    const weeklyWorkouts = workouts.filter((w) => new Date(w.date) >= weekAgo);
    const monthlyWorkouts = workouts.filter((w) => new Date(w.date) >= monthAgo);

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

    const progressByDay = Array.from({ length: 7 }, (_, i) => {
      const day = new Date(now);
      day.setDate(now.getDate() - (6 - i));
      const key = day.toISOString().slice(0, 10);
      const dayCalories = weeklyWorkouts
        .filter((w) => new Date(w.date).toISOString().slice(0, 10) === key)
        .reduce((sum, w) => sum + w.caloriesBurned, 0);
      return { day: key, calories: dayCalories };
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
