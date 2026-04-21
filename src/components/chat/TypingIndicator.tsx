export const TypingIndicator = () => {
  return (
    <div className="flex justify-start mb-3">
      <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-1">
        <span className="w-2 h-2 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:-0.3s]" />
        <span className="w-2 h-2 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:-0.15s]" />
        <span className="w-2 h-2 rounded-full bg-muted-foreground/60 animate-bounce" />
      </div>
    </div>
  );
};
