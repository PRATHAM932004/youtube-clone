import mongoose, { isValidObjectId } from "mongoose";
import { Comment } from "../models/comment.model.js";
import { Video } from "../models/video.model.js";
import { Like } from "../models/like.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Tweet } from "../models/tweet.model.js";

const toggleVideoLike = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const userId = req.user._id;

  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  const existingLike = await Like.findOne({ video: videoId, likedBy: userId });

  if (existingLike) {
    const deletedLike = await existingLike.deleteOne();
    return res
      .status(200)
      .json(new ApiResponse(200, deletedLike, "Video unliked successfully"));
  } else {
    const createdLike = await Like.create({
      video: videoId,
      likedBy: userId,
    });
    return res
      .status(201)
      .json(new ApiResponse(201, createdLike, "Video liked successfully"));
  }
});

const toggleCommentLike = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  const userId = req.user._id;

  const comment = await Comment.findById(commentId);
  if (!comment) {
    throw new ApiError(404, "Comment not found");
  }

  const existingLike = await Like.findOne({
    comment: commentId,
    likedBy: userId,
  });

  if (existingLike) {
    const deletedLike = await existingLike.deleteOne();
    return res
      .status(200)
      .json(new ApiResponse(200, deletedLike, "Comment unliked successfully"));
  } else {
    const createdLike = await Like.create({
      comment: commentId,
      likedBy: userId,
    });
    return res
      .status(201)
      .json(new ApiResponse(201, createdLike, "Comment liked successfully"));
  }
});

const toggleTweetLike = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;
  const userId = req.user._id;

  const tweet = await Tweet.findById(tweetId);
  if (!tweet) {
    throw new ApiError(404, "Tweet not found");
  }

  const existingLike = await Like.findOne({
    tweet: tweetId,
    likedBy: userId,
  });

  if (existingLike) {
    const deletedLike = await existingLike.deleteOne();
    return res
      .status(200)
      .json(new ApiResponse(200, deletedLike, "Tweet unliked successfully"));
  } else {
    const createdLike = await Like.create({
      tweet: tweetId,
      likedBy: userId,
    });
    return res
      .status(201)
      .json(new ApiResponse(201, createdLike, "Tweet liked successfully"));
  }
});

const getLikedVideos = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const likes = await Like.find({ likedBy: userId, video: { $ne: null } })
    .populate("video")
    .lean();

  const videos = likes.map((like) => like.video);

  return res
    .status(201)
    .json(new ApiResponse(201, videos, "Likes fetched successfully"));
});

export { toggleCommentLike, toggleTweetLike, toggleVideoLike, getLikedVideos };
