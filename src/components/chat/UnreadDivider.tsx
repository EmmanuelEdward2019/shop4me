interface UnreadDividerProps {
  count?: number;
}

export const UnreadDivider = ({ count }: UnreadDividerProps) => {
  return (
    <div className="flex items-center gap-2 my-3" aria-label="Unread messages">
      <div className="flex-1 h-px bg-primary/30" />
      <span className="text-[11px] font-medium text-primary uppercase tracking-wide">
        {count ? `${count} new ${count === 1 ? "message" : "messages"}` : "New"}
      </span>
      <div className="flex-1 h-px bg-primary/30" />
    </div>
  );
};
