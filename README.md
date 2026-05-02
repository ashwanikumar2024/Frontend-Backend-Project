# Sports & Fitness Innovation Platform

A complete production-style full stack web application for fitness tracking, AI-based recommendations, analytics, and community engagement.

## Tech Stack

- Frontend: HTML5, CSS3, Vanilla JavaScript
- Backend: Node.js + Express.js
- Database: MongoDB Atlas + Mongoose

## Project Structure

```text
int219_project/
  frontend/
    index.html
    auth.html
    dashboard.html
    workouts.html
    community.html
    styles.css
    app.js
  backend/
    models/
    routes/
    controllers/
    middleware/
    server.js
    seed.js
    .env.example
    sample-mongodb-data.json
  .gitignore
  README.md
```

## Features Implemented

1. JWT authentication (register, login, logout)
2. Personalized dashboard with fitness stats
3. Workout CRUD management
4. Simulated AI-based recommendation logic
5. Weekly/monthly analytics + Chart.js graph
6. Community feed with post/like/comment
7. Responsive modern UI (gradient cards, animations)
8. Dark mode toggle
9. BMI calculator
10. Daily fitness tips
11. Loading overlay/spinner
12. Nutrition profile setup (age, gender, body metrics, activity, goal)
13. BMR/TDEE + daily macro calculator (Mifflin-St Jeor)
14. AI Diet Tracker with meal logging and nutrient progress bars
15. Indian food database suggestions + weekly nutrition analytics
16. Water intake tracker + AI meal reminders

---

## Local Setup (Step-by-Step)

### 1) Clone and open

```bash
git clone <your-repo-url>
cd int219_project
```

### 2) Backend setup

```bash
cd backend
npm install
```

Create `.env` in `backend/`:

```env
PORT=5000
MONGO_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/sports_fitness_platform?retryWrites=true&w=majority
JWT_SECRET=your_super_secret_jwt_key
CLIENT_URL=http://127.0.0.1:5500
```

### 3) Seed sample data (optional)

```bash
npm run seed
```

Demo login after seed:
- Email: `demo@sportsfit.com`
- Password: `Password123`

### 4) Start backend

```bash
npm run dev
```

### 5) Start frontend

From project root, serve `frontend/` with Live Server or any static server:

```bash
# Example using VS Code Live Server:
# Open frontend/index.html and click "Go Live"
```

Frontend expects backend at:
- `http://localhost:5000`

If needed, update `API_BASE` in `frontend/app.js`.

---

## REST API Documentation

Base URL: `http://localhost:5000/api`

### Auth APIs (`/api/auth`)

- `POST /register`
  - body:
    ```json
    {
      "name": "John",
      "email": "john@mail.com",
      "password": "Password123",
      "goal": "muscle_gain",
      "age": 23,
      "heightCm": 176,
      "weightKg": 74
    }
    ```
- `POST /login`
  - body:
    ```json
    {
      "email": "john@mail.com",
      "password": "Password123"
    }
    ```
- `GET /me` (Bearer token required)
- `PUT /me` (Bearer token required)

### Workout APIs (`/api/workouts`)

- `GET /` (Bearer token required)
- `POST /` (Bearer token required)
  - body:
    ```json
    {
      "type": "Cycling",
      "duration": 45,
      "caloriesBurned": 350,
      "date": "2026-04-29",
      "notes": "Moderate pace"
    }
    ```
- `PUT /:id` (Bearer token required)
- `DELETE /:id` (Bearer token required)
- `GET /analytics/overview` (Bearer token required)

### Community APIs (`/api/posts`)

- `GET /` (public feed)
- `POST /` (Bearer token required)
  - body:
    ```json
    {
      "content": "Completed my 5k run today!"
    }
    ```
- `PATCH /:id/like` (Bearer token required)
- `POST /:id/comments` (Bearer token required)
  - body:
    ```json
    {
      "text": "Great work!"
    }
    ```

### Nutrition APIs (`/api/nutrition`)

- `GET /profile` (Bearer token required)
- `PUT /profile` (Bearer token required)
  - body:
    ```json
    {
      "age": 24,
      "gender": "male",
      "heightCm": 175,
      "weightKg": 72,
      "activityLevel": "active",
      "goal": "weight_gain"
    }
    ```
- `GET /foods?q=paneer` (Bearer token required)
- `GET /meals?date=2026-05-01` (Bearer token required)
- `POST /meals` (Bearer token required)
  - body:
    ```json
    {
      "date": "2026-05-01",
      "mealType": "lunch",
      "foodName": "Rajma Chawal",
      "quantity": 1,
      "nutrients": {
        "calories": 350,
        "protein": 14,
        "carbs": 55,
        "fats": 8,
        "fiber": 10
      }
    }
    ```
- `DELETE /meals/:id` (Bearer token required)
- `POST /water` (Bearer token required)
- `GET /summary?date=2026-05-01` (Bearer token required)
- `GET /recommendations?date=2026-05-01` (Bearer token required)
- `GET /weekly-progress` (Bearer token required)

---

## Deployment Instructions

## Frontend on GitHub Pages

1. Push project to GitHub.
2. In repo settings, enable **Pages** from `main` branch and `/frontend` folder.
3. In `frontend/app.js`, update:
   - `API_BASE = "https://<your-backend-domain>/api"`
4. Re-deploy frontend.

## Backend on Render or Railway

1. Create a new web service from `backend/`.
2. Build command: `npm install`
3. Start command: `npm start`
4. Add environment variables:
   - `PORT`
   - `MONGO_URI`
   - `JWT_SECRET`
   - `CLIENT_URL` (GitHub Pages URL)

## MongoDB Atlas

1. Create cluster and database `sports_fitness_platform`.
2. Create DB user and add network access (`0.0.0.0/0` or restricted IP).
3. Copy connection string and place in backend `.env`.

---

## Notes

- Passwords are hashed with `bcryptjs`.
- Tokens are stored in `localStorage`.
- All protected routes require `Authorization: Bearer <token>`.
- Backend follows MVC pattern with controllers, models, routes, and middleware.
- Nutrition module entrypoint page is `frontend/nutrition.html`.
- Nutrition sample payload file: `backend/sample-nutrition-data.json`.
