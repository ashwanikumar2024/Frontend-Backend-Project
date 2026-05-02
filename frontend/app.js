const API_BASE = "http://localhost:5000/api";

const tips = [
  "Hydrate consistently: even mild dehydration can reduce performance.",
  "Progressive overload is key: increase reps or resistance gradually.",
  "Prioritize sleep for recovery and muscle growth.",
  "Warm up for 8-10 minutes before intense sessions.",
  "Focus on form first, speed and load second.",
];

const recommendationMap = {
  weight_loss: [
    "30 min HIIT + brisk walk + core circuit",
    "Circuit training with short rests for higher calorie burn",
  ],
  muscle_gain: [
    "Push-pull-legs strength split with compound lifts",
    "Heavy resistance + protein-focused recovery day",
  ],
  endurance: [
    "Interval run + tempo cycling + mobility drill",
    "Steady-state cardio with heart-rate zone tracking",
  ],
  flexibility: [
    "Yoga flow + dynamic stretching + light core work",
    "Pilates and mobility sequence for full-body movement",
  ],
  general_fitness: [
    "Mixed workout: 20 min cardio + 20 min strength + stretching",
    "Moderate full-body routine with active recovery",
  ],
  weight_gain: [
    "Strength progression + compound lifts and smart recovery",
    "Heavy resistance training with adequate calorie surplus",
  ],
  maintain: [
    "Balanced split: moderate cardio, strength, and mobility",
    "Steady training volume with consistency focus",
  ],
};

const tokenKey = "sportsfit_token";
const userKey = "sportsfit_user";

const getToken = () => localStorage.getItem(tokenKey);
const getUser = () => JSON.parse(localStorage.getItem(userKey) || "null");

const setAuth = (token, user) => {
  localStorage.setItem(tokenKey, token);
  localStorage.setItem(userKey, JSON.stringify(user));
};

const clearAuth = () => {
  localStorage.removeItem(tokenKey);
  localStorage.removeItem(userKey);
};

const showLoader = (show) => {
  const loader = document.getElementById("globalLoader");
  if (!loader) return;
  loader.style.display = show ? "flex" : "none";
};

const apiRequest = async (path, options = {}) => {
  const token = getToken();
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };

  if (token) headers.Authorization = `Bearer ${token}`;

  showLoader(true);

  try {
    const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) throw new Error(data.message || "Request failed.");
    return data;
  } finally {
    showLoader(false);
  }
};

const initTheme = () => {
  const currentTheme = localStorage.getItem("sportsfit_theme");

  if (currentTheme === "dark") {
    document.body.classList.add("dark");
  }

  const btn = document.getElementById("themeToggle");

  if (btn) {
    btn.addEventListener("click", () => {
      document.body.classList.toggle("dark");

      localStorage.setItem(
        "sportsfit_theme",
        document.body.classList.contains("dark") ? "dark" : "light"
      );
    });
  }
};

const setDailyTip = () => {
  const tipEl = document.getElementById("dailyTip");

  if (!tipEl) return;

  const index = new Date().getDate() % tips.length;
  tipEl.textContent = tips[index];
};

const attachLogout = () => {
  const btn = document.getElementById("logoutBtn");

  if (!btn) return;

  btn.addEventListener("click", () => {
    clearAuth();
    window.location.href = "auth.html";
  });
};

const ensureAuth = () => {
  if (!getToken()) {
    window.location.href = "auth.html";
  }
};

const toHumanGoal = (goal) =>
  goal.replaceAll("_", " ").replace(/\b\w/g, (m) => m.toUpperCase());

const todayISO = () => new Date().toISOString().slice(0, 10);
const clampPercent = (value) => Math.max(0, Math.min(100, Number(value) || 0));

const renderHome = () => {
  setDailyTip();
};

const renderAuth = () => {
  const loginForm = document.getElementById("loginForm");
  const registerForm = document.getElementById("registerForm");

  loginForm?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const formData = new FormData(loginForm);

    try {
      const data = await apiRequest("/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: formData.get("email"),
          password: formData.get("password"),
        }),
      });

      setAuth(data.token, data.user);
      alert("Login successful.");
      window.location.href = "dashboard.html";
    } catch (error) {
      alert(error.message);
    }
  });

  registerForm?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const formData = new FormData(registerForm);

    try {
      const payload = Object.fromEntries(formData.entries());

      ["age", "heightCm", "weightKg"].forEach((k) => {
        if (!payload[k]) delete payload[k];
        else payload[k] = Number(payload[k]);
      });

      const data = await apiRequest("/auth/register", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      setAuth(data.token, data.user);
      alert("Registration successful.");
      window.location.href = "dashboard.html";
    } catch (error) {
      alert(error.message);
    }
  });
};

