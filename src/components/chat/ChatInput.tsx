import { useState, useRef } from "react";
import { Send, Image, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface ChatInputProps {
  onSend: (message: string) => void;
  onPhotoUpload?: (file: File) => void;
  disabled?: boolean;
  placeholder?: string;
  showPhotoUpload?: boolean;
}

export const ChatInput = ({
  onSend,
  onPhotoUpload,
  disabled,
  placeholder = "Type a message...",
  showPhotoUpload = true,
}: ChatInputProps) => {
  const [message, setMessage] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSend = () => {
    if (message.trim() && !disabled) {
      onSend(message.trim());
      setMessage("");
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
        </>
      )}
      <Input
        value={message}
        onChange={(e) => setMessage(e.target.value)}
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
