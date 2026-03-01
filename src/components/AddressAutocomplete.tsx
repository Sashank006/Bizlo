import { useState, useRef, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { MapPin, Loader2 } from "lucide-react";

interface AddressAutocompleteProps {
  value: string;
  onChange: (address: string) => void;
  placeholder?: string;
  className?: string;
}

interface Suggestion {
  id: string;
  place_name: string;
}

export default function AddressAutocomplete({ value, onChange, placeholder, className }: AddressAutocompleteProps) {
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync external value
  useEffect(() => { setQuery(value); }, [value]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const fetchSuggestions = useCallback(async (text: string) => {
    if (text.length < 3) { setSuggestions([]); return; }
    const token = import.meta.env.VITE_MAPBOX_TOKEN;
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(text)}.json?access_token=${token}&country=us&bbox=-87.94,41.64,-87.52,42.02&types=address&limit=5`
      );
      if (!res.ok) return;
      const data = await res.json();
      setSuggestions(
        (data.features || []).map((f: any) => ({ id: f.id, place_name: f.place_name }))
      );
      setOpen(true);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.slice(0, 200);
    setQuery(val);
    onChange(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(val), 300);
  };

  const handleSelect = (s: Suggestion) => {
    setQuery(s.place_name);
    onChange(s.place_name);
    setOpen(false);
    setSuggestions([]);
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Input
          value={query}
          onChange={handleInput}
          onFocus={() => { if (suggestions.length) setOpen(true); }}
          placeholder={placeholder || "Start typing a Chicago address…"}
          className={cn("pr-8", className)}
          maxLength={200}
        />
        {loading && <Loader2 className="absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />}
      </div>
      {open && suggestions.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full rounded-lg border border-border bg-popover shadow-lg overflow-hidden">
          {suggestions.map((s) => (
            <li
              key={s.id}
              onClick={() => handleSelect(s)}
              className="flex items-center gap-2 px-3 py-2.5 text-sm cursor-pointer hover:bg-accent transition-colors"
            >
              <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span className="truncate">{s.place_name}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
