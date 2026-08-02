import { UploadApiResponse } from 'cloudinary';
import streamifier from 'streamifier';
import cloudinary from "../configs/cloudinary.config";

class CloudinaryServiceClass {
    /**
     * Upload a single image from a Buffer (Multer)
     */
    public async uploadImage(
        fileBuffer: Buffer,
        folder: 'profiles' | 'verification' | 'services',
        publicId?: string
    ): Promise<UploadApiResponse> {
        return new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                {
                    folder: `Proxxi-App/${folder}`,
                    public_id: publicId,
                    overwrite: true,
                    resource_type: 'auto',
                    transformation: [
                        { width: 1000, crop: "limit", quality: "auto", fetch_format: "auto" }
                    ]
                },
                (error, result) => {
                    if (error) return reject(error);
                    if (!result) return reject(new Error("Upload failed"));
                    resolve(result);
                }
            );

            streamifier.createReadStream(fileBuffer).pipe(uploadStream);
        });
    }

    /**
     * Delete an image from Cloudinary by its URL
     */
    public async deleteImage(url: string): Promise<void> {
        const publicId = this.extractPublicId(url);
        if (!publicId) return;

        try {
            await cloudinary.uploader.destroy(publicId);
            console.log(`[CloudinaryService] Deleted: ${publicId}`);
        } catch (error) {
            console.error(`[CloudinaryService] Delete Error:`, error);
        }
    }

    /**
     * Delete multiple images at once (Batch)
     */
    public async deleteMultipleImages(urls: string[]): Promise<void> {
        const publicIds = urls
            .map(url => this.extractPublicId(url))
            .filter((id): id is string => id !== null);

        if (publicIds.length === 0) return;

        try {
            await cloudinary.api.delete_resources(publicIds);
            console.log(`[CloudinaryService] Batch deleted ${publicIds.length} images`);
        } catch (error) {
            console.error(`[CloudinaryService] Batch Delete Error:`, error);
        }
    }

    /**
     * Get an optimized URL with specific transformations
     * Good for generating thumbnails for your Expo app
     */
    public getThumbnailUrl(url: string): string {
        const publicId = this.extractPublicId(url);
        if (!publicId) return url;

        return cloudinary.url(publicId, {
            width: 200,
            height: 200,
            crop: 'fill',
            gravity: 'face', // Focus on faces for profile photos
            quality: 'auto',
            fetch_format: 'auto'
        });
    }

    private extractPublicId(url: string): string | null {
        try {
            if (!url.includes('cloudinary.com')) return null;
            const parts = url.split('/');
            const uploadIndex = parts.indexOf('upload');
            if (uploadIndex === -1) return null;

            // Extract everything after /upload/vxxxxxx/
            const pathParts = parts.slice(uploadIndex + 2);
            const fullPath = pathParts.join('/');

            // Remove file extension
            return fullPath.split('.')[0];
        } catch (error) {
            return null;
        }
    }
}

export const CloudinaryService = new CloudinaryServiceClass();