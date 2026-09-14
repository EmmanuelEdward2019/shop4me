import { useEffect, useState } from "react";
import { Check, UserPlus, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export interface PickedUser {
  user_id: string;
  full_name: string | null;
  email: string | null;
}

interface Props {
  value: PickedUser[];
  onChange: (users: PickedUser[]) => void;
  max?: number;
}

/** Search-and-select users by name or email (admin only, via admin_list_users). */
const AdminUserPicker = ({ value, onChange, max = 500 }: Props) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PickedUser[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(async () => {
      setLoading(true);
      const { data, error } = await supabase.rpc("admin_list_users" as never, {
        p_search: query.trim() || null,
        p_role: null,
        p_limit: 20,
        p_offset: 0,
      } as never);
      setLoading(false);
      if (!error) {
        setResults(
          ((data ?? []) as unknown as PickedUser[]).map((u) => ({
            user_id: u.user_id,
            full_name: u.full_name,
            email: u.email,
          })),
        );
      }
    }, 250);
    return () => clearTimeout(t);
  }, [query, open]);

  const selected = new Set(value.map((v) => v.user_id));
  const toggle = (u: PickedUser) => {
    if (selected.has(u.user_id)) onChange(value.filter((v) => v.user_id !== u.user_id));
    else if (value.length < max) onChange([...value, u]);
  };

  return (
    <div className="space-y-3">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" className="w-full justify-start gap-2 font-normal">
            <UserPlus className="h-4 w-4" />
            {value.length ? `Add more recipients (${value.length} selected)` : "Search users by name or email"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[min(92vw,420px)] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput placeholder="Type a name or email…" value={query} onValueChange={setQuery} />
            <CommandList>
              <CommandEmpty>{loading ? "Searching…" : "No users found."}</CommandEmpty>
              <CommandGroup>
                {results.map((u) => (
                  <CommandItem key={u.user_id} value={u.user_id} onSelect={() => toggle(u)} className="gap-2">
                    <Check className={`h-4 w-4 ${selected.has(u.user_id) ? "opacity-100 text-primary" : "opacity-0"}`} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{u.full_name || "No name"}</p>
                      <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((u) => (
            <Badge key={u.user_id} variant="secondary" className="gap-1 py-1 pl-2.5 pr-1">
              <span className="max-w-[220px] truncate">{u.full_name || u.email}</span>
              <button
                type="button"
                onClick={() => toggle(u)}
                className="rounded-full p-0.5 hover:bg-foreground/10"
                aria-label={`Remove ${u.full_name || u.email}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          <button type="button" onClick={() => onChange([])} className="text-xs text-muted-foreground hover:text-foreground">
            Clear all
          </button>
        </div>
      )}
    </div>
  );
};

export default AdminUserPicker;
