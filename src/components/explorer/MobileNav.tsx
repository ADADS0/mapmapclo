"use client";

import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Menu, Grid, Tag, ZoomIn, ZoomOut, RotateCcw, Palette, Home, Settings, ChevronRight, Search, Download, Wallet, Keyboard, Image, FileSpreadsheet, FileJson, Star, FolderOpen, Save, Plus, Trash2, Bell, BellOff, Upload, X } from "lucide-react";
import { useCryptoVizStore, themes } from "@/lib/store";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ThemeName } from "@/types";
import Link from "next/link";
import { toast } from "sonner";
import { shortenAddress } from "@/lib/mockData";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";

const PRESET_COLORS = [
  "#ff4444", "#ff8800", "#ffff00", "#00ff88", "#00ffff",
  "#0088ff", "#8844ff", "#ff00ff", "#ff4488", "#888888",
];

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const {
    selectedChain, chains, setSelectedChain, theme, setTheme, view, setView, stats, nodes, links,
    watchlist, savedWorkspaces, saveWorkspace, exportWorkspace, importWorkspace, deleteWorkspace, loadWorkspace,
    addressTags, createTag, deleteTag, addToWatchlist, removeFromWatchlist, updateWatchlistEntry
  } = useCryptoVizStore();
  const [quickSaveName, setQuickSaveName] = useState("");
  const [showQuickSave, setShowQuickSave] = useState(false);
  const [showAddAddress, setShowAddAddress] = useState(false);
  const [newAddress, setNewAddress] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [showAddTag, setShowAddTag] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState("#00ff88");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleZoomIn = () => setView({ zoom: Math.min(view.zoom * 1.2, 3) });
  const handleZoomOut = () => setView({ zoom: Math.max(view.zoom / 1.2, 0.3) });
  const handleReset = () => setView({ zoom: 1, panX: 0, panY: 0 });

  const handleOpenSearch = () => {
    setOpen(false);
    setTimeout(() => window.dispatchEvent(new CustomEvent("openSearch")), 100);
  };

  const handleOpenWallet = () => {
    setOpen(false);
    setTimeout(() => window.dispatchEvent(new CustomEvent("openWalletInput")), 100);
  };

  const handleShowShortcuts = () => {
    setOpen(false);
    setTimeout(() => window.dispatchEvent(new CustomEvent("showShortcutsHelp")), 100);
  };

  const handleQuickSave = () => {
    if (!quickSaveName.trim()) { toast.error("Please enter a name"); return; }
    saveWorkspace(quickSaveName);
    toast.success(`Workspace "${quickSaveName}" saved`);
    setQuickSaveName("");
    setShowQuickSave(false);
  };

  const handleExportWorkspace = () => {
    const data = exportWorkspace();
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cryptoviz-workspace-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Workspace exported");
  };

  const handleImportWorkspace = () => fileInputRef.current?.click();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const success = importWorkspace(content);
      if (success) toast.success("Workspace imported successfully");
      else toast.error("Failed to import workspace. Invalid file format.");
    };
    reader.readAsText(file);
    event.target.value = "";
  };

  const handleAddToWatchlist = () => {
    if (!newAddress.trim()) { toast.error("Please enter an address"); return; }
    if (!newAddress.startsWith("0x") || newAddress.length !== 42) { toast.error("Invalid address format"); return; }
    if (watchlist.some((e) => e.address.toLowerCase() === newAddress.toLowerCase())) { toast.error("Address already in watchlist"); return; }
    addToWatchlist({ address: newAddress, label: newLabel || shortenAddress(newAddress), tags: [], alertsEnabled: false });
    setNewAddress(""); setNewLabel(""); setShowAddAddress(false);
    toast.success("Address added to watchlist");
  };

  const handleCreateTag = () => {
    if (!newTagName.trim()) { toast.error("Please enter a tag name"); return; }
    if (addressTags.some((t) => t.name.toLowerCase() === newTagName.toLowerCase())) { toast.error("Tag already exists"); return; }
    createTag(newTagName, newTagColor);
    setNewTagName(""); setNewTagColor(PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)]); setShowAddTag(false);
    toast.success(`Tag "${newTagName}" created`);
  };

  const exportAsPNG = async () => {
    try {
      const canvas = document.querySelector("canvas") as HTMLCanvasElement;
      if (!canvas) { toast.error("Canvas not found"); return; }
      const exportCanvas = document.createElement("canvas");
      exportCanvas.width = canvas.width; exportCanvas.height = canvas.height;
      const ctx = exportCanvas.getContext("2d");
      if (!ctx) { toast.error("Failed to create export canvas"); return; }
      ctx.drawImage(canvas, 0, 0);
      exportCanvas.toBlob((blob) => {
        if (!blob) { toast.error("Failed to create image"); return; }
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url; link.download = `cryptoviz-network-${selectedChain.symbol}-${new Date().toISOString().split('T')[0]}.png`;
        link.click(); URL.revokeObjectURL(url);
        toast.success("Network exported as PNG");
      }, "image/png");
    } catch (error) { toast.error("Failed to export PNG"); console.error(error); }
  };

  const exportAsCSV = async () => {
    try {
      const nodesHeader = "ID,Address,Label,Type,Balance,Transactions,Risk Score";
      const nodesRows = nodes.map(node => `${node.id},"${node.address}","${node.label || ''}",${node.type},${node.balance},${node.transactionCount},${node.riskScore}`).join("\n");
      const nodesCSV = `${nodesHeader}\n${nodesRows}`;
      const nodesBlob = new Blob([nodesCSV], { type: "text/csv;charset=utf-8;" });
      const nodesUrl = URL.createObjectURL(nodesBlob);
      const nodesLink = document.createElement("a");
      nodesLink.href = nodesUrl; nodesLink.download = `cryptoviz-nodes-${selectedChain.symbol}-${new Date().toISOString().split('T')[0]}.csv`;
      nodesLink.click(); URL.revokeObjectURL(nodesUrl);
      toast.success("Data exported as CSV", { description: `${nodes.length} nodes exported` });
    } catch (error) { toast.error("Failed to export CSV"); console.error(error); }
  };

  const exportAsJSON = async () => {
    try {
      const data = {
        chain: selectedChain, exportDate: new Date().toISOString(),
        nodes: nodes.map(node => ({ ...node, firstSeen: node.firstSeen.toISOString(), lastActive: node.lastActive.toISOString() })),
        links: links.map(link => ({ id: link.id, source: typeof link.source === 'string' ? link.source : link.source.id, target: typeof link.target === 'string' ? link.target : link.target.id, value: link.value, transactionCount: link.transactionCount, type: link.type, timestamp: link.timestamp.toISOString() })),
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url; link.download = `cryptoviz-data-${selectedChain.symbol}-${new Date().toISOString().split('T')[0]}.json`;
      link.click(); URL.revokeObjectURL(url);
      toast.success("Data exported as JSON");
    } catch (error) { toast.error("Failed to export JSON"); console.error(error); }
  };

  return (
    <div className="lg:hidden flex items-center gap-1">
      <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json" className="hidden" />

      <Button variant="ghost" size="icon" onClick={handleOpenSearch} className="text-gray-400 hover:text-[#00ff88] hover:bg-white/10 h-8 w-8">
        <Search className="w-4 h-4" />
      </Button>

      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex items-center gap-1 mr-1">
        <Button variant="ghost" size="icon" onClick={handleZoomOut} className="text-gray-400 hover:text-white hover:bg-white/10 h-8 w-8"><ZoomOut className="w-4 h-4" /></Button>
        <span className="text-xs text-gray-400 min-w-[40px] text-center">{Math.round(view.zoom * 100)}%</span>
        <Button variant="ghost" size="icon" onClick={handleZoomIn} className="text-gray-400 hover:text-white hover:bg-white/10 h-8 w-8"><ZoomIn className="w-4 h-4" /></Button>
      </motion.div>

      <Button variant="ghost" size="icon" onClick={() => setView({ showGrid: !view.showGrid })} className={`${view.showGrid ? 'text-[#00ff88]' : 'text-gray-400'} hover:text-white hover:bg-white/10 h-8 w-8`}><Grid className="w-4 h-4" /></Button>
      <Button variant="ghost" size="icon" onClick={() => setView({ showLabels: !view.showLabels })} className={`${view.showLabels ? 'text-[#00ff88]' : 'text-gray-400'} hover:text-white hover:bg-white/10 h-8 w-8`}><Tag className="w-4 h-4" /></Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button variant="ghost" size="icon" className="relative text-gray-400 hover:text-white hover:bg-white/10 h-8 w-8">
              <Menu className="w-5 h-5" />
              {watchlist.length > 0 && <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 text-[8px] rounded-full flex items-center justify-center bg-[#00ff88] text-black font-medium">{watchlist.length}</span>}
            </Button>
          </motion.div>
        </SheetTrigger>
        <SheetContent side="right" className="w-80 bg-[#0a0a0f] border-l border-white/10 p-0 overflow-hidden">
          <div className="flex flex-col h-full">
            <div className="p-4 border-b border-white/5 bg-gradient-to-r from-[#00ff88]/5 to-transparent">
              <div className="flex items-center justify-between">
                <SheetTitle className="text-lg font-semibold text-white flex items-center gap-2"><Settings className="w-5 h-5 text-[#00ff88]" />Settings</SheetTitle>
                <Link href="/" onClick={() => setOpen(false)}><Button variant="ghost" size="icon" className="text-gray-400 hover:text-[#00ff88] h-8 w-8"><Home className="w-4 h-4" /></Button></Link>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-custom p-4 space-y-6">
              {/* Quick Actions */}
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
                <label className="text-sm text-gray-400 mb-3 block">Quick Actions</label>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" onClick={handleOpenSearch} className="w-full justify-start gap-2 border-white/10 hover:bg-white/10 hover:border-[#00ff88]/50 text-gray-300"><Search className="w-4 h-4 text-[#00ff88]" />Search</Button>
                  <Button variant="outline" onClick={handleOpenWallet} className="w-full justify-start gap-2 border-white/10 hover:bg-white/10 hover:border-[#ff00ff]/50 text-gray-300"><Wallet className="w-4 h-4 text-[#ff00ff]" />Explore</Button>
                  <Button variant="outline" onClick={handleShowShortcuts} className="w-full justify-start gap-2 border-white/10 hover:bg-white/10 hover:border-[#00ffff]/50 text-gray-300"><Keyboard className="w-4 h-4 text-[#00ffff]" />Shortcuts</Button>
                </div>
              </motion.div>

              {/* Watchlist Section */}
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.07 }}>
                <label className="text-sm text-gray-400 mb-3 block flex items-center gap-2"><Star className="w-4 h-4" />Watchlist ({watchlist.length})</label>
                {showAddAddress ? (
                  <div className="space-y-2 mb-3">
                    <Input placeholder="0x... address" value={newAddress} onChange={(e) => setNewAddress(e.target.value)} className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 text-sm" />
                    <Input placeholder="Label (optional)" value={newLabel} onChange={(e) => setNewLabel(e.target.value)} className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 text-sm" />
                    <div className="flex gap-2">
                      <Button onClick={handleAddToWatchlist} size="sm" className="flex-1 bg-[#00ff88] text-black hover:bg-[#00cc66]">Add</Button>
                      <Button onClick={() => { setShowAddAddress(false); setNewAddress(""); setNewLabel(""); }} size="sm" variant="outline" className="border-white/10"><X className="w-4 h-4" /></Button>
                    </div>
                  </div>
                ) : (
                  <Button onClick={() => setShowAddAddress(true)} variant="outline" size="sm" className="w-full mb-3 border-dashed border-white/20 hover:bg-white/5 text-gray-400"><Plus className="w-4 h-4 mr-2" />Add Address</Button>
                )}
                <ScrollArea className="h-[120px]">
                  {watchlist.length === 0 ? (
                    <div className="text-center py-4 text-gray-500 text-xs">No addresses in watchlist</div>
                  ) : (
                    <div className="space-y-2">
                      {watchlist.slice(0, 5).map((entry) => (
                        <div key={entry.address} className="flex items-center justify-between p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-white truncate">{entry.label}</p>
                            <p className="text-[10px] text-gray-500 font-mono truncate">{shortenAddress(entry.address)}</p>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button size="icon" variant="ghost" onClick={() => updateWatchlistEntry(entry.address, { alertsEnabled: !entry.alertsEnabled })} className={`h-6 w-6 ${entry.alertsEnabled ? "text-[#00ff88]" : "text-gray-500"}`}>
                              {entry.alertsEnabled ? <Bell className="w-3 h-3" /> : <BellOff className="w-3 h-3" />}
                            </Button>
                            <Button size="icon" variant="ghost" onClick={() => removeFromWatchlist(entry.address)} className="h-6 w-6 text-gray-400 hover:text-red-400"><Trash2 className="w-3 h-3" /></Button>
                          </div>
                        </div>
                      ))}
                      {watchlist.length > 5 && <p className="text-center text-xs text-gray-500">+{watchlist.length - 5} more</p>}
                    </div>
                  )}
                </ScrollArea>
              </motion.div>

              {/* Tags Section */}
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
                <label className="text-sm text-gray-400 mb-3 block flex items-center gap-2"><Tag className="w-4 h-4" />Tags ({addressTags.length})</label>
                {showAddTag ? (
                  <div className="space-y-2 mb-3">
                    <Input placeholder="Tag name" value={newTagName} onChange={(e) => setNewTagName(e.target.value)} className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 text-sm" />
                    <div className="flex gap-1 flex-wrap">
                      {PRESET_COLORS.map((color) => (
                        <button key={color} onClick={() => setNewTagColor(color)} className={`w-5 h-5 rounded-full transition-all ${newTagColor === color ? "ring-2 ring-white ring-offset-1 ring-offset-[#0a0a0f] scale-110" : "hover:scale-110"}`} style={{ background: color }} />
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleCreateTag} size="sm" className="flex-1 bg-[#00ff88] text-black hover:bg-[#00cc66]">Create</Button>
                      <Button onClick={() => { setShowAddTag(false); setNewTagName(""); }} size="sm" variant="outline" className="border-white/10"><X className="w-4 h-4" /></Button>
                    </div>
                  </div>
                ) : (
                  <Button onClick={() => setShowAddTag(true)} variant="outline" size="sm" className="w-full mb-3 border-dashed border-white/20 hover:bg-white/5 text-gray-400"><Plus className="w-4 h-4 mr-2" />Create Tag</Button>
                )}
                <div className="flex flex-wrap gap-1.5">
                  {addressTags.map((tag) => (
                    <Badge key={tag.id} className="text-xs cursor-pointer hover:opacity-80 transition-opacity group" style={{ background: `${tag.color}20`, color: tag.color, borderColor: tag.color }} onClick={() => { deleteTag(tag.id); toast.success(`Tag "${tag.name}" deleted`); }}>
                      {tag.name}<X className="w-2.5 h-2.5 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </Badge>
                  ))}
                </div>
              </motion.div>

              {/* Workspace Section */}
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.09 }}>
                <label className="text-sm text-gray-400 mb-3 block flex items-center gap-2"><FolderOpen className="w-4 h-4" />Workspaces ({savedWorkspaces.length})</label>
                {showQuickSave ? (
                  <div className="flex gap-2 mb-3">
                    <Input placeholder="Workspace name" value={quickSaveName} onChange={(e) => setQuickSaveName(e.target.value)} className="flex-1 bg-white/5 border-white/10 text-white placeholder:text-gray-500 text-sm" onKeyDown={(e) => { if (e.key === "Enter") handleQuickSave(); }} />
                    <Button onClick={handleQuickSave} size="sm" className="bg-[#00ff88] text-black hover:bg-[#00cc66]"><Save className="w-4 h-4" /></Button>
                    <Button onClick={() => { setShowQuickSave(false); setQuickSaveName(""); }} size="sm" variant="outline" className="border-white/10"><X className="w-4 h-4" /></Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <Button onClick={() => setShowQuickSave(true)} variant="outline" size="sm" className="border-white/10 hover:bg-white/10 text-gray-300"><Save className="w-3 h-3 mr-1" />Save</Button>
                    <Button onClick={handleImportWorkspace} variant="outline" size="sm" className="border-white/10 hover:bg-white/10 text-gray-300"><Upload className="w-3 h-3 mr-1" />Import</Button>
                    <Button onClick={handleExportWorkspace} variant="outline" size="sm" className="border-white/10 hover:bg-white/10 text-gray-300"><Download className="w-3 h-3 mr-1" />Export</Button>
                  </div>
                )}
                <ScrollArea className="h-[100px]">
                  {savedWorkspaces.length === 0 ? (
                    <div className="text-center py-4 text-gray-500 text-xs">No saved workspaces</div>
                  ) : (
                    <div className="space-y-2">
                      {savedWorkspaces.map((workspace) => (
                        <div key={workspace.id} className="flex items-center justify-between p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-white truncate">{workspace.name}</p>
                            <p className="text-[10px] text-gray-500">{workspace.watchlist.length} addresses</p>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button size="sm" onClick={() => { loadWorkspace(workspace.id); toast.success(`Loaded "${workspace.name}"`); }} className="h-6 px-2 text-xs bg-[#00ff88]/20 text-[#00ff88] hover:bg-[#00ff88]/30">Load</Button>
                            <Button size="icon" variant="ghost" onClick={() => { deleteWorkspace(workspace.id); toast.success(`Deleted "${workspace.name}"`); }} className="h-6 w-6 text-gray-400 hover:text-red-400"><Trash2 className="w-3 h-3" /></Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </motion.div>

              {/* Export Options */}
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                <label className="text-sm text-gray-400 mb-3 block flex items-center gap-2"><Download className="w-4 h-4" />Export Network</label>
                <div className="grid grid-cols-3 gap-2">
                  <Button variant="outline" onClick={exportAsPNG} className="w-full flex-col gap-1 h-auto py-3 border-white/10 hover:bg-white/10 hover:border-[#00ff88]/50 text-gray-300"><Image className="w-5 h-5 text-[#00ff88]" /><span className="text-[10px]">PNG</span></Button>
                  <Button variant="outline" onClick={exportAsCSV} className="w-full flex-col gap-1 h-auto py-3 border-white/10 hover:bg-white/10 hover:border-[#ff00ff]/50 text-gray-300"><FileSpreadsheet className="w-5 h-5 text-[#ff00ff]" /><span className="text-[10px]">CSV</span></Button>
                  <Button variant="outline" onClick={exportAsJSON} className="w-full flex-col gap-1 h-auto py-3 border-white/10 hover:bg-white/10 hover:border-[#00ffff]/50 text-gray-300"><FileJson className="w-5 h-5 text-[#00ffff]" /><span className="text-[10px]">JSON</span></Button>
                </div>
              </motion.div>

              {/* Network Stats */}
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}>
                <label className="text-sm text-gray-400 mb-3 block">Network Stats</label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="glass rounded-xl p-3 text-center"><div className="text-xl font-bold text-[#00ff88]">{stats.totalNodes}</div><div className="text-xs text-gray-500">Nodes</div></div>
                  <div className="glass rounded-xl p-3 text-center"><div className="text-xl font-bold text-[#ff00ff]">{stats.totalLinks}</div><div className="text-xs text-gray-500">Links</div></div>
                </div>
              </motion.div>

              {/* Chain Selector */}
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                <label className="text-sm text-gray-400 mb-2 block">Network</label>
                <Select value={selectedChain.id} onValueChange={(id) => { const chain = chains.find(c => c.id === id); if (chain) setSelectedChain(chain); }}>
                  <SelectTrigger className="w-full bg-white/5 border-white/10 text-white"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-[#0a0a0f] border-white/10">
                    {chains.map(chain => (<SelectItem key={chain.id} value={chain.id} className="text-white hover:bg-white/10"><span className="flex items-center gap-2"><span style={{ color: chain.color }}>{chain.icon}</span>{chain.name}</span></SelectItem>))}
                  </SelectContent>
                </Select>
              </motion.div>

              {/* Zoom Controls */}
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                <label className="text-sm text-gray-400 mb-2 block">Zoom Controls</label>
                <div className="flex items-center justify-between glass rounded-xl p-3">
                  <Button variant="ghost" size="icon" onClick={handleZoomOut} className="text-gray-400 hover:text-white hover:bg-white/10 h-8 w-8"><ZoomOut className="w-4 h-4" /></Button>
                  <motion.div key={view.zoom} initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-lg font-semibold text-white">{Math.round(view.zoom * 100)}%</motion.div>
                  <Button variant="ghost" size="icon" onClick={handleZoomIn} className="text-gray-400 hover:text-white hover:bg-white/10 h-8 w-8"><ZoomIn className="w-4 h-4" /></Button>
                </div>
                <Button variant="outline" onClick={handleReset} className="w-full mt-2 justify-center gap-2 border-white/10 hover:bg-white/10 text-gray-300"><RotateCcw className="w-4 h-4" />Reset View</Button>
              </motion.div>

              {/* Theme Selector */}
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
                <label className="text-sm text-gray-400 mb-2 block flex items-center gap-2"><Palette className="w-4 h-4" />Theme</label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.values(themes).map((t) => (
                    <Button key={t.name} variant="outline" onClick={() => setTheme(t.name as ThemeName)} className={`w-full justify-start gap-2 border-white/10 hover:bg-white/10 text-gray-300 ${theme === t.name ? 'border-[#00ff88] bg-[#00ff88]/10' : ''}`}>
                      <span className="w-3 h-3 rounded-full" style={{ background: t.accentColor }} />
                      <span className="text-xs">{t.label}</span>
                      {theme === t.name && <ChevronRight className="w-3 h-3 ml-auto text-[#00ff88]" />}
                    </Button>
                  ))}
                </div>
              </motion.div>

              {/* View Options */}
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
                <label className="text-sm text-gray-400 mb-2 block">View Options</label>
                <div className="space-y-2">
                  <Button variant="outline" onClick={() => setView({ showGrid: !view.showGrid })} className={`w-full justify-start gap-2 border-white/10 hover:bg-white/10 ${view.showGrid ? 'border-[#00ff88] bg-[#00ff88]/10 text-[#00ff88]' : 'text-gray-300'}`}><Grid className="w-4 h-4" />Show Grid{view.showGrid && <span className="ml-auto text-xs">ON</span>}</Button>
                  <Button variant="outline" onClick={() => setView({ showLabels: !view.showLabels })} className={`w-full justify-start gap-2 border-white/10 hover:bg-white/10 ${view.showLabels ? 'border-[#00ff88] bg-[#00ff88]/10 text-[#00ff88]' : 'text-gray-300'}`}><Tag className="w-4 h-4" />Show Labels{view.showLabels && <span className="ml-auto text-xs">ON</span>}</Button>
                </div>
              </motion.div>
            </div>

            <div className="p-4 border-t border-white/5 bg-white/[0.02]">
              <Button onClick={() => setOpen(false)} className="w-full bg-[#00ff88] hover:bg-[#00cc6a] text-black font-semibold">Done</Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
