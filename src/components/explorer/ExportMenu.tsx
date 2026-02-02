"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCryptoVizStore, themes } from "@/lib/store";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  Download,
  Image,
  FileSpreadsheet,
  Loader2,
  FileCode,
  Film,
  Settings2,
  CheckCircle,
  XCircle,
  Play,
  Square,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

// GIF recording state
interface GifRecordingState {
  isRecording: boolean;
  isPaused: boolean;
  frames: ImageData[];
  frameCount: number;
  startTime: number;
  duration: number;
  fps: number;
  progress: number;
}

// Export options
interface ExportOptions {
  format: 'png' | 'gif' | 'svg' | 'csv' | 'json';
  resolution: 1 | 2 | 4;
  transparentBackground: boolean;
  includeLabels: boolean;
  gifDuration: number;
  gifFps: number;
  gifQuality: number;
}

const defaultExportOptions: ExportOptions = {
  format: 'png',
  resolution: 1,
  transparentBackground: false,
  includeLabels: true,
  gifDuration: 3,
  gifFps: 15,
  gifQuality: 10,
};

export function ExportMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [options, setOptions] = useState<ExportOptions>(defaultExportOptions);
  const [gifRecording, setGifRecording] = useState<GifRecordingState | null>(null);

  const { nodes, links, selectedChain, view, theme } = useCryptoVizStore();
  const gifWorkerRef = useRef<Worker | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    const workerRef = gifWorkerRef.current;
    return () => {
      if (workerRef) {
        workerRef.terminate();
      }
    };
  }, []);

  const updateOptions = (updates: Partial<ExportOptions>) => {
    setOptions(prev => ({ ...prev, ...updates }));
  };

  // Get canvas element
  const getCanvas = useCallback((): HTMLCanvasElement | null => {
    return document.querySelector("canvas") as HTMLCanvasElement;
  }, []);

  // Create high-resolution canvas copy
  const createScaledCanvas = useCallback((canvas: HTMLCanvasElement, scale: number, transparent: boolean): HTMLCanvasElement => {
    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = canvas.width * scale;
    exportCanvas.height = canvas.height * scale;
    const ctx = exportCanvas.getContext("2d");

    if (!ctx) throw new Error("Failed to create export canvas context");

    // Set background
    if (!transparent) {
      const themeConfig = themes[theme];
      ctx.fillStyle = themeConfig.background || "#0a0a0f";
      ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
    }

    // Scale and draw
    ctx.scale(scale, scale);
    ctx.drawImage(canvas, 0, 0);

    return exportCanvas;
  }, [theme]);

  // Export as PNG
  const exportAsPNG = useCallback(async () => {
    setIsExporting(true);
    setExportProgress(10);

    try {
      const canvas = getCanvas();
      if (!canvas) {
        toast.error("Canvas not found");
        return;
      }

      setExportProgress(30);
      const exportCanvas = createScaledCanvas(canvas, options.resolution, options.transparentBackground);

      setExportProgress(60);

      exportCanvas.toBlob((blob) => {
        if (!blob) {
          toast.error("Failed to create image");
          return;
        }

        setExportProgress(90);

        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        const scale = options.resolution > 1 ? `@${options.resolution}x` : '';
        link.download = `cryptoviz-network-${selectedChain.symbol}-${new Date().toISOString().split('T')[0]}${scale}.png`;
        link.click();
        URL.revokeObjectURL(url);

        setExportProgress(100);

        const width = Math.round(exportCanvas.width / window.devicePixelRatio);
        const height = Math.round(exportCanvas.height / window.devicePixelRatio);

        toast.success("Network exported as PNG", {
          description: `${width}x${height} image saved (${options.resolution}x resolution)`,
        });

        setIsOpen(false);
      }, "image/png");
    } catch (error) {
      toast.error("Failed to export PNG");
      console.error(error);
    } finally {
      setIsExporting(false);
      setExportProgress(0);
    }
  }, [getCanvas, createScaledCanvas, options.resolution, options.transparentBackground, selectedChain.symbol]);

  // Export as animated GIF
  const exportAsGIF = useCallback(async () => {
    setIsExporting(true);
    setExportProgress(0);

    try {
      const canvas = getCanvas();
      if (!canvas) {
        toast.error("Canvas not found");
        return;
      }

      // Dynamically import gif.js
      const GIF = (await import('gif.js-upgrade')).default;

      // Create GIF encoder
      const gif = new GIF({
        workers: 2,
        quality: options.gifQuality,
        width: canvas.width,
        height: canvas.height,
        workerScript: '/gif.worker.js',
        background: '#0a0a0f',
        transparent: options.transparentBackground ? 0x000000 : undefined,
      });

      // Calculate frame parameters
      const totalFrames = Math.round(options.gifDuration * options.gifFps);
      const frameDelay = 1000 / options.gifFps;

      toast.info("Recording animation...", {
        description: `Capturing ${totalFrames} frames at ${options.gifFps} FPS`,
      });

      // Capture frames
      let framesCaptured = 0;

      const captureFrame = () => {
        if (framesCaptured >= totalFrames) {
          // All frames captured, render GIF
          setExportProgress(50);
          toast.info("Encoding GIF...", { description: "This may take a moment" });

          gif.on('progress', (p: number) => {
            setExportProgress(50 + Math.round(p * 50));
          });

          gif.on('finished', (blob: Blob) => {
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `cryptoviz-animation-${selectedChain.symbol}-${new Date().toISOString().split('T')[0]}.gif`;
            link.click();
            URL.revokeObjectURL(url);

            toast.success("Animation exported as GIF", {
              description: `${options.gifDuration}s animation at ${options.gifFps} FPS`,
            });

            setIsExporting(false);
            setExportProgress(0);
            setIsOpen(false);
          });

          gif.render();
          return;
        }

        // Add current frame
        gif.addFrame(canvas, { delay: frameDelay, copy: true });
        framesCaptured++;
        setExportProgress(Math.round((framesCaptured / totalFrames) * 50));

        // Schedule next frame capture
        requestAnimationFrame(captureFrame);
      };

      // Start capturing
      requestAnimationFrame(captureFrame);

    } catch (error) {
      toast.error("Failed to export GIF");
      console.error(error);
      setIsExporting(false);
      setExportProgress(0);
    }
  }, [getCanvas, options.gifDuration, options.gifFps, options.gifQuality, options.transparentBackground, selectedChain.symbol]);

  // Export as SVG
  const exportAsSVG = useCallback(async () => {
    setIsExporting(true);
    setExportProgress(20);

    try {
      const { themes } = await import("@/lib/store");
      const themeConfig = themes[theme];

      const width = 1920 * options.resolution;
      const height = 1080 * options.resolution;

      const getNodeRadius = (node: typeof nodes[0]) => {
        const baseSize = 8;
        const balanceScale = Math.min(Math.log10(node.balance + 1) * 3, 20);
        return (baseSize + balanceScale) * options.resolution;
      };

      setExportProgress(40);

      let svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <style>
      .link { stroke: ${themeConfig.linkColor}; stroke-width: ${2 * options.resolution}; fill: none; }
      .node-label { font-family: sans-serif; font-size: ${10 * options.resolution}px; fill: ${themeConfig.textColor}; text-anchor: middle; }
    </style>
  </defs>
  <rect width="100%" height="100%" fill="${options.transparentBackground ? 'none' : themeConfig.background}"/>
  <g transform="translate(${width/2 + view.panX * options.resolution}, ${height/2 + view.panY * options.resolution}) scale(${view.zoom * options.resolution})">`;

      setExportProgress(60);

      // Draw links
      svgContent += '\n    <!-- Links -->';
      for (const link of links) {
        const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
        const targetId = typeof link.target === 'string' ? link.target : link.target.id;
        const sourceNode = nodes.find(n => n.id === sourceId);
        const targetNode = nodes.find(n => n.id === targetId);
        if (sourceNode?.x && sourceNode?.y && targetNode?.x && targetNode?.y) {
          svgContent += `\n    <line class="link" x1="${sourceNode.x}" y1="${sourceNode.y}" x2="${targetNode.x}" y2="${targetNode.y}" stroke-width="${Math.min(link.value / 20, 3) * options.resolution}"/>`;
        }
      }

      setExportProgress(80);

      // Draw nodes
      svgContent += '\n    <!-- Nodes -->';
      for (const node of nodes) {
        if (!node.x || !node.y) continue;
        const radius = getNodeRadius(node);
        const color = themeConfig.nodeColors[node.type];

        svgContent += `\n    <circle cx="${node.x}" cy="${node.y}" r="${radius + 4}" fill="${color}" opacity="0.3"/>`;
        svgContent += `\n    <circle cx="${node.x}" cy="${node.y}" r="${radius}" fill="${color}"/>`;
        svgContent += `\n    <circle cx="${node.x - radius * 0.3}" cy="${node.y - radius * 0.3}" r="${radius * 0.3}" fill="rgba(255,255,255,0.3)"/>`;

        if (node.riskScore > 70) {
          svgContent += `\n    <circle cx="${node.x}" cy="${node.y}" r="${radius + 4}" fill="none" stroke="#ff4444" stroke-width="${2 * options.resolution}"/>`;
        }

        if (options.includeLabels) {
          const label = node.label || `${node.address.slice(0, 6)}...${node.address.slice(-4)}`;
          svgContent += `\n    <text class="node-label" x="${node.x}" y="${node.y + radius + 14 * options.resolution}">${label}</text>`;
        }
      }

      svgContent += '\n  </g>\n</svg>';

      setExportProgress(90);

      const blob = new Blob([svgContent], { type: "image/svg+xml" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `cryptoviz-network-${selectedChain.symbol}-${new Date().toISOString().split('T')[0]}.svg`;
      link.click();
      URL.revokeObjectURL(url);

      setExportProgress(100);

      toast.success("Network exported as SVG", {
        description: `Vector graphic with ${nodes.length} nodes`,
      });

      setIsOpen(false);
    } catch (error) {
      toast.error("Failed to export SVG");
      console.error(error);
    } finally {
      setIsExporting(false);
      setExportProgress(0);
    }
  }, [theme, nodes, links, view.panX, view.panY, view.zoom, options.resolution, options.transparentBackground, options.includeLabels, selectedChain.symbol]);

  // Export as CSV
  const exportAsCSV = useCallback(async () => {
    setIsExporting(true);
    setExportProgress(20);

    try {
      const nodesHeader = "ID,Address,Label,Type,Balance,Transactions,Risk Score,First Seen,Last Active";
      const nodesRows = nodes.map(node =>
        `${node.id},"${node.address}","${node.label || ''}",${node.type},${node.balance},${node.transactionCount},${node.riskScore},"${node.firstSeen.toISOString()}","${node.lastActive.toISOString()}"`
      ).join("\n");

      const nodesCSV = `${nodesHeader}\n${nodesRows}`;

      setExportProgress(50);

      const linksHeader = "ID,Source,Target,Value,Transaction Count,Type,Timestamp";
      const linksRows = links.map(link => {
        const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
        const targetId = typeof link.target === 'string' ? link.target : link.target.id;
        return `${link.id},"${sourceId}","${targetId}",${link.value},${link.transactionCount},${link.type},"${link.timestamp.toISOString()}"`;
      }).join("\n");

      const linksCSV = `${linksHeader}\n${linksRows}`;

      setExportProgress(80);

      // Download nodes CSV
      const nodesBlob = new Blob([nodesCSV], { type: "text/csv;charset=utf-8;" });
      const nodesUrl = URL.createObjectURL(nodesBlob);
      const nodesLink = document.createElement("a");
      nodesLink.href = nodesUrl;
      nodesLink.download = `cryptoviz-nodes-${selectedChain.symbol}-${new Date().toISOString().split('T')[0]}.csv`;
      nodesLink.click();
      URL.revokeObjectURL(nodesUrl);

      // Download links CSV
      const linksBlob = new Blob([linksCSV], { type: "text/csv;charset=utf-8;" });
      const linksUrl = URL.createObjectURL(linksBlob);
      const linksLink = document.createElement("a");
      linksLink.href = linksUrl;
      linksLink.download = `cryptoviz-links-${selectedChain.symbol}-${new Date().toISOString().split('T')[0]}.csv`;
      linksLink.click();
      URL.revokeObjectURL(linksUrl);

      setExportProgress(100);

      toast.success("Data exported as CSV", {
        description: `${nodes.length} nodes and ${links.length} links exported`,
      });

      setIsOpen(false);
    } catch (error) {
      toast.error("Failed to export CSV");
      console.error(error);
    } finally {
      setIsExporting(false);
      setExportProgress(0);
    }
  }, [nodes, links, selectedChain.symbol]);

  // Export as JSON
  const exportAsJSON = useCallback(async () => {
    setIsExporting(true);
    setExportProgress(30);

    try {
      const data = {
        chain: selectedChain,
        exportDate: new Date().toISOString(),
        nodes: nodes.map(node => ({
          ...node,
          firstSeen: node.firstSeen.toISOString(),
          lastActive: node.lastActive.toISOString(),
        })),
        links: links.map(link => ({
          id: link.id,
          source: typeof link.source === 'string' ? link.source : link.source.id,
          target: typeof link.target === 'string' ? link.target : link.target.id,
          value: link.value,
          transactionCount: link.transactionCount,
          type: link.type,
          timestamp: link.timestamp.toISOString(),
        })),
      };

      setExportProgress(70);

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `cryptoviz-data-${selectedChain.symbol}-${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      URL.revokeObjectURL(url);

      setExportProgress(100);

      toast.success("Data exported as JSON", {
        description: `${nodes.length} nodes and ${links.length} links exported`,
      });

      setIsOpen(false);
    } catch (error) {
      toast.error("Failed to export JSON");
      console.error(error);
    } finally {
      setIsExporting(false);
      setExportProgress(0);
    }
  }, [nodes, links, selectedChain]);

  // Handle export based on selected format
  const handleExport = useCallback(() => {
    switch (options.format) {
      case 'png':
        exportAsPNG();
        break;
      case 'gif':
        exportAsGIF();
        break;
      case 'svg':
        exportAsSVG();
        break;
      case 'csv':
        exportAsCSV();
        break;
      case 'json':
        exportAsJSON();
        break;
    }
  }, [options.format, exportAsPNG, exportAsGIF, exportAsSVG, exportAsCSV, exportAsJSON]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Button
            variant="outline"
            size="sm"
            className="border-white/10 text-white hover:bg-white/10 hover:border-[#00ff88]/50 transition-all"
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </motion.div>
      </DialogTrigger>

      <DialogContent className="bg-[#0a0a0f] border-white/10 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-emerald-400" />
            Export Visualization
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Save your network visualization in various formats
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Format Selection */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-300">Format</label>
            <div className="grid grid-cols-5 gap-2">
              {[
                { value: 'png', label: 'PNG', icon: <Image className="w-4 h-4" />, color: 'emerald' },
                { value: 'gif', label: 'GIF', icon: <Film className="w-4 h-4" />, color: 'purple' },
                { value: 'svg', label: 'SVG', icon: <FileCode className="w-4 h-4" />, color: 'yellow' },
                { value: 'csv', label: 'CSV', icon: <FileSpreadsheet className="w-4 h-4" />, color: 'pink' },
                { value: 'json', label: 'JSON', icon: <Download className="w-4 h-4" />, color: 'cyan' },
              ].map((format) => (
                <button
                  key={format.value}
                  onClick={() => updateOptions({ format: format.value as ExportOptions['format'] })}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all ${
                    options.format === format.value
                      ? `bg-${format.color}-500/20 border-2 border-${format.color}-500/50 text-${format.color}-400`
                      : 'bg-white/5 border-2 border-transparent text-gray-400 hover:bg-white/10 hover:text-white'
                  }`}
                  style={{
                    backgroundColor: options.format === format.value ? `var(--${format.color}-500, #10b981)20` : undefined,
                    borderColor: options.format === format.value ? `var(--${format.color}-500, #10b981)80` : 'transparent',
                  }}
                >
                  {format.icon}
                  <span className="text-xs font-medium">{format.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* PNG/SVG Options */}
          {(options.format === 'png' || options.format === 'svg') && (
            <div className="space-y-4 p-4 bg-white/5 rounded-xl">
              <h4 className="text-sm font-medium text-gray-300 flex items-center gap-2">
                <Settings2 className="w-4 h-4 text-emerald-400" />
                Image Options
              </h4>

              {/* Resolution */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-gray-400">Resolution</label>
                  <span className="text-xs text-emerald-400 font-medium">{options.resolution}x</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[1, 2, 4].map((res) => (
                    <button
                      key={res}
                      onClick={() => updateOptions({ resolution: res as 1 | 2 | 4 })}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                        options.resolution === res
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50'
                          : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-transparent'
                      }`}
                    >
                      {res}x
                      <span className="block text-[10px] opacity-60">
                        {res === 1 ? 'Standard' : res === 2 ? 'High' : 'Ultra'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Transparent Background */}
              <div className="flex items-center justify-between py-2">
                <label className="text-xs text-gray-400">Transparent Background</label>
                <Switch
                  checked={options.transparentBackground}
                  onCheckedChange={(checked) => updateOptions({ transparentBackground: checked })}
                />
              </div>

              {/* Include Labels (SVG only) */}
              {options.format === 'svg' && (
                <div className="flex items-center justify-between py-2">
                  <label className="text-xs text-gray-400">Include Labels</label>
                  <Switch
                    checked={options.includeLabels}
                    onCheckedChange={(checked) => updateOptions({ includeLabels: checked })}
                  />
                </div>
              )}
            </div>
          )}

          {/* GIF Options */}
          {options.format === 'gif' && (
            <div className="space-y-4 p-4 bg-white/5 rounded-xl">
              <h4 className="text-sm font-medium text-gray-300 flex items-center gap-2">
                <Film className="w-4 h-4 text-purple-400" />
                Animation Options
              </h4>

              {/* Duration */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-gray-400">Duration</label>
                  <span className="text-xs text-purple-400 font-medium">{options.gifDuration}s</span>
                </div>
                <Slider
                  value={[options.gifDuration]}
                  onValueChange={([value]) => updateOptions({ gifDuration: value })}
                  min={1}
                  max={10}
                  step={1}
                  className="w-full"
                />
              </div>

              {/* FPS */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-gray-400">Frame Rate</label>
                  <span className="text-xs text-purple-400 font-medium">{options.gifFps} FPS</span>
                </div>
                <Slider
                  value={[options.gifFps]}
                  onValueChange={([value]) => updateOptions({ gifFps: value })}
                  min={5}
                  max={30}
                  step={5}
                  className="w-full"
                />
              </div>

              {/* Quality */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-gray-400">Quality</label>
                  <span className="text-xs text-purple-400 font-medium">
                    {options.gifQuality <= 5 ? 'High' : options.gifQuality <= 10 ? 'Medium' : 'Low'}
                  </span>
                </div>
                <Slider
                  value={[20 - options.gifQuality]}
                  onValueChange={([value]) => updateOptions({ gifQuality: 20 - value })}
                  min={1}
                  max={19}
                  step={1}
                  className="w-full"
                />
                <p className="text-[10px] text-gray-500">
                  Higher quality = larger file size
                </p>
              </div>

              {/* Transparent Background */}
              <div className="flex items-center justify-between py-2">
                <label className="text-xs text-gray-400">Transparent Background</label>
                <Switch
                  checked={options.transparentBackground}
                  onCheckedChange={(checked) => updateOptions({ transparentBackground: checked })}
                />
              </div>

              <div className="pt-2 border-t border-white/10">
                <p className="text-[10px] text-gray-500">
                  The GIF will capture {Math.round(options.gifDuration * options.gifFps)} frames of the current animation state.
                  Click "Reset Layout" before exporting to capture the bloom animation.
                </p>
              </div>
            </div>
          )}

          {/* Data Options Info */}
          {(options.format === 'csv' || options.format === 'json') && (
            <div className="p-4 bg-white/5 rounded-xl">
              <h4 className="text-sm font-medium text-gray-300 flex items-center gap-2 mb-3">
                <FileSpreadsheet className="w-4 h-4 text-pink-400" />
                Data Export
              </h4>
              <div className="space-y-2 text-xs text-gray-400">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-3 h-3 text-emerald-400" />
                  <span>{nodes.length} nodes with full details</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-3 h-3 text-emerald-400" />
                  <span>{links.length} links with transaction data</span>
                </div>
                {options.format === 'csv' && (
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-3 h-3 text-emerald-400" />
                    <span>Separate files for nodes and links</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Progress Bar */}
          {isExporting && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400">Exporting...</span>
                <span className="text-emerald-400 font-medium">{exportProgress}%</span>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${exportProgress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>
          )}

          {/* Export Button */}
          <Button
            onClick={handleExport}
            disabled={isExporting}
            className="w-full bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white font-medium"
          >
            {isExporting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Export as {options.format.toUpperCase()}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
