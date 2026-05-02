const mongoose = require("mongoose");

const waterLogSchema = new mongoose.Schema(
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
    amountMl: { type: Number, required: true, min: 50 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("WaterLog", waterLogSchema);
