import { useState, useRef } from "react";
import { Send, Image, Camera as CameraIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useNativeCamera, isNativePlatform } from "@/lib/native";
import { useHaptics } from "@/lib/native";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ChatInputProps {
  onSend: (message: string) => void;
  onPhotoUpload?: (file: File) => void;
  onNativePhotoUrl?: (webPath: string) => void;
  onTyping?: (typing: boolean) => void;
  disabled?: boolean;
  placeholder?: string;
  showPhotoUpload?: boolean;
}

export const ChatInput = ({
  onSend,
  onPhotoUpload,
  onNativePhotoUrl,
  onTyping,
  disabled,
  placeholder = "Type a message...",
  showPhotoUpload = true,
}: ChatInputProps) => {
  const [message, setMessage] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { takePhoto, pickFromGallery, isAvailable: cameraAvailable } = useNativeCamera();
  const { impact } = useHaptics();

  const handleSend = () => {
    if (message.trim() && !disabled) {
      impact("light");
      onSend(message.trim());
      setMessage("");
      onTyping?.(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onPhotoUpload) {
      setUploading(true);
      await onPhotoUpload(file);
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleNativeCamera = async () => {
    setUploading(true);
    try {
      const webPath = await takePhoto();
      if (webPath) {
        if (onNativePhotoUrl) {
          onNativePhotoUrl(webPath);
        } else if (onPhotoUpload) {
          const response = await fetch(webPath);
          const blob = await response.blob();
          const file = new File([blob], `camera-${Date.now()}.jpg`, { type: "image/jpeg" });
          await onPhotoUpload(file);
        }
      }
    } finally {
      setUploading(false);
    }
  };

  const handleNativeGallery = async () => {
    setUploading(true);
    try {
      const webPath = await pickFromGallery();
      if (webPath) {
        if (onNativePhotoUrl) {
          onNativePhotoUrl(webPath);
        } else if (onPhotoUpload) {
          const response = await fetch(webPath);
          const blob = await response.blob();
          const file = new File([blob], `gallery-${Date.now()}.jpg`, { type: "image/jpeg" });
          await onPhotoUpload(file);
        }
      }
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex items-center gap-2 p-3 border-t bg-background">
      {showPhotoUpload && (
        <>
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
            disabled={disabled || uploading}
          />

          {cameraAvailable ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  disabled={disabled || uploading}
                >
                  {uploading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Image className="w-5 h-5" />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onClick={handleNativeCamera}>
                  <CameraIcon className="w-4 h-4 mr-2" />
                  Take Photo
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleNativeGallery}>
                  <Image className="w-4 h-4 mr-2" />
                  Choose from Gallery
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button
              size="icon"
              variant="ghost"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled || uploading}
            >
              {uploading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Image className="w-5 h-5" />
              )}
            </Button>
          )}
        </>
      )}
      <Input
        value={message}
        onChange={(e) => {
          setMessage(e.target.value);
          if (e.target.value.trim()) {
            onTyping?.(true);
          } else {
            onTyping?.(false);
          }
        }}
        onBlur={() => onTyping?.(false)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className="flex-1"
      />
      <Button
        size="icon"
        onClick={handleSend}
        disabled={disabled || !message.trim()}
        className={cn(!message.trim() && "opacity-50")}
      >
        <Send className="w-5 h-5" />
      </Button>
    </div>
  );
};
