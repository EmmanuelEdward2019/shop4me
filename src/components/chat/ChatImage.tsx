import { useEffect, useState } from "react";
import { chatPhotoSignedUrl } from "@/lib/chatPhoto";

interface ChatImageProps {
  src: string;
  alt?: string;
  className?: string;
  /** If provided, clicking the image calls this with the resolved (signed) URL. */
  onOpen?: (url: string) => void;
}

/**
 * Renders a chat/invoice photo via a short-lived signed URL (see chatPhoto.ts).
 * Falls back to the raw stored value until the signed URL resolves.
 */
export const ChatImage = ({ src, alt = "Photo", className, onOpen }: ChatImageProps) => {
  const [url, setUrl] = useState<string>(src);

  useEffect(() => {
    let active = true;
    setUrl(src);
    chatPhotoSignedUrl(src).then((resolved) => {
      if (active) setUrl(resolved);
    });
    return () => {
      active = false;
    };
  }, [src]);

  return (
    <img
      src={url}
      alt={alt}
      className={className}
      loading="lazy"
      onClick={onOpen ? () => onOpen(url) : undefined}
    />
  );
};

export default ChatImage;
