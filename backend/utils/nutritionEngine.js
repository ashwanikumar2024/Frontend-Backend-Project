const activityFactors = {
  sedentary: 1.2,
  moderate: 1.55,
  active: 1.725,
};

const goalCalorieDelta = {
  weight_loss: -450,
  maintain: 0,
  weight_gain: 350,
};

const round1 = (num) => Math.round(num * 10) / 10;

const calculateBmr = ({ gender, age, heightCm, weightKg }) => {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return gender === "male" ? base + 5 : base - 161;
};

const calculateTargets = (profile) => {
  const bmr = calculateBmr(profile);
  const tdee = bmr * (activityFactors[profile.activityLevel] || activityFactors.moderate);
  const adjustedCalories = Math.max(1200, tdee + (goalCalorieDelta[profile.goal] || 0));

  const proteinPerKg = profile.goal === "weight_gain" ? 1.9 : profile.goal === "weight_loss" ? 1.8 : 1.6;
  const fatsPerKg = profile.goal === "weight_loss" ? 0.8 : 0.9;

  const protein = profile.weightKg * proteinPerKg;
  const fats = profile.weightKg * fatsPerKg;
  const proteinCalories = protein * 4;
  const fatCalories = fats * 9;
  const carbs = Math.max(80, (adjustedCalories - proteinCalories - fatCalories) / 4);
  const fiber = Math.max(25, profile.goal === "weight_loss" ? 32 : 28);
  const waterLiters = Math.max(2.2, profile.weightKg * 0.035);

  return {
    bmr: round1(bmr),
    tdee: round1(tdee),
    calories: round1(adjustedCalories),
    protein: round1(protein),
    carbs: round1(carbs),
    fats: round1(fats),
    fiber: round1(fiber),
    waterLiters: round1(waterLiters),
  };
};

const emptyTotals = () => ({ calories: 0, protein: 0, carbs: 0, fats: 0, fiber: 0, waterMl: 0 });

const sumNutrition = (mealEntries, waterLogs = []) => {
  const totals = mealEntries.reduce(
    (acc, meal) => {
      acc.calories += meal.nutrients.calories;
      acc.protein += meal.nutrients.protein;
      acc.carbs += meal.nutrients.carbs;
      acc.fats += meal.nutrients.fats;
      acc.fiber += meal.nutrients.fiber;
      return acc;
    },
    emptyTotals()
  );

  totals.waterMl = waterLogs.reduce((sum, log) => sum + log.amountMl, 0);

  Object.keys(totals).forEach((key) => {
    totals[key] = round1(totals[key]);
  });

  return totals;
};

module.exports = {
  activityFactors,
  calculateBmr,
  calculateTargets,
  sumNutrition,
};
