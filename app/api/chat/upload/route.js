import { NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

// Configure Cloudinary only if keys are present and not the default placeholder text
const isCloudinaryConfigured = 
  process.env.CLOUDINARY_CLOUD_NAME && 
  process.env.CLOUDINARY_CLOUD_NAME !== 'your_cloud_name' &&
  process.env.CLOUDINARY_API_KEY && 
  process.env.CLOUDINARY_API_KEY !== 'your_api_key' &&
  process.env.CLOUDINARY_API_SECRET && 
  process.env.CLOUDINARY_API_SECRET !== 'your_api_secret';

if (isCloudinaryConfigured) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

const uploadToCloudinary = (buffer, resourceType) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: resourceType,
        folder: 'chat_attachments',
      },
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      }
    );
    uploadStream.end(buffer);
  });
};

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    let type = 'file';
    let resourceType = 'auto';

    if (file.type.startsWith('image/')) {
      type = 'image';
      resourceType = 'image';
    } else if (file.type.startsWith('audio/')) {
      type = 'audio';
      resourceType = 'video';
    }

    if (isCloudinaryConfigured) {
      // Direct Cloudinary upload
      const uploadResult = await uploadToCloudinary(buffer, resourceType);
      return NextResponse.json({
        fileUrl: uploadResult.secure_url,
        fileName: file.name,
        type: type,
      });
    } else {
      // Local fallback upload for seamless local testing
      const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
      await mkdir(uploadsDir, { recursive: true });

      const uniqueName = `${Date.now()}-${file.name.replace(/\s+/g, '_')}`;
      const filePath = path.join(uploadsDir, uniqueName);
      await writeFile(filePath, buffer);

      console.warn('Cloudinary not configured. Defaulting to local file upload at: ' + filePath);

      return NextResponse.json({
        fileUrl: `/uploads/${uniqueName}`,
        fileName: file.name,
        type: type,
      });
    }
  } catch (error) {
    console.error('Error handling upload:', error);
    return NextResponse.json(
      { error: 'Upload failed: ' + error.message },
      { status: 500 }
    );
  }
}
