import { useState, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera, Upload, Loader2, Image } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNativeCamera, isNativePlatform } from "@/lib/native";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface PhotoUploadSectionProps {
  loading: boolean;
  userId: string;
  currentPhotoUrl: string | null;
  fullName: string;
  onPhotoUpdated: (url: string) => void;
}

const PhotoUploadSection = ({
  loading,
  userId,
  currentPhotoUrl,
  fullName,
  onPhotoUpdated,
}: PhotoUploadSectionProps) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const { takePhoto, pickFromGallery, isAvailable: cameraAvailable } = useNativeCamera();

  const uploadFile = async (file: File | Blob, ext: string = "jpg") => {
    setUploading(true);
    try {
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File Too Large",
          description: "Please select an image under 5MB.",
          variant: "destructive",
        });
        return;
      }

      const fileName = `${userId}/avatar.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(fileName);

      const photoUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      const { error: updateError } = await supabase
        .from("agent_applications")
        .update({ photo_url: photoUrl })
        .eq("user_id", userId);

      if (updateError) throw updateError;

      await supabase
        .from("profiles")
        .update({ avatar_url: photoUrl })
        .eq("user_id", userId);

      onPhotoUpdated(photoUrl);

      toast({
        title: "Photo Updated",
        description: "Your profile photo has been updated.",
      });
    } catch (error) {
      console.error("Error uploading photo:", error);
      toast({
        title: "Upload Failed",
        description: "Failed to upload photo. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid File",
        description: "Please select an image file.",
        variant: "destructive",
      });
      return;
    }

    const ext = file.name.split(".").pop() || "jpg";
    await uploadFile(file, ext);
  };

  const handleNativeCamera = async () => {
    const webPath = await takePhoto();
    if (webPath) {
      const response = await fetch(webPath);
      const blob = await response.blob();
      await uploadFile(blob, "jpg");
    }
  };

  const handleNativeGallery = async () => {
    const webPath = await pickFromGallery();
    if (webPath) {
      const response = await fetch(webPath);
      const blob = await response.blob();
      await uploadFile(blob, "jpg");
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="w-5 h-5" />
          Profile Photo
        </CardTitle>
        <CardDescription>
          Upload a professional photo for your agent profile.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center gap-4">
            <Skeleton className="h-20 w-20 rounded-full" />
            <Skeleton className="h-10 w-32" />
          </div>
        ) : (
          <div className="flex items-center gap-6">
            <Avatar className="h-20 w-20">
              <AvatarImage src={currentPhotoUrl || undefined} alt={fullName} />
              <AvatarFallback className="text-lg bg-primary/10 text-primary">
                {getInitials(fullName || "Agent")}
              </AvatarFallback>
            </Avatar>

            <div className="space-y-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />

              {cameraAvailable ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" disabled={uploading}>
                      {uploading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4 mr-2" />
                          Upload Photo
                        </>
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={handleNativeCamera}>
                      <Camera className="w-4 h-4 mr-2" />
                      Take Photo
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleNativeGallery}>
                      <Image className="w-4 h-4 mr-2" />
                      Choose from Gallery
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
                      <Upload className="w-4 h-4 mr-2" />
                      Browse Files
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Photo
                    </>
                  )}
                </Button>
              )}
              <p className="text-xs text-muted-foreground">
                JPG, PNG or WebP. Max 5MB.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PhotoUploadSection;
