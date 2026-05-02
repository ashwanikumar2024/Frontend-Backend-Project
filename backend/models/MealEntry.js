const mongoose = require("mongoose");

const mealEntrySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    date: {
      type: String,
      required: true,
      match: /^\d{4}-\d{2}-\d{2}$/,
      index: true,
    },
    mealType: {
      type: String,
      enum: ["breakfast", "lunch", "dinner", "snacks"],
      required: true,
    },
    foodName: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, min: 0.1, default: 1 },
    unit: { type: String, default: "serving" },
    nutrients: {
      calories: { type: Number, required: true, min: 0 },
      protein: { type: Number, required: true, min: 0 },
      carbs: { type: Number, required: true, min: 0 },
      fats: { type: Number, required: true, min: 0 },
      fiber: { type: Number, required: true, min: 0 },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("MealEntry", mealEntrySchema);
