"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCryptoVizStore, themes } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  Star,
  Plus,
  Trash2,
  Bell,
  BellOff,
  Tag,
  Edit2,
  X,
  Eye,
  Copy,
  ExternalLink,
} from "lucide-react";
import { shortenAddress } from "@/lib/mockData";
import { toast } from "sonner";

export function Watchlist() {
  const {
    watchlist,
    addressTags,
    nodes,
    theme,
    addToWatchlist,
    removeFromWatchlist,
    updateWatchlistEntry,
    addTagToAddress,
    removeTagFromAddress,
    selectNode,
  } = useCryptoVizStore();

  const themeConfig = themes[theme];
  const [isOpen, setIsOpen] = useState(false);
  const [newAddress, setNewAddress] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [editingEntry, setEditingEntry] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");

  const handleAddToWatchlist = () => {
    if (!newAddress.trim()) {
      toast.error("Please enter an address");
      return;
    }

    // Validate address format (basic check)
    if (!newAddress.startsWith("0x") || newAddress.length !== 42) {
      toast.error("Invalid address format");
      return;
    }

    // Check if already in watchlist
    if (watchlist.some((e) => e.address.toLowerCase() === newAddress.toLowerCase())) {
      toast.error("Address already in watchlist");
      return;
    }

    addToWatchlist({
      address: newAddress,
      label: newLabel || shortenAddress(newAddress),
      tags: [],
      alertsEnabled: false,
    });

    setNewAddress("");
    setNewLabel("");
    toast.success("Address added to watchlist");
  };

  const handleRemove = (address: string) => {
    removeFromWatchlist(address);
    toast.success("Address removed from watchlist");
  };

  const handleToggleAlerts = (address: string, currentState: boolean) => {
    updateWatchlistEntry(address, { alertsEnabled: !currentState });
    toast.success(currentState ? "Alerts disabled" : "Alerts enabled");
  };

  const handleStartEdit = (address: string, currentLabel: string) => {
    setEditingEntry(address);
    setEditLabel(currentLabel);
  };

  const handleSaveEdit = (address: string) => {
    if (editLabel.trim()) {
      updateWatchlistEntry(address, { label: editLabel });
      toast.success("Label updated");
    }
    setEditingEntry(null);
    setEditLabel("");
  };

  const handleViewOnNetwork = (address: string) => {
    const node = nodes.find(
      (n) => n.address.toLowerCase() === address.toLowerCase()
    );
    if (node) {
      selectNode(node.id);
      setIsOpen(false);
      toast.success("Node selected on network");
    } else {
      toast.info("Address not found in current network");
    }
  };

  const copyAddress = (address: string) => {
    navigator.clipboard.writeText(address);
    toast.success("Address copied to clipboard");
  };

  const handleToggleTag = (address: string, tagId: string, hasTag: boolean) => {
    if (hasTag) {
      removeTagFromAddress(address, tagId);
    } else {
      addTagToAddress(address, tagId);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative text-gray-400 hover:text-white hover:bg-white/10"
        >
          <Star className="w-4 h-4" />
          {watchlist.length > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 text-[10px] rounded-full flex items-center justify-center bg-[#00ff88] text-black font-medium">
              {watchlist.length}
            </span>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl glass border-white/10">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Star className="w-5 h-5 text-[#00ff88]" />
            Watchlist
          </DialogTitle>
        </DialogHeader>

        {/* Add new address */}
        <div className="space-y-3">
          <div className="flex gap-2">
            <Input
              placeholder="0x... address"
              value={newAddress}
              onChange={(e) => setNewAddress(e.target.value)}
              className="flex-1 bg-white/5 border-white/10 text-white placeholder:text-gray-500"
            />
            <Input
              placeholder="Label (optional)"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              className="w-40 bg-white/5 border-white/10 text-white placeholder:text-gray-500"
            />
            <Button
              onClick={handleAddToWatchlist}
              className="bg-[#00ff88] text-black hover:bg-[#00cc66]"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add
            </Button>
          </div>
        </div>

        <Separator className="bg-white/10" />

        {/* Watchlist entries */}
        <ScrollArea className="h-[400px] pr-4">
          {watchlist.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <Star className="w-12 h-12 mb-4 opacity-30" />
              <p className="text-sm">No addresses in your watchlist</p>
              <p className="text-xs mt-1">Add addresses to track them</p>
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              {watchlist.map((entry, index) => (
                <motion.div
                  key={entry.address}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  transition={{ delay: index * 0.05 }}
                  className="group p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors mb-3"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      {/* Label */}
                      {editingEntry === entry.address ? (
                        <div className="flex items-center gap-2 mb-2">
                          <Input
                            value={editLabel}
                            onChange={(e) => setEditLabel(e.target.value)}
                            className="h-7 text-sm bg-white/10 border-white/20 text-white"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleSaveEdit(entry.address);
                              if (e.key === "Escape") setEditingEntry(null);
                            }}
                          />
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleSaveEdit(entry.address)}
                            className="h-7 px-2"
                          >
                            Save
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-white">
                            {entry.label}
                          </span>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleStartEdit(entry.address, entry.label)}
                            className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Edit2 className="w-3 h-3 text-gray-400" />
                          </Button>
                        </div>
                      )}

                      {/* Address */}
                      <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
                        <span className="font-mono">
                          {shortenAddress(entry.address)}
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyAddress(entry.address)}
                          className="h-5 w-5 p-0"
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          asChild
                          className="h-5 w-5 p-0"
                        >
                          <a
                            href={`https://etherscan.io/address/${entry.address}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </Button>
                      </div>

                      {/* Tags */}
                      <div className="flex flex-wrap gap-1">
                        {entry.tags.map((tagId) => {
                          const tag = addressTags.find((t) => t.id === tagId);
                          if (!tag) return null;
                          return (
                            <Badge
                              key={tagId}
                              className="text-xs cursor-pointer hover:opacity-80 transition-opacity"
                              style={{
                                background: `${tag.color}20`,
                                color: tag.color,
                                borderColor: tag.color,
                              }}
                              onClick={() =>
                                handleToggleTag(entry.address, tagId, true)
                              }
                            >
                              {tag.name}
                              <X className="w-3 h-3 ml-1" />
                            </Badge>
                          );
                        })}
                        {/* Add tag dropdown */}
                        <div className="relative group/tags">
                          <Badge
                            className="text-xs cursor-pointer bg-white/10 text-gray-400 hover:bg-white/20 border-dashed"
                          >
                            <Tag className="w-3 h-3 mr-1" />
                            Add Tag
                          </Badge>
                          <div className="absolute left-0 top-full mt-1 p-2 glass rounded-lg border border-white/10 opacity-0 group-hover/tags:opacity-100 pointer-events-none group-hover/tags:pointer-events-auto transition-opacity z-50 min-w-[120px]">
                            {addressTags
                              .filter((t) => !entry.tags.includes(t.id))
                              .map((tag) => (
                                <button
                                  key={tag.id}
                                  onClick={() =>
                                    handleToggleTag(entry.address, tag.id, false)
                                  }
                                  className="w-full text-left px-2 py-1 text-xs rounded hover:bg-white/10 transition-colors flex items-center gap-2"
                                >
                                  <span
                                    className="w-2 h-2 rounded-full"
                                    style={{ background: tag.color }}
                                  />
                                  <span style={{ color: tag.color }}>
                                    {tag.name}
                                  </span>
                                </button>
                              ))}
                            {addressTags.filter((t) => !entry.tags.includes(t.id))
                              .length === 0 && (
                              <p className="text-xs text-gray-500 px-2 py-1">
                                All tags added
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() =>
                          handleToggleAlerts(entry.address, entry.alertsEnabled)
                        }
                        className={`h-8 w-8 ${
                          entry.alertsEnabled
                            ? "text-[#00ff88]"
                            : "text-gray-500"
                        }`}
                        title={
                          entry.alertsEnabled
                            ? "Disable alerts"
                            : "Enable alerts"
                        }
                      >
                        {entry.alertsEnabled ? (
                          <Bell className="w-4 h-4" />
                        ) : (
                          <BellOff className="w-4 h-4" />
                        )}
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleViewOnNetwork(entry.address)}
                        className="h-8 w-8 text-gray-400 hover:text-white"
                        title="View on network"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleRemove(entry.address)}
                        className="h-8 w-8 text-gray-400 hover:text-red-400"
                        title="Remove from watchlist"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Added date */}
                  <p className="text-xs text-gray-600 mt-2">
                    Added {new Date(entry.addedAt).toLocaleDateString()}
                  </p>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
