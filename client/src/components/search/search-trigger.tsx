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
      <div 
        onClick={() => setIsSearchOpen(true)}
        className="sidebar-nav-item cursor-pointer pl-[19px] pr-[19px] bg-[#d9dfe7] text-[#1e293b]"
      >
        <Search size={20} />
        <span>Search with AI...</span>
      </div>
      <AISearch 
        isOpen={isSearchOpen} 
        onClose={() => setIsSearchOpen(false)} 
      />
    </>
  );
}