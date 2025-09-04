import mongoose from "mongoose";
import { Video } from "../models/video.model.js";
import { Subscription } from "../models/subscription.model.js";
import { Like } from "../models/like.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const getChannelStats = asyncHandler(async (req, res) => {
  // TODO: Get the channel stats like total video views, total subscribers, total videos, total likes etc.
  const userId = req.user._id;

  const totalSubscribers = await Subscription.countDocuments({
    channel: userId,
  });

  const videoStats = await Video.aggregate([
    { $match: { owner: userId } },
    {
      $group: {
        _id: null,
        totalVideos: { $sum: 1 },
        totalViews: { $sum: "$views" },
      },
    },
  ]);

  const { totalVideos, totalViews } = videoStats[0] || {
    totalVideos: 0,
    totalViews: 0,
  };

  const totalLikes = await Like.countDocuments({
    video: { $in: await Video.find({ owner: userId }).distinct("_id") },
  });

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { totalSubscribers, totalVideos, totalViews, totalLikes },
        "User channel fetched successfully"
      )
    );
});

const getChannelVideos = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const allVideos = await Video.find({ owner: userId });

  return res
    .status(200)
    .json(new ApiResponse(200, allVideos, "Videos list fetched successfully"));
});

export { getChannelStats, getChannelVideos };
