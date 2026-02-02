interface CardBrandIconProps {
  brand: string | null;
  className?: string;
}

const CardBrandIcon = ({ brand, className = "w-10 h-6" }: CardBrandIconProps) => {
  const brandLower = brand?.toLowerCase() || "";

  if (brandLower === "visa") {
    return (
      <svg className={className} viewBox="0 0 48 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="48" height="32" rx="4" fill="#1A1F71" />
        <path
          d="M19.5 21.5L21 10.5H24L22.5 21.5H19.5ZM32.5 10.7C31.8 10.4 30.7 10.1 29.3 10.1C25.9 10.1 23.5 11.9 23.5 14.4C23.5 16.3 25.2 17.3 26.5 17.9C27.8 18.5 28.3 18.9 28.3 19.5C28.3 20.3 27.3 20.7 26.4 20.7C25.1 20.7 24.4 20.5 23.3 20L22.8 19.8L22.3 23C23.2 23.4 24.8 23.8 26.5 23.8C30.1 23.8 32.4 22 32.5 19.4C32.5 17.9 31.5 16.8 29.5 15.9C28.3 15.3 27.6 14.9 27.6 14.3C27.6 13.7 28.3 13.2 29.6 13.2C30.7 13.2 31.5 13.4 32.1 13.7L32.4 13.8L33 10.8L32.5 10.7ZM38.5 10.5H36C35.2 10.5 34.6 10.7 34.3 11.6L29.5 21.5H33.1L33.8 19.6H38.2L38.6 21.5H41.5L38.5 10.5ZM34.8 17.1C35.1 16.3 36.3 13.4 36.3 13.4C36.3 13.4 36.6 12.6 36.8 12.1L37 13.3C37 13.3 37.7 16.4 37.9 17.1H34.8ZM17.5 10.5L14.1 18L13.7 16.2C13 14.1 11 11.8 8.7 10.6L11.7 21.5H15.3L21.1 10.5H17.5Z"
          fill="white"
        />
        <path
          d="M11.5 10.5H6.1L6 10.8C10.3 11.9 13.1 14.5 14 17.5L13 11.6C12.8 10.8 12.2 10.5 11.5 10.5Z"
          fill="#F9A533"
        />
      </svg>
    );
  }

  if (brandLower === "mastercard") {
    return (
      <svg className={className} viewBox="0 0 48 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="48" height="32" rx="4" fill="#000000" />
        <circle cx="18" cy="16" r="8" fill="#EB001B" />
        <circle cx="30" cy="16" r="8" fill="#F79E1B" />
        <path
          d="M24 10.5C25.9 12 27.1 14.4 27.1 17C27.1 19.6 25.9 22 24 23.5C22.1 22 20.9 19.6 20.9 17C20.9 14.4 22.1 12 24 10.5Z"
          fill="#FF5F00"
        />
      </svg>
    );
  }

  if (brandLower === "verve") {
    return (
      <svg className={className} viewBox="0 0 48 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="48" height="32" rx="4" fill="#00425F" />
        <path
          d="M10 12L14 20L18 12H21L15.5 23H12.5L7 12H10Z"
          fill="#EE312A"
        />
        <path
          d="M22 12H30V14.5H25V16H29V18.5H25V20.5H30V23H22V12Z"
          fill="white"
        />
        <path
          d="M32 12H37C39.5 12 41 13.5 41 15.5C41 17 40 18 39 18.5L41.5 23H38L36 19H35V23H32V12ZM35 17H36.5C37.3 17 38 16.5 38 15.5C38 14.5 37.3 14 36.5 14H35V17Z"
          fill="white"
        />
      </svg>
    );
  }

  // Default card icon
  return (
    <svg className={className} viewBox="0 0 48 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="32" rx="4" fill="currentColor" className="text-muted" />
      <rect x="4" y="8" width="40" height="4" rx="1" fill="currentColor" className="text-muted-foreground" />
      <rect x="4" y="16" width="12" height="3" rx="1" fill="currentColor" className="text-muted-foreground/50" />
      <rect x="4" y="21" width="8" height="3" rx="1" fill="currentColor" className="text-muted-foreground/50" />
    </svg>
  );
};

export default CardBrandIcon;
