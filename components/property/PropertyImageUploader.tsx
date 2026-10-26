"use client";

import React, { useState } from "react";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase";
import { AlertTriangleIcon, CameraIcon, StarIcon, CloseIcon } from "@/components/ui/Icons";

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
          const uploadPromise = uploadBytes(storageRef, file);
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Storage upload timed out")), 3500)
          );
          await Promise.race([uploadPromise, timeoutPromise]);
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
          <label className="block text-xs font-bold text-foreground uppercase tracking-wider">
            Property Photos ({images.length}/{maxImages})
          </label>
          <p className="text-[11px] text-muted font-medium mt-0.5">
            Upload high-resolution stay photos. First photo will be displayed as the main cover photo across search results.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-2xs">
          <AlertTriangleIcon className="w-4 h-4 shrink-0 text-red-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Upload Drop Zone */}
      <div className="relative border-2 border-dashed border-border hover:border-primary rounded-3xl p-7 text-center bg-surface-muted/40 hover:bg-surface-muted/80 transition-all cursor-pointer shadow-2xs group">
        <input
          type="file"
          multiple
          accept="image/png, image/jpeg, image/webp, image/gif"
          onChange={handleFileSelect}
          disabled={uploading || images.length >= maxImages}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
        />
        <div className="space-y-2 pointer-events-none">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center mx-auto mb-1 group-hover:scale-105 transition-transform">
            <CameraIcon className="w-6 h-6 stroke-[1.75]" />
          </div>
          <p className="text-xs font-bold text-foreground">
            {uploading ? "Uploading photos..." : "Click or drag photos here to upload"}
          </p>
          <p className="text-[10px] font-medium text-muted">
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
              className="relative group rounded-2xl overflow-hidden border border-border bg-surface-muted aspect-[4/3] shadow-2xs"
            >
              <img src={url} alt={`Property photo ${idx + 1}`} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]" />

              {/* Cover Photo Badge */}
              {idx === 0 ? (
                <span className="absolute top-2 left-2 z-10 bg-[#111716] text-white text-[9px] font-black uppercase px-2 py-0.5 rounded-full shadow-subtle inline-flex items-center gap-1">
                  <StarIcon className="w-2.5 h-2.5 text-[#D9A441]" />
                  <span>Cover Photo</span>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => handleMakePrimary(idx)}
                  className="absolute top-2 left-2 z-10 bg-surface/95 backdrop-blur-md hover:bg-[#111716] hover:text-white text-foreground text-[9px] font-bold px-2 py-0.5 rounded-full shadow-subtle transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
                >
                  Set as Cover
                </button>
              )}

              {/* Delete Button */}
              <button
                type="button"
                onClick={() => handleRemove(idx)}
                className="absolute top-2 right-2 z-10 bg-rose-600/90 hover:bg-rose-700 text-white text-[10px] font-bold h-6 w-6 rounded-full flex items-center justify-center shadow-subtle transition-all cursor-pointer"
                title="Remove photo"
              >
                <CloseIcon className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
