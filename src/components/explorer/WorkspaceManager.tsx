"use client";

import { useState, useRef } from "react";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  FolderOpen,
  Save,
  Upload,
  Download,
  Trash2,
  Clock,
  FileJson,
  Check,
} from "lucide-react";
import { toast } from "sonner";

export function WorkspaceManager() {
  const {
    savedWorkspaces,
    saveWorkspace,
    loadWorkspace,
    deleteWorkspace,
    exportWorkspace,
    importWorkspace,
  } = useCryptoVizStore();

  const [isOpen, setIsOpen] = useState(false);
  const [workspaceName, setWorkspaceName] = useState("");
  const [showSaveInput, setShowSaveInput] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSave = () => {
    if (!workspaceName.trim()) {
      toast.error("Please enter a workspace name");
      return;
    }
    saveWorkspace(workspaceName);
    setWorkspaceName("");
    setShowSaveInput(false);
    toast.success(`Workspace "${workspaceName}" saved`);
  };

  const handleLoad = (id: string, name: string) => {
    loadWorkspace(id);
    toast.success(`Workspace "${name}" loaded`);
    setIsOpen(false);
  };

  const handleDelete = (id: string, name: string) => {
    deleteWorkspace(id);
    toast.success(`Workspace "${name}" deleted`);
  };

  const handleExport = () => {
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

  const handleImport = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const success = importWorkspace(content);
      if (success) {
        toast.success("Workspace imported successfully");
        setIsOpen(false);
      } else {
        toast.error("Failed to import workspace. Invalid file format.");
      }
    };
    reader.readAsText(file);
    event.target.value = "";
  };

  return (
    <>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".json"
        className="hidden"
      />

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="text-gray-400 hover:text-white hover:bg-white/10"
            title="Workspace Manager"
          >
            <FolderOpen className="w-4 h-4" />
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-lg glass border-white/10">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              <FolderOpen className="w-5 h-5 text-[#00ff88]" />
              Workspace Manager
            </DialogTitle>
          </DialogHeader>

          {/* Actions */}
          <div className="flex gap-2">
            {showSaveInput ? (
              <div className="flex gap-2 flex-1">
                <Input
                  placeholder="Workspace name..."
                  value={workspaceName}
                  onChange={(e) => setWorkspaceName(e.target.value)}
                  className="flex-1 bg-white/5 border-white/10 text-white placeholder:text-gray-500"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSave();
                    if (e.key === "Escape") setShowSaveInput(false);
                  }}
                />
                <Button onClick={handleSave} className="bg-[#00ff88] text-black hover:bg-[#00cc66]">
                  <Check className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <>
                <Button
                  onClick={() => setShowSaveInput(true)}
                  variant="outline"
                  className="flex-1 border-white/10 hover:bg-white/10"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save Current
                </Button>
                <Button
                  onClick={handleImport}
                  variant="outline"
                  className="flex-1 border-white/10 hover:bg-white/10"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Import
                </Button>
                <Button
                  onClick={handleExport}
                  variant="outline"
                  className="flex-1 border-white/10 hover:bg-white/10"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
              </>
            )}
          </div>

          <Separator className="bg-white/10" />

          {/* Saved workspaces list */}
          <div>
            <h4 className="text-sm font-medium text-gray-400 mb-3">
              Saved Workspaces ({savedWorkspaces.length})
            </h4>
            <ScrollArea className="h-[300px] pr-4">
              {savedWorkspaces.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                  <FileJson className="w-12 h-12 mb-4 opacity-30" />
                  <p className="text-sm">No saved workspaces</p>
                  <p className="text-xs mt-1">
                    Save your current workspace to access it later
                  </p>
                </div>
              ) : (
                <AnimatePresence mode="popLayout">
                  {savedWorkspaces.map((workspace, index) => (
                    <motion.div
                      key={workspace.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -50 }}
                      transition={{ delay: index * 0.05 }}
                      className="group p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors mb-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h5 className="font-medium text-white">
                            {workspace.name}
                          </h5>
                          <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {new Date(workspace.createdAt).toLocaleDateString()}
                            </span>
                            <span>
                              {workspace.watchlist.length} addresses
                            </span>
                            <span>
                              {workspace.labels.length} labels
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            onClick={() => handleLoad(workspace.id, workspace.name)}
                            className="bg-[#00ff88]/20 text-[#00ff88] hover:bg-[#00ff88]/30"
                          >
                            Load
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleDelete(workspace.id, workspace.name)}
                            className="h-8 w-8 text-gray-400 hover:text-red-400"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Quick save popover for TopNav
export function QuickSaveButton() {
  const { saveWorkspace } = useCryptoVizStore();
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");

  const handleSave = () => {
    if (!name.trim()) {
      toast.error("Please enter a name");
      return;
    }
    saveWorkspace(name);
    setName("");
    setIsOpen(false);
    toast.success(`Workspace "${name}" saved`);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="text-gray-400 hover:text-white hover:bg-white/10"
          title="Quick Save"
        >
          <Save className="w-4 h-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 glass border-white/10" align="end">
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-white">Quick Save</h4>
          <Input
            placeholder="Workspace name..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="bg-white/5 border-white/10 text-white placeholder:text-gray-500"
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSave();
            }}
          />
          <Button
            onClick={handleSave}
            className="w-full bg-[#00ff88] text-black hover:bg-[#00cc66]"
          >
            Save Workspace
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
