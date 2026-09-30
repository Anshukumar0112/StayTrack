"use client";

import React, { useState } from "react";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase";

interface PropertyImageUploaderProps {
  images: string[];
  onChange: (images: string[]) => void;
  maxImages?: number;
}

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

export default function PropertyImageUploader({
  images = [],
  onChange,
  maxImages = 10,
}: PropertyImageUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    setError("");

    if (images.length + files.length > maxImages) {
      setError(`You can upload a maximum of ${maxImages} photos.`);
      return;
    }

    // Validate size and format
    for (const file of files) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        setError(`Invalid image format for "${file.name}". Allowed formats: JPG, PNG, WEBP, GIF.`);
        return;
      }
      if (file.size > MAX_FILE_SIZE_BYTES) {
        setError(`"${file.name}" exceeds the maximum 5MB size limit.`);
        return;
      }
    }

    setUploading(true);
    const newUploadedUrls: string[] = [];

    for (const file of files) {
      try {
        const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const storagePath = `properties/photos/${Date.now()}_${sanitizedName}`;
        try {
          const storageRef = ref(storage, storagePath);
          await uploadBytes(storageRef, file);
          const downloadUrl = await getDownloadURL(storageRef);
          newUploadedUrls.push(downloadUrl);
        } catch (storageErr: any) {
          console.warn("Direct Storage upload fallback to DataURL:", storageErr);
          const dataUrl = await readFileAsDataUrl(file);
          newUploadedUrls.push(dataUrl);
        }
      } catch (err: any) {
        console.error("Failed to process image:", err);
        setError("Failed to upload one or more images. Please try again.");
      }
    }

    setUploading(false);
    if (newUploadedUrls.length > 0) {
      onChange([...images, ...newUploadedUrls]);
    }
  };

  const handleRemove = (index: number) => {
    const updated = images.filter((_, i) => i !== index);
    onChange(updated);
  };

  const handleMakePrimary = (index: number) => {
    if (index === 0) return;
    const target = images[index];
    const rest = images.filter((_, i) => i !== index);
    onChange([target, ...rest]);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <label className="block text-xs font-bold text-zinc-800 uppercase tracking-wider">
            Property Photos ({images.length}/{maxImages})
          </label>
          <p className="text-[11px] text-zinc-500 font-semibold mt-0.5">
            Upload high-resolution stay photos. First photo will be displayed as the main cover photo.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-bold rounded-xl">
          ⚠️ {error}
        </div>
      )}

      {/* Upload Drop Zone */}
      <div className="relative border-2 border-dashed border-zinc-300 hover:border-black rounded-2xl p-6 text-center bg-zinc-50/50 hover:bg-zinc-100/50 transition-all cursor-pointer">
        <input
          type="file"
          multiple
          accept="image/png, image/jpeg, image/webp, image/gif"
          onChange={handleFileSelect}
          disabled={uploading || images.length >= maxImages}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
        />
        <div className="space-y-2 pointer-events-none">
          <span className="text-3xl block">📸</span>
          <p className="text-xs font-bold text-zinc-900">
            {uploading ? "Uploading photos..." : "Click or drag photos here to upload"}
          </p>
          <p className="text-[10px] font-semibold text-zinc-500">
            Supported formats: JPG, PNG, WEBP, GIF (Max 5MB per photo)
          </p>
        </div>
      </div>

      {/* Image Preview Grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          {images.map((url, idx) => (
            <div
              key={idx}
              className="relative group rounded-2xl overflow-hidden border border-zinc-200 bg-zinc-100 aspect-video shadow-sm"
            >
              <img src={url} alt={`Property photo ${idx + 1}`} className="w-full h-full object-cover" />

              {/* Cover Photo Badge */}
              {idx === 0 ? (
                <span className="absolute top-2 left-2 z-10 bg-black text-white text-[9px] font-black uppercase px-2 py-0.5 rounded-full shadow-md">
                  ★ Cover Photo
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => handleMakePrimary(idx)}
                  className="absolute top-2 left-2 z-10 bg-white/90 hover:bg-black hover:text-white text-zinc-800 text-[9px] font-bold px-2 py-0.5 rounded-full shadow-md transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
                >
                  Set as Cover
                </button>
              )}

              {/* Delete Button */}
              <button
                type="button"
                onClick={() => handleRemove(idx)}
                className="absolute top-2 right-2 z-10 bg-red-600 hover:bg-red-700 text-white text-[10px] font-bold h-6 w-6 rounded-full flex items-center justify-center shadow-md transition-all cursor-pointer"
                title="Remove photo"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
