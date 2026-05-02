const mongoose = require("mongoose");

const nutritionProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    age: { type: Number, min: 10, max: 100, required: true },
    gender: { type: String, enum: ["male", "female"], required: true },
    heightCm: { type: Number, min: 100, max: 250, required: true },
    weightKg: { type: Number, min: 30, max: 250, required: true },
    activityLevel: {
      type: String,
      enum: ["sedentary", "moderate", "active"],
      required: true,
    },
    goal: {
      type: String,
      enum: ["weight_loss", "weight_gain", "maintain"],
      required: true,
      default: "maintain",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("NutritionProfile", nutritionProfileSchema);
