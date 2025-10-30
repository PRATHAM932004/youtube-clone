import mongoose, { isValidObjectId } from "mongoose";
import { User } from "../models/user.model.js";
import { Subscription } from "../models/subscription.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const toggleSubscription = asyncHandler(async (req, res) => {
  const { channelId } = req.params;
  const userId = req.user._id;

  if (!channelId) {
    throw new ApiError(404, "ChannelId is required");
  }

  const existingSubscription = await Subscription.findOne({
    channel: channelId,
    subscriber: userId,
  });

  if (existingSubscription) {
    const deletedSubscription = await existingSubscription.deleteOne();

    return res
      .status(200)
      .json(
        new ApiResponse(200, deletedSubscription, "Unsubscribe successfully")
      );
  } else {
    const createdSubscription = await Subscription.create({
      channel: channelId,
      subscriber: userId,
    });

    return res
      .status(200)
      .json(
        new ApiResponse(200, createdSubscription, "Subscribe successfully")
      );
  }
});

// controller to return subscriber list of a channel
const getSubscribedChannels = asyncHandler(async (req, res) => {
  const { channelId } = req.params;

  if (!channelId) {
    throw new ApiError(404, "ChannelId is required");
  }

  const subscriberList = await Subscription.find({ channel: channelId })
    .populate()
    .lean();

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        subscriberList,
        "Subscriber list fetched successfully"
      )
    );
});

// controller to return channel list to which user has subscribed
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
  const { subscriberId } = req.params;

  if (!subscriberId) {
    throw new ApiError(404, "SubscriberId is required");
  }

  const channelList = await Subscription.find({ subscriber: subscriberId })
    .populate()
    .lean();

  return res
    .status(200)
    .json(
      new ApiResponse(200, channelList, "Channel list fetched successfully")
    );
});

export { toggleSubscription, getUserChannelSubscribers, getSubscribedChannels };
