import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import AISearch from "./ai-search";

export default function SearchTrigger() {
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Global keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+K or Ctrl+K to open search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setIsSearchOpen(true)}
        className="w-full justify-start text-muted-foreground"
      >
        <Search className="h-4 w-4 mr-2" />
        <span>Search with AI...</span>
        <kbd className="ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>

      <AISearch 
        isOpen={isSearchOpen} 
        onClose={() => setIsSearchOpen(false)} 
      />
    </>
  );
}