const renderDashboard = async () => {
  ensureAuth();
  setDailyTip();

  const user = getUser();

  document.getElementById("greeting").textContent =
    `Welcome back, ${user?.name || "Athlete"}!`;

  document.getElementById("goalText").textContent =
    `Goal: ${toHumanGoal(user?.goal || "general_fitness")}`;

  document.getElementById("recommendationText").textContent =
    recommendationMap[user?.goal || "general_fitness"][new Date().getDate() % 2];

  try {
    const workouts = await apiRequest("/workouts");
    const analytics = await apiRequest("/workouts/analytics/overview");

    document.getElementById("totalWorkouts").textContent =
      analytics.totalWorkouts;

    document.getElementById("totalCalories").textContent =
      analytics.totalCalories;

    document.getElementById("recentActivity").textContent = workouts[0]
      ? `${workouts[0].type} - ${workouts[0].duration} mins`
      : "No recent activity yet.";

    const ctx = document.getElementById("progressChart");

    if (ctx) {
      new Chart(ctx, {
        type: "line",
        data: {
          labels: analytics.progressByDay.map((item) => item.day.slice(5)),
          datasets: [
            {
              label: "Calories Burned",
              data: analytics.progressByDay.map((item) => item.calories),
              borderColor: "#2563eb",
              backgroundColor: "rgba(37, 99, 235, 0.2)",
              borderWidth: 2,
              tension: 0.3,
            },
          ],
        },
      });
    }

    try {
      const nutritionSummary = await apiRequest("/nutrition/summary");
      document.getElementById("nutritionPreviewText").textContent =
        `Calories left: ${Math.round(nutritionSummary.remaining.calories)} | Protein left: ${Math.round(
          nutritionSummary.remaining.protein
        )}g | Water left: ${Math.max(0, Math.round(nutritionSummary.remaining.waterMl))}ml`;
    } catch (error) {
      document.getElementById("nutritionPreviewText").textContent =
        "Complete Nutrition AI profile to unlock personalized macro and meal insights.";
    }
  } catch (error) {
    alert(error.message);
  }

  const bmiBtn = document.getElementById("calculateBmiBtn");

  bmiBtn?.addEventListener("click", () => {
    const height = Number(document.getElementById("bmiHeight").value);
    const weight = Number(document.getElementById("bmiWeight").value);

    if (!height || !weight) {
      document.getElementById("bmiResult").textContent =
        "Enter valid height and weight.";
      return;
    }

    const bmi = weight / ((height / 100) * (height / 100));

    let category = "Normal";

    if (bmi < 18.5) category = "Underweight";
    else if (bmi >= 25 && bmi < 30) category = "Overweight";
    else if (bmi >= 30) category = "Obese";

    document.getElementById(
      "bmiResult"
    ).textContent = `BMI: ${bmi.toFixed(1)} (${category})`;
  });
};

