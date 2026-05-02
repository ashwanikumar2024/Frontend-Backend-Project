const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const { getPosts, createPost, toggleLike, addComment } = require("../controllers/postController");

const router = express.Router();

router.get("/", getPosts);
router.post("/", protect, createPost);
router.patch("/:id/like", protect, toggleLike);
router.post("/:id/comments", protect, addComment);

module.exports = router;
