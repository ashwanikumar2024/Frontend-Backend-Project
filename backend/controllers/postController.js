const Post = require("../models/Post");

const getPosts = async (req, res, next) => {
  try {
    const posts = await Post.find()
      .sort({ createdAt: -1 })
      .populate("user", "name")
      .populate("comments.user", "name");
    res.json(posts);
  } catch (error) {
    next(error);
  }
};

const createPost = async (req, res, next) => {
  try {
    const { content } = req.body;
    if (!content) {
      res.status(400);
      throw new Error("Post content is required.");
    }
    const post = await Post.create({ user: req.user._id, content });
    const populatedPost = await post.populate("user", "name");
    res.status(201).json(populatedPost);
  } catch (error) {
    next(error);
  }
};

const toggleLike = async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      res.status(404);
      throw new Error("Post not found.");
    }
    const index = post.likes.findIndex((id) => id.toString() === req.user._id.toString());
    if (index >= 0) {
      post.likes.splice(index, 1);
    } else {
      post.likes.push(req.user._id);
    }
    await post.save();
    res.json({ likesCount: post.likes.length, liked: index < 0 });
  } catch (error) {
    next(error);
  }
};

const addComment = async (req, res, next) => {
  try {
    const { text } = req.body;
    if (!text) {
      res.status(400);
      throw new Error("Comment text is required.");
    }

    const post = await Post.findById(req.params.id);
    if (!post) {
      res.status(404);
      throw new Error("Post not found.");
    }

    post.comments.push({
      user: req.user._id,
      text,
    });
    await post.save();
    const updatedPost = await Post.findById(req.params.id)
      .populate("user", "name")
      .populate("comments.user", "name");
    res.status(201).json(updatedPost);
  } catch (error) {
    next(error);
  }
};

module.exports = { getPosts, createPost, toggleLike, addComment };