const renderNutrition = async () => {
  ensureAuth();

  const profileForm = document.getElementById("nutritionProfileForm");
  const mealForm = document.getElementById("mealForm");
  const waterForm = document.getElementById("waterForm");
  const mealDateInput = document.getElementById("mealDate");
  const foodSearchInput = document.getElementById("foodSearch");
  const foodPickSelect = document.getElementById("foodPick");

  mealDateInput.value = todayISO();
  let selectedFoods = [];
  let dailyChart;
  let weeklyChart;

  const renderTargets = (targets) => {
    const container = document.getElementById("nutritionTargets");
    const cards = [
      ["BMR", `${targets.bmr} kcal`],
      ["TDEE", `${targets.tdee} kcal`],
      ["Calories", `${targets.calories} kcal`],
      ["Protein", `${targets.protein} g`],
      ["Carbs", `${targets.carbs} g`],
      ["Fats", `${targets.fats} g`],
      ["Fiber", `${targets.fiber} g`],
      ["Water", `${targets.waterLiters} L`],
    ];
    container.innerHTML = cards
      .map(
        ([label, value]) =>
          `<article class="target-card"><p class="target-label">${label}</p><strong>${value}</strong></article>`
      )
      .join("");
  };

  const fillFoodSelect = (foods) => {
    selectedFoods = foods;
    foodPickSelect.innerHTML = `<option value="">Select food from database</option>${foods
      .map((food, index) => `<option value="${index}">${food.name} (${food.calories} kcal)</option>`)
      .join("")}`;
  };

  const loadFoods = async (query = "") => {
    const foods = await apiRequest(`/nutrition/foods${query ? `?q=${encodeURIComponent(query)}` : ""}`);
    fillFoodSelect(foods);
  };

  const renderProgress = (summary) => {
    const stats = [
      { key: "calories", label: "Calories", unit: "kcal", target: summary.targets.calories, intake: summary.intake.calories },
      { key: "protein", label: "Protein", unit: "g", target: summary.targets.protein, intake: summary.intake.protein },
      { key: "carbs", label: "Carbs", unit: "g", target: summary.targets.carbs, intake: summary.intake.carbs },
      { key: "fats", label: "Fats", unit: "g", target: summary.targets.fats, intake: summary.intake.fats },
      { key: "fiber", label: "Fiber", unit: "g", target: summary.targets.fiber, intake: summary.intake.fiber },
    ];

    document.getElementById("intakeProgressBars").innerHTML = stats
      .map((item) => {
        const percent = clampPercent((item.intake / item.target) * 100);
        const remaining = Math.round(item.target - item.intake);
        return `
        <div class="progress-item">
          <div class="progress-head">
            <strong>${item.label}</strong>
            <span>${Math.round(item.intake)} / ${Math.round(item.target)} ${item.unit} (${remaining} left)</span>
          </div>
          <div class="progress-track"><div class="progress-fill" style="width:${percent}%"></div></div>
        </div>`;
      })
      .join("");

    const waterLeft = Math.max(0, Math.round(summary.remaining.waterMl));
    document.getElementById(
      "waterProgressText"
    ).textContent = `Water consumed: ${Math.round(summary.intake.waterMl)} ml | Remaining: ${waterLeft} ml`;

    const ctx = document.getElementById("nutritionDailyChart");
    if (dailyChart) dailyChart.destroy();
    dailyChart = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: ["Protein", "Carbs", "Fats", "Fiber"],
        datasets: [
          {
            data: [summary.intake.protein, summary.intake.carbs, summary.intake.fats, summary.intake.fiber],
            backgroundColor: ["#4f46e5", "#10b981", "#f59e0b", "#ef4444"],
          },
        ],
      },
    });

    document.getElementById("aiInsights").innerHTML =
      summary.insights.length > 0
        ? summary.insights.map((item) => `<p class="insight-chip">${item}</p>`).join("")
        : `<p class="insight-chip">Great balance today. Keep it up.</p>`;
  };

  const loadMeals = async (date) => {
    const payload = await apiRequest(`/nutrition/meals?date=${date}`);
    document.getElementById("mealLogList").innerHTML =
      payload.meals.length === 0
        ? "<p>No meals added for this date.</p>"
        : payload.meals
            .map(
              (meal) => `
              <div class="list-item">
                <strong>${toHumanGoal(meal.mealType)} - ${meal.foodName}</strong>
                <div class="meta">${meal.nutrients.calories} kcal | P ${meal.nutrients.protein}g | C ${meal.nutrients.carbs}g | F ${meal.nutrients.fats}g | Fi ${meal.nutrients.fiber}g</div>
                <button class="btn-danger" data-delete-meal="${meal._id}">Delete</button>
              </div>
            `
            )
            .join("");

    document.querySelectorAll("[data-delete-meal]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        await apiRequest(`/nutrition/meals/${btn.dataset.deleteMeal}`, { method: "DELETE" });
        await refreshNutrition();
      });
    });
  };

  const loadRecommendations = async (date) => {
    const recs = await apiRequest(`/nutrition/recommendations?date=${date}`);
    document.getElementById("nextMealSuggestions").innerHTML = recs.whatToEatNext
      .map(
        (item) =>
          `<div class="list-item"><strong>${item.name}</strong><div class="meta">${item.calories} kcal | Protein ${item.protein}g | Fiber ${item.fiber}g</div></div>`
      )
      .join("");

    document.getElementById("weeklyPlanList").innerHTML = recs.weeklyPlan
      .map((item) => `<div class="list-item"><strong>${item.day}</strong><p>${item.meals.join(" • ")}</p></div>`)
      .join("");

    document.getElementById("mealReminderList").innerHTML = recs.reminders
      .map((item) => `<li>${item}</li>`)
      .join("");
  };

  const loadWeeklyProgress = async () => {
    const payload = await apiRequest("/nutrition/weekly-progress");
    const labels = payload.records.map((item) => item.date.slice(5));
    const calories = payload.records.map((item) => item.calories);
    const protein = payload.records.map((item) => item.protein);

    const ctx = document.getElementById("nutritionWeeklyChart");
    if (weeklyChart) weeklyChart.destroy();
    weeklyChart = new Chart(ctx, {
      type: "bar",
      data: {
        labels,
        datasets: [
          { label: "Calories", data: calories, backgroundColor: "rgba(37, 99, 235, 0.7)" },
          { label: "Protein", data: protein, backgroundColor: "rgba(16, 185, 129, 0.7)" },
        ],
      },
    });
  };

  const loadProfile = async () => {
    try {
      const payload = await apiRequest("/nutrition/profile");
      ["age", "gender", "heightCm", "weightKg", "activityLevel", "goal"].forEach((key) => {
        profileForm.elements[key].value = payload.profile[key];
      });
      renderTargets(payload.targets);
    } catch (error) {
      document.getElementById("nutritionTargets").innerHTML =
        "<p>Set up your profile to calculate daily nutrition requirements.</p>";
    }
  };

  const refreshNutrition = async () => {
    const date = mealDateInput.value || todayISO();
    const summary = await apiRequest(`/nutrition/summary?date=${date}`);
    renderProgress(summary);
    await loadMeals(date);
    await loadRecommendations(date);
    await loadWeeklyProgress();
  };

  profileForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const payload = Object.fromEntries(new FormData(profileForm).entries());
    ["age", "heightCm", "weightKg"].forEach((key) => (payload[key] = Number(payload[key])));
    const data = await apiRequest("/nutrition/profile", { method: "PUT", body: JSON.stringify(payload) });
    renderTargets(data.targets);
    await refreshNutrition();
  });

  foodSearchInput.addEventListener("input", async () => {
    await loadFoods(foodSearchInput.value.trim());
  });

  foodPickSelect.addEventListener("change", () => {
    const picked = selectedFoods[Number(foodPickSelect.value)];
    if (!picked) return;
    mealForm.elements.foodName.value = picked.name;
  });

  mealForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const payload = Object.fromEntries(new FormData(mealForm).entries());
    payload.foodName = payload.foodName || payload.manualFoodName;
    payload.quantity = Number(payload.quantity || 1);
    delete payload.search;
    delete payload.foodPick;
    delete payload.manualFoodName;

    await apiRequest("/nutrition/meals", { method: "POST", body: JSON.stringify(payload) });
    mealForm.reset();
    mealDateInput.value = payload.date || todayISO();
    await loadFoods();
    await refreshNutrition();
  });

  waterForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const amountMl = Number(waterForm.elements.amountMl.value);
    await apiRequest("/nutrition/water", {
      method: "POST",
      body: JSON.stringify({ amountMl, date: mealDateInput.value || todayISO() }),
    });
    waterForm.reset();
    await refreshNutrition();
  });

  mealDateInput.addEventListener("change", refreshNutrition);

  await loadFoods();
  await loadProfile();
  try {
    await refreshNutrition();
  } catch (error) {
    if (!/Nutrition profile not found/i.test(error.message)) {
      alert(error.message);
    }
  }
};

