import cloudinary from "../configs/cloudinary.config";

export const uploadSingleToCloudinary = async (fileBuffer: Buffer, folder: string, publicId: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        cloudinary.uploader.upload_stream(
            { folder, public_id: publicId, format: 'png' },
            (error, result) => {
                if (error) reject(error);
                else resolve(result?.secure_url || '');
            }
        ).end(fileBuffer);
    });
};