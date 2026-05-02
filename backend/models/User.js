const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    role: {
      type: String,
      enum: ["user"],
      default: "user",
    },
    goal: {
      type: String,
      enum: [
        "weight_loss",
        "weight_gain",
        "maintain",
        "muscle_gain",
        "endurance",
        "flexibility",
        "general_fitness",
      ],
      default: "general_fitness",
    },
    gender: {
      type: String,
      enum: ["male", "female"],
      default: "male",
    },
    age: {
      type: Number,
      min: 10,
      max: 100,
      default: 25,
    },
    heightCm: {
      type: Number,
      min: 100,
      max: 250,
      default: 170,
    },
    weightKg: {
      type: Number,
      min: 30,
      max: 250,
      default: 70,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