const formatDate = (isoDate) => new Date(isoDate).toLocaleDateString();

const renderWorkouts = async () => {
  ensureAuth();

  const form = document.getElementById("workoutForm");
  const list = document.getElementById("workoutList");

  const loadWorkouts = async () => {
    const workouts = await apiRequest("/workouts");

    list.innerHTML = workouts
      .map(
        (workout) => `
          <div class="list-item">
            <strong>${workout.type}</strong>
            <div class="meta">${formatDate(workout.date)} | ${workout.duration} mins | ${workout.caloriesBurned} cal</div>
            <p>${workout.notes || ""}</p>
            <div class="topbar-actions">
              <button class="btn-secondary" data-edit="${workout._id}">Edit</button>
              <button class="btn-danger" data-delete="${workout._id}">Delete</button>
            </div>
          </div>`
      )
      .join("");

    list.querySelectorAll("[data-delete]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (!confirm("Delete this workout?")) return;

        await apiRequest(`/workouts/${btn.dataset.delete}`, {
          method: "DELETE",
        });

        await loadWorkouts();
      });
    });

    list.querySelectorAll("[data-edit]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const w = workouts.find((x) => x._id === btn.dataset.edit);

        document.getElementById("workoutId").value = w._id;
        document.getElementById("workoutType").value = w.type;
        document.getElementById("workoutDuration").value = w.duration;
        document.getElementById("workoutCalories").value =
          w.caloriesBurned;
        document.getElementById("workoutDate").value = new Date(
          w.date
        )
          .toISOString()
          .slice(0, 10);
        document.getElementById("workoutNotes").value = w.notes || "";
      });
    });
  };

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const id = document.getElementById("workoutId").value;

    const payload = {
      type: document.getElementById("workoutType").value,
      duration: Number(
        document.getElementById("workoutDuration").value
      ),
      caloriesBurned: Number(
        document.getElementById("workoutCalories").value
      ),
      date: document.getElementById("workoutDate").value,
      notes: document.getElementById("workoutNotes").value,
    };

    if (id) {
      await apiRequest(`/workouts/${id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
    } else {
      await apiRequest("/workouts", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    }

    form.reset();
    document.getElementById("workoutId").value = "";
    await loadWorkouts();
  });

  try {
    await loadWorkouts();
  } catch (error) {
    alert(error.message);
  }
};

const initScrollReveal = () => {
  const items = Array.from(document.querySelectorAll("[data-animate]"));
  if (items.length === 0) return;

  const prefersReduced =
    window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (prefersReduced) {
    items.forEach((el) => el.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;

        const el = entry.target;
        el.classList.add("is-visible");
        observer.unobserve(el);
      });
    },
    {
      threshold: 0.12,
      rootMargin: "0px 0px -10% 0px",
    }
  );

  items.forEach((el) => {
    const delayMs = Number(el.dataset.delay || 0);
    if (!Number.isNaN(delayMs) && delayMs > 0) {
      el.style.setProperty("--delay", `${delayMs}ms`);
    }
    observer.observe(el);
  });
};

const renderCommunity = async () => {
  const postForm = document.getElementById("postForm");
  const postsList = document.getElementById("postsList");

  const loadPosts = async () => {
    const posts = await apiRequest("/posts");

    postsList.innerHTML = posts
      .map(
        (post) => `
          <div class="list-item">
            <strong>${post.user?.name || "Athlete"}</strong>
            <div class="meta">${formatDate(post.createdAt)}</div>
            <p>${post.content}</p>
            <div class="topbar-actions">
              <button class="btn-secondary" data-like="${post._id}">Like (${post.likes.length})</button>
            </div>
            <div class="meta">Comments:</div>
            ${(post.comments || [])
              .map(
                (comment) =>
                  `<div class="meta">- ${comment.user?.name || "User"}: ${comment.text}</div>`
              )
              .join("")}
            <form data-comment-form="${post._id}">
              <input name="comment" placeholder="Write a comment..." required />
              <button class="btn-primary" type="submit">Comment</button>
            </form>
          </div>`
      )
      .join("");

    postsList.querySelectorAll("[data-like]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        ensureAuth();

        await apiRequest(`/posts/${btn.dataset.like}/like`, {
          method: "PATCH",
        });

        await loadPosts();
      });
    });

    postsList.querySelectorAll("[data-comment-form]").forEach((formEl) => {
      formEl.addEventListener("submit", async (e) => {
        e.preventDefault();

        ensureAuth();

        const postId = formEl.dataset.commentForm;
        const input = formEl.querySelector("input[name='comment']");

        await apiRequest(`/posts/${postId}/comments`, {
          method: "POST",
          body: JSON.stringify({ text: input.value }),
        });

        input.value = "";
        await loadPosts();
      });
    });
  };

  postForm?.addEventListener("submit", async (e) => {
    e.preventDefault();

    ensureAuth();

    const content = document.getElementById("postContent").value;

    await apiRequest("/posts", {
      method: "POST",
      body: JSON.stringify({ content }),
    });

    postForm.reset();
    await loadPosts();
  });

  try {
    await loadPosts();
  } catch (error) {
    alert(error.message);
  }
};

const init = async () => {
  initTheme();
  attachLogout();
  initScrollReveal();

  const page = document.body.dataset.page;

  if (page === "home") renderHome();
  if (page === "auth") renderAuth();
  if (page === "dashboard") await renderDashboard();
  if (page === "workouts") await renderWorkouts();
  if (page === "community") await renderCommunity();
  if (page === "nutrition") await renderNutrition();
};

window.addEventListener("DOMContentLoaded", init);