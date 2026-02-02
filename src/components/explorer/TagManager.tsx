"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCryptoVizStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tag,
  Plus,
  Trash2,
  Palette,
} from "lucide-react";
import { toast } from "sonner";

const PRESET_COLORS = [
  "#ff4444",
  "#ff8800",
  "#ffff00",
  "#00ff88",
  "#00ffff",
  "#0088ff",
  "#8844ff",
  "#ff00ff",
  "#ff4488",
  "#888888",
];

export function TagManager() {
  const { addressTags, createTag, deleteTag, watchlist } = useCryptoVizStore();

  const [isOpen, setIsOpen] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState(PRESET_COLORS[0]);

  const handleCreateTag = () => {
    if (!newTagName.trim()) {
      toast.error("Please enter a tag name");
      return;
    }

    // Check if tag already exists
    if (addressTags.some((t) => t.name.toLowerCase() === newTagName.toLowerCase())) {
      toast.error("Tag already exists");
      return;
    }

    createTag(newTagName, newTagColor);
    setNewTagName("");
    setNewTagColor(PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)]);
    toast.success(`Tag "${newTagName}" created`);
  };

  const handleDeleteTag = (id: string, name: string) => {
    // Check if tag is in use
    const usageCount = watchlist.filter((e) => e.tags.includes(id)).length;
    if (usageCount > 0) {
      toast.warning(
        `Tag "${name}" is used by ${usageCount} address${usageCount > 1 ? "es" : ""}. Removing anyway.`
      );
    }
    deleteTag(id);
    toast.success(`Tag "${name}" deleted`);
  };

  const getTagUsageCount = (tagId: string) => {
    return watchlist.filter((e) => e.tags.includes(tagId)).length;
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="text-gray-400 hover:text-white hover:bg-white/10"
          title="Manage Tags"
        >
          <Tag className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md glass border-white/10">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Tag className="w-5 h-5 text-[#00ff88]" />
            Manage Tags
          </DialogTitle>
        </DialogHeader>

        {/* Create new tag */}
        <div className="space-y-3">
          <div className="flex gap-2">
            <Input
              placeholder="New tag name..."
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              className="flex-1 bg-white/5 border-white/10 text-white placeholder:text-gray-500"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreateTag();
              }}
            />
            <Button
              onClick={handleCreateTag}
              className="bg-[#00ff88] text-black hover:bg-[#00cc66]"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          {/* Color picker */}
          <div className="flex items-center gap-2">
            <Palette className="w-4 h-4 text-gray-400" />
            <div className="flex gap-1 flex-wrap">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => setNewTagColor(color)}
                  className={`w-6 h-6 rounded-full transition-all ${
                    newTagColor === color
                      ? "ring-2 ring-white ring-offset-2 ring-offset-[#0a0a0f] scale-110"
                      : "hover:scale-110"
                  }`}
                  style={{ background: color }}
                  title={color}
                />
              ))}
            </div>
          </div>
        </div>

        <Separator className="bg-white/10" />

        {/* Tags list */}
        <div>
          <h4 className="text-sm font-medium text-gray-400 mb-3">
            Your Tags ({addressTags.length})
          </h4>
          <ScrollArea className="h-[250px] pr-4">
            {addressTags.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                <Tag className="w-12 h-12 mb-4 opacity-30" />
                <p className="text-sm">No tags created</p>
                <p className="text-xs mt-1">Create tags to organize addresses</p>
              </div>
            ) : (
              <AnimatePresence mode="popLayout">
                {addressTags.map((tag, index) => (
                  <motion.div
                    key={tag.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -50 }}
                    transition={{ delay: index * 0.03 }}
                    className="group flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors mb-2"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className="w-4 h-4 rounded-full"
                        style={{ background: tag.color }}
                      />
                      <span className="font-medium" style={{ color: tag.color }}>
                        {tag.name}
                      </span>
                      <span className="text-xs text-gray-500">
                        {getTagUsageCount(tag.id)} used
                      </span>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleDeleteTag(tag.id, tag.name)}
                      className="h-8 w-8 text-gray-400 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
