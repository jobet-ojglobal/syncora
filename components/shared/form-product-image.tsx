"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import Image from "next/image";
import { Link as LinkIcon, Image as ImageIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

// Schema validation using Zod
const profileAvatarSchema = z.object({
  avatarUrl: z
    .string()
    .trim()
    .url({ message: "Please enter a valid URL." })
    .regex(/\.(jpeg|jpg|gif|png|webp|svg)$/i, {
      message: "URL must link directly to an image asset (jpg, png, webp, etc.).",
    })
    .or(z.literal("")), // Allows empty string if they want to clear it
});

type ProductProfileFormValues = z.infer<typeof profileAvatarSchema>;

interface ProductProfileFormProps {
  initialAvatarUrl?: string;
  onSuccessCallback?: (updatedUrl: string) => void;
}

export default function ProductProfileForm({ 
  initialAvatarUrl = "", 
  onSuccessCallback 
}: ProductProfileFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageError, setImageError] = useState(false);

  const { control, handleSubmit, watch, setValue } = useForm<ProductProfileFormValues>({
    resolver: zodResolver(profileAvatarSchema),
    defaultValues: {
      avatarUrl: initialAvatarUrl,
    },
  });

  // Watch the real-time URL value to handle dynamic thumbnail previewing
  const currentUrl = watch("avatarUrl");
  
  // Basic structural URL runtime validation for instant thumbnail feedback
  const isValidUrl = currentUrl && currentUrl.startsWith("http");

  const onSubmit = async (data: ProductProfileFormValues) => {
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/profile/avatar", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ avatarUrl: data.avatarUrl }),
      });

      if (!response.ok) {
        throw new Error("Failed to update profile image.");
      }

      toast.success("Profile avatar updated successfully!");
      if (onSuccessCallback) {
        onSuccessCallback(data.avatarUrl);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg">Local Inflow Picture</CardTitle>
        <CardDescription>
          Provide a public hosted CDN or image URL to update your product image.
        </CardDescription>
      </CardHeader>
      
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4 mb-3">
            {/* Interactive Thumbnail Preview */}
            <div className="w-16 h-16 rounded-full border-2 bg-muted flex items-center justify-center overflow-hidden shrink-0 shadow-sm relative group">
              {isValidUrl && !imageError ? (
                <Image
                  src={currentUrl}
                  alt="Profile Avatar Preview"
                  className="w-full h-full object-cover"
                  height={128}
                  width={128}
                  unoptimized // Bypasses NextJS hostname whitelist issues for dynamic external assets
                  onError={() => setImageError(true)}
                />
              ) : (
                <ImageIcon className="w-6 h-6 text-muted-foreground/40" />
              )}
            </div>

            {/* Main CDN Link Input Row */}
            <div className="flex-1 space-y-1.5">
              <label 
                htmlFor="avatarUrl" 
                className="text-xs font-medium text-muted-foreground"
              >
                Image Address URL
              </label>
              <Controller
                name="avatarUrl"
                control={control}
                render={({ field, fieldState }) => (
                  <div className="relative">
                    <LinkIcon className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground/50" />
                    <Input
                      {...field}
                      id="avatarUrl"
                      aria-invalid={fieldState.invalid}
                      placeholder="https://cdn.example.com/avatars/user-12.jpg"
                      className={`pl-9 h-9 text-sm ${
                        fieldState.invalid ? "border-destructive focus-visible:ring-destructive" : ""
                      }`}
                      onChange={(e) => {
                        field.onChange(e);
                        if (imageError) setImageError(false); // Reset profile image broken state on layout edits
                      }}
                    />
                    {fieldState.error && (
                      <p className="text-[11px] font-medium text-destructive mt-1.5 leading-tight">
                        {fieldState.error.message}
                      </p>
                    )}
                  </div>
                )}
              />
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex justify-end gap-2 border-t bg-muted/30 px-6 py-3">
          {currentUrl && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-xs"
              onClick={() => {
                setValue("avatarUrl", "", { shouldValidate: true });
                setImageError(false);
              }}
              disabled={isSubmitting}
            >
              Clear
            </Button>
          )}
          <Button 
            type="submit" 
            size="sm" 
            className="text-xs min-w-[80px]"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                Saving
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}