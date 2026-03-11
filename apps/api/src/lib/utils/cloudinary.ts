import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export { cloudinary };

export interface CloudinaryUploadResult {
  public_id: string;
  secure_url: string;
  format: string;
  width: number;
  height: number;
  bytes: number;
}

export async function uploadToCloudinary(
  file: File | Buffer,
  options: { folder?: string; resource_type?: string; tags?: string[] } = {}
): Promise<CloudinaryUploadResult> {
  const uploadOptions = {
    folder: options.folder || "support-attachments",
    resource_type: (options.resource_type || "auto") as "image" | "video" | "raw" | "auto",
    tags: options.tags || ["support"],
  };

  let uploadResult: any;
  if (file instanceof Buffer) {
    uploadResult = await cloudinary.uploader.upload(
      `data:application/octet-stream;base64,${file.toString("base64")}`,
      uploadOptions
    );
  } else {
    const arrayBuffer = await (file as File).arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    uploadResult = await cloudinary.uploader.upload(
      `data:${(file as File).type};base64,${buffer.toString("base64")}`,
      uploadOptions
    );
  }

  return {
    public_id: uploadResult.public_id,
    secure_url: uploadResult.secure_url,
    format: uploadResult.format,
    width: uploadResult.width || 0,
    height: uploadResult.height || 0,
    bytes: uploadResult.bytes,
  };
}

export async function deleteFromCloudinary(
  publicId: string
): Promise<boolean> {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result.result === "ok";
  } catch {
    return false;
  }
}
