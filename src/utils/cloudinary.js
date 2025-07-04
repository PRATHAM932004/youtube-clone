import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) return null;

    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });

    fs.unlinkSync(localFilePath);

    return response;
  } catch (error) {
    fs.unlinkSync(localFilePath);
    return null;
  }
};

const deleteFromCloudinary = async (videoURL, resourceType) => {
  try {
    if (!videoURL) return null;

    const segments = videoURL.split("/").filter((segment) => segment);

    const uploadIndex = segments.indexOf("upload");

    let publicIdStart = uploadIndex + 1;

    if (segments[publicIdStart].match(/^v\d+$/)) {
      publicIdStart += 1;
    }

    const publicIdWithExtension = segments.slice(publicIdStart).join("/");
    const publicId = publicIdWithExtension.split(".")[0];

    const response = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
    });
    if (response.result === "ok") {
      return publicId;
    } else {
      console.error("Deletion failed:", response.result);
      return { success: false, result: response.result };
    }
  } catch (error) {
    return null;
  }
};

export { uploadOnCloudinary, deleteFromCloudinary };
