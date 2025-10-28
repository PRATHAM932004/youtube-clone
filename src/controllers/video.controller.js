import { User } from "../models/user.model.js";
import { Video } from "../models/video.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  deleteFromCloudinary,
  uploadOnCloudinary,
} from "../utils/cloudinary.js";

const getAllVideos = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    query = "",
    sortBy = "createdAt",
    sortType = "desc",
    userId,
  } = req.query;

  const filter = {};

  if (query) {
    filter.title = { $regex: query, $options: "i" };
  }

  if (userId) {
    filter.userId = userId;
  }

  const sortOptions = {};
  if (sortBy) {
    sortOptions[sortBy] = sortType === "asc" ? 1 : -1;
  }

  const skip = (page - 1) * limit;

  const [videos, total] = await Promise.all([
    Video.aggregate([
      { $match: filter },
      { $sort: sortOptions },
      { $skip: skip },
      { $limit: parseInt(limit) },

      {
        $lookup: {
          from: "likes",
          localField: "_id",
          foreignField: "video",
          as: "likes",
        },
      },
      {
        $addFields: {
          likesCount: { $size: "$likes" },
        },
      },
      {
        $project: { likes: 0 },
      },
      {
        $lookup: {
          from: "users",
          localField: "owner",
          foreignField: "_id",
          pipeline: [{ $project: { fullName: 1, avatar: 1 } }],
          as: "owner",
        },
      },
      { $unwind: "$owner" },
      {
        $lookup: {
          from: "subscriptions",
          localField: "owner._id",
          foreignField: "channel",
          as: "subscribers",
        },
      },
      {
        $addFields: {
          subscribersCount: { $size: "$subscribers" },
        },
      },
      {
        $project: { subscribers: 0 },
      },
    ]),
    Video.countDocuments(filter),
  ]);

  res.status(200).json(
    new ApiResponse(
      200,
      {
        videos,
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit),
      },
      "Videos fetched successfully"
    )
  );
});

const publishAVideo = asyncHandler(async (req, res) => {
  const { title, description } = req.body;

  if (!title || !description) {
    throw new ApiError(400, "All fields are required");
  }

  const videoLocalPath = req.files?.videoFile[0].path;
  const thumbnailLocalPath = req.files?.thumbnail[0]?.path;

  if (!videoLocalPath) {
    throw new ApiError(400, "Video local file is required");
  }

  if (!thumbnailLocalPath) {
    throw new ApiError(400, "Thumbnail local file is required");
  }

  const videoFile = await uploadOnCloudinary(videoLocalPath);
  const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);

  if (!videoFile) {
    throw new ApiError(400, "Video file is required");
  }

  if (!thumbnail) {
    throw new ApiError(400, "Thumbnail file is required");
  }

  const video = await Video.create({
    videoFile: videoFile.url,
    thumbnail: thumbnail.url,
    title,
    description,
    duration: videoFile.duration,
    owner: req.user._id,
  });

  if (!video) {
    throw new ApiError(400, "Somthing went wrong during uploding video");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, video, "Video upload successfully"));
});

const getVideoById = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!videoId) {
    throw new ApiError(400, "Invalid video id");
  }

  const video = await Video.findById(videoId);

  if (!video) {
    throw new ApiError(400, "Video not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, video, "Video fetch successfully"));
});

const updateVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { title, description } = req.body;

  if (!videoId) {
    throw new ApiError(400, "Invalid video id");
  }

  if (!title || !description) {
    throw new ApiError(400, "All fields are required");
  }

  const updateData = { title: title, description: description };

  const thumbnailLocalPath = req.file.path;

  let thumbnail;
  if (thumbnailLocalPath) {
    thumbnail = await uploadOnCloudinary(thumbnailLocalPath);
  }

  if (thumbnail) updateData.thumbnail = thumbnail.url;

  const video = await Video.findByIdAndUpdate(videoId, updateData, {
    new: true,
  });

  if (!video) {
    throw new ApiError(400, "Video not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, video, "Video fetch successfully"));
});

const deleteVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!videoId) {
    throw new ApiError(400, "Invalid video id");
  }

  const video = await Video.findById(videoId);

  if (!video) {
    throw new ApiError(400, "Video not found");
  }

  const videoPublicId = await deleteFromCloudinary(video?.videoFile, "video");
  const thumbnailPublicId = await deleteFromCloudinary(
    video?.thumbnail,
    "image"
  );

  if (!videoPublicId || !thumbnailPublicId) {
    throw new ApiError(400, "Somting went wrong during file delete");
  }

  const response = await video.deleteOne();

  if (!response.acknowledged) {
    throw new ApiError(400, "Somting went wrong during video delete");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, "Video delete successfully"));
});

const togglePublishStatus = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!videoId) {
    throw new ApiError(400, "Invalid video id");
  }

  const video = await Video.findById(videoId);

  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  const updatedVideo = await Video.findByIdAndUpdate(
    videoId,
    { isPublished: !video.isPublished },
    { new: true }
  );

  return res
    .status(200)
    .json(
      new ApiResponse(200, updatedVideo, "Video status update successfully")
    );
});

const addToWatchHistory = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const userId = req.user._id;

  if (!videoId) {
    throw new ApiError(400, "Invalid video id");
  }

  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  video.views += 1;
  await video.save();

  const user = await User.findById(userId);

  user.watchHistory = user.watchHistory.filter((v) => v.toString() !== videoId);

  user.watchHistory.unshift(videoId);

  if (user.watchHistory.length > 50) {
    user.watchHistory = user.watchHistory.slice(0, 50);
  }

  await user.save();

  return res
    .status(200)
    .json(new ApiResponse(200, user.watchHistory, "Watch history updated"));
});

export {
  getAllVideos,
  publishAVideo,
  getVideoById,
  updateVideo,
  deleteVideo,
  togglePublishStatus,
  addToWatchHistory,
};
