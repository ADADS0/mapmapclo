"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { useCryptoVizStore } from "@/lib/store";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Settings2, Sparkles, Zap, Wind, Waves, Circle, GitBranch, Flower2, Target, Network, ArrowRight, MoveRight, Minus, Triangle, ChevronRight, Dot, Palette, Spline } from "lucide-react";
import type { EasingType, LayoutAlgorithm, AnimationConfig, ArrowConfig, ArrowStyle, ArrowCurveStyle } from "@/types";

const easingOptions: { value: EasingType; label: string; icon: React.ReactNode; description: string }[] = [
  { value: 'none', label: 'None', icon: <Zap className="w-4 h-4" />, description: 'Instant stop, no animation' },
  { value: 'easeOut', label: 'Ease Out', icon: <Wind className="w-4 h-4" />, description: 'Smooth deceleration' },
  { value: 'spring', label: 'Spring', icon: <Sparkles className="w-4 h-4" />, description: 'Bouncy spring physics' },
  { value: 'elastic', label: 'Elastic', icon: <Waves className="w-4 h-4" />, description: 'Elastic overshoot effect' },
];

const layoutOptions: { value: LayoutAlgorithm; label: string; icon: React.ReactNode; description: string }[] = [
  { value: 'bubblemaps', label: 'Bubblemaps', icon: <Sparkles className="w-4 h-4" />, description: 'Radial clusters with flow (like Bubblemaps.io)' },
  { value: 'flower', label: 'Flower', icon: <Flower2 className="w-4 h-4" />, description: 'Sunflower spiral (Vogel)' },
  { value: 'circular', label: 'Circular', icon: <Circle className="w-4 h-4" />, description: 'Concentric circles' },
  { value: 'radial', label: 'Radial', icon: <Target className="w-4 h-4" />, description: 'Radial tree layout' },
  { value: 'hierarchical', label: 'Hierarchical', icon: <GitBranch className="w-4 h-4" />, description: 'Top-down hierarchy' },
  { value: 'force', label: 'Force', icon: <Network className="w-4 h-4" />, description: 'Force-directed graph' },
];

// Arrow style options
const arrowStyleOptions: { value: ArrowStyle; label: string; icon: React.ReactNode }[] = [
  { value: 'triangle', label: 'Triangle', icon: <Triangle className="w-3 h-3" /> },
  { value: 'chevron', label: 'Chevron', icon: <ChevronRight className="w-3 h-3" /> },
  { value: 'line', label: 'Line', icon: <Minus className="w-3 h-3" /> },
  { value: 'dot', label: 'Dot', icon: <Dot className="w-3 h-3" /> },
  { value: 'none', label: 'None', icon: <Circle className="w-3 h-3 opacity-30" /> },
];

// Arrow curve style options
const arrowCurveOptions: { value: ArrowCurveStyle; label: string; description: string }[] = [
  { value: 'straight', label: 'Straight', description: 'Direct lines' },
  { value: 'curved', label: 'Curved', description: 'Bezier curves' },
  { value: 'arc', label: 'Arc', description: 'Bow-shaped arcs' },
];

// Color mode options
const colorModeOptions: { value: 'accent' | 'gradient' | 'source' | 'target'; label: string; description: string }[] = [
  { value: 'accent', label: 'Accent', description: 'Theme accent color' },
  { value: 'gradient', label: 'Gradient', description: 'Source to target gradient' },
  { value: 'source', label: 'Source', description: 'Source node color' },
  { value: 'target', label: 'Target', description: 'Target node color' },
];

// Animation presets
interface AnimationPreset {
  name: string;
  description: string;
  config: Partial<AnimationConfig>;
}

const animationPresets: AnimationPreset[] = [
  {
    name: 'Fast',
    description: 'Quick and snappy',
    config: {
      enabled: true,
      bloomSpeed: 2.5,
      animationDuration: 200,
      easingType: 'easeOut',
      springStiffness: 0.25,
      springDamping: 0.7,
    },
  },
  {
    name: 'Normal',
    description: 'Balanced speed',
    config: {
      enabled: true,
      bloomSpeed: 1,
      animationDuration: 400,
      easingType: 'spring',
      springStiffness: 0.15,
      springDamping: 0.85,
    },
  },
  {
    name: 'Slow',
    description: 'Smooth and relaxed',
    config: {
      enabled: true,
      bloomSpeed: 0.6,
      animationDuration: 700,
      easingType: 'easeOut',
      springStiffness: 0.1,
      springDamping: 0.9,
    },
  },
  {
    name: 'Ultra-Smooth',
    description: 'Maximum fluidity',
    config: {
      enabled: true,
      bloomSpeed: 0.4,
      animationDuration: 1000,
      easingType: 'elastic',
      springStiffness: 0.08,
      springDamping: 0.92,
    },
  },
];

// Default arrow config helper
// ULTRA-THIN arrows like Bubblemaps.io with rubber-band stretch effect
const getDefaultArrowConfig = (): ArrowConfig => ({
  headSize: 2.5,  // Small elegant arrowheads
  headAngle: 10,  // Narrow angle for sleek look
  lineWidth: 0.4, // Ultra-thin base width
  showFlowAnimation: true,
  flowSpeed: 0.4,
  flowOpacity: 0.15, // Subtle flow
  style: 'triangle',
  curveStyle: 'straight',
  showGlow: false,
  glowIntensity: 0.2,
  tapered: false,
  valueBasedOpacity: false,
  colorMode: 'accent',
});

export function AnimationSettings() {
  const [isOpen, setIsOpen] = useState(false);
  const { view, setView } = useCryptoVizStore();
  const animConfig = view.animationConfig;

  const updateAnimConfig = (updates: Partial<typeof animConfig>) => {
    setView({
      animationConfig: { ...animConfig, ...updates },
    });
  };

  const applyPreset = (preset: AnimationPreset) => {
    updateAnimConfig(preset.config);
  };

  // Get current preset name if config matches
  const getCurrentPresetName = () => {
    for (const preset of animationPresets) {
      if (
        preset.config.bloomSpeed === animConfig.bloomSpeed &&
        preset.config.animationDuration === animConfig.animationDuration &&
        preset.config.easingType === animConfig.easingType
      ) {
        return preset.name;
      }
    }
    return 'Custom';
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-lg glass hover:bg-white/10 transition-colors"
        title="Animation Settings"
      >
        <Settings2 className="w-4 h-4 text-gray-300" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />

            {/* Panel */}
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-full mt-2 z-50 w-80 glass rounded-xl p-4 shadow-2xl border border-white/10 max-h-[80vh] overflow-y-auto"
            >
              <div className="space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                    Animation Settings
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">Enabled</span>
                    <Switch
                      checked={animConfig.enabled}
                      onCheckedChange={(checked) => updateAnimConfig({ enabled: checked })}
                    />
                  </div>
                </div>

                {/* Animation Presets */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-gray-400">Preset</label>
                    <span className="text-xs text-emerald-400">{getCurrentPresetName()}</span>
                  </div>
                  <div className="grid grid-cols-4 gap-1">
                    {animationPresets.map((preset) => (
                      <button
                        key={preset.name}
                        onClick={() => applyPreset(preset)}
                        className={`px-2 py-1.5 text-xs rounded-lg transition-all ${
                          getCurrentPresetName() === preset.name
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50'
                            : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-transparent'
                        }`}
                        title={preset.description}
                        disabled={!animConfig.enabled}
                      >
                        {preset.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="h-px bg-white/10" />

                {/* Layout Algorithm */}
                <div className="space-y-2">
                  <label className="text-xs text-gray-400">Layout Algorithm</label>
                  <Select
                    value={animConfig.layoutAlgorithm}
                    onValueChange={(value) => updateAnimConfig({ layoutAlgorithm: value as LayoutAlgorithm })}
                  >
                    <SelectTrigger className="w-full bg-white/5 border-white/10">
                      <SelectValue placeholder="Select layout" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-900 border-white/10">
                      {layoutOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          <div className="flex items-center gap-2">
                            {option.icon}
                            <span>{option.label}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500">
                    {layoutOptions.find(o => o.value === animConfig.layoutAlgorithm)?.description}
                  </p>
                </div>

                {/* Bloom Speed */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-gray-400">Bloom Speed</label>
                    <span className="text-xs text-gray-500">{animConfig.bloomSpeed.toFixed(1)}x</span>
                  </div>
                  <Slider
                    value={[animConfig.bloomSpeed * 100]}
                    onValueChange={([value]) => updateAnimConfig({ bloomSpeed: value / 100 })}
                    min={20}
                    max={300}
                    step={10}
                    disabled={!animConfig.enabled}
                    className="w-full"
                  />
                  <p className="text-xs text-gray-500">
                    How fast bubbles expand from center
                  </p>
                </div>

                <div className="h-px bg-white/10" />

                {/* Easing Type */}
                <div className="space-y-2">
                  <label className="text-xs text-gray-400">Release Easing</label>
                  <Select
                    value={animConfig.easingType}
                    onValueChange={(value) => updateAnimConfig({ easingType: value as EasingType })}
                    disabled={!animConfig.enabled}
                  >
                    <SelectTrigger className="w-full bg-white/5 border-white/10">
                      <SelectValue placeholder="Select easing" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-900 border-white/10">
                      {easingOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          <div className="flex items-center gap-2">
                            {option.icon}
                            <span>{option.label}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500">
                    {easingOptions.find(o => o.value === animConfig.easingType)?.description}
                  </p>
                </div>

                {/* Animation Duration */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-gray-400">Release Duration</label>
                    <span className="text-xs text-gray-500">{animConfig.animationDuration}ms</span>
                  </div>
                  <Slider
                    value={[animConfig.animationDuration]}
                    onValueChange={([value]) => updateAnimConfig({ animationDuration: value })}
                    min={100}
                    max={1500}
                    step={50}
                    disabled={!animConfig.enabled || animConfig.easingType === 'none'}
                    className="w-full"
                  />
                </div>

                {/* Momentum Factor */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-gray-400">Release Momentum</label>
                    <span className="text-xs text-gray-500">{Math.round(animConfig.releaseVelocityFactor * 100)}%</span>
                  </div>
                  <Slider
                    value={[animConfig.releaseVelocityFactor * 100]}
                    onValueChange={([value]) => updateAnimConfig({ releaseVelocityFactor: value / 100 })}
                    min={0}
                    max={100}
                    step={5}
                    disabled={!animConfig.enabled || animConfig.easingType === 'none'}
                    className="w-full"
                  />
                  <p className="text-xs text-gray-500">
                    How much velocity to preserve on release
                  </p>
                </div>

                {/* Spring Settings (only visible for spring/elastic) */}
                {(animConfig.easingType === 'spring' || animConfig.easingType === 'elastic') && (
                  <>
                    <div className="h-px bg-white/10" />
                    <div className="space-y-3">
                      <h4 className="text-xs font-medium text-gray-300">Spring Physics</h4>

                      {/* Spring Stiffness */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <label className="text-xs text-gray-400">Stiffness</label>
                          <span className="text-xs text-gray-500">{animConfig.springStiffness.toFixed(2)}</span>
                        </div>
                        <Slider
                          value={[animConfig.springStiffness * 100]}
                          onValueChange={([value]) => updateAnimConfig({ springStiffness: value / 100 })}
                          min={5}
                          max={50}
                          step={1}
                          disabled={!animConfig.enabled}
                          className="w-full"
                        />
                      </div>

                      {/* Spring Damping */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <label className="text-xs text-gray-400">Damping</label>
                          <span className="text-xs text-gray-500">{animConfig.springDamping.toFixed(2)}</span>
                        </div>
                        <Slider
                          value={[animConfig.springDamping * 100]}
                          onValueChange={([value]) => updateAnimConfig({ springDamping: value / 100 })}
                          min={50}
                          max={98}
                          step={1}
                          disabled={!animConfig.enabled}
                          className="w-full"
                        />
                      </div>
                    </div>
                  </>
                )}

                <div className="h-px bg-white/10" />

                {/* Arrow Settings */}
                <div className="space-y-3">
                  <h4 className="text-xs font-medium text-gray-300 flex items-center gap-2">
                    <ArrowRight className="w-4 h-4 text-emerald-400" />
                    Arrow Settings
                  </h4>

                  {/* Arrow Style Selector */}
                  <div className="space-y-2">
                    <label className="text-xs text-gray-400">Arrow Head Style</label>
                    <div className="grid grid-cols-5 gap-1">
                      {arrowStyleOptions.map((option) => (
                        <button
                          key={option.value}
                          onClick={() => updateAnimConfig({
                            arrowConfig: { ...getDefaultArrowConfig(), ...(animConfig.arrowConfig ?? {}), style: option.value }
                          })}
                          className={`flex flex-col items-center gap-1 px-2 py-1.5 text-xs rounded-lg transition-all ${
                            (animConfig.arrowConfig?.style ?? 'triangle') === option.value
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50'
                              : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-transparent'
                          }`}
                          title={option.label}
                        >
                          {option.icon}
                          <span className="text-[10px]">{option.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Curve Style Selector */}
                  <div className="space-y-2">
                    <label className="text-xs text-gray-400 flex items-center gap-1.5">
                      <Spline className="w-3 h-3" />
                      Line Curve
                    </label>
                    <div className="grid grid-cols-3 gap-1">
                      {arrowCurveOptions.map((option) => (
                        <button
                          key={option.value}
                          onClick={() => updateAnimConfig({
                            arrowConfig: { ...getDefaultArrowConfig(), ...(animConfig.arrowConfig ?? {}), curveStyle: option.value }
                          })}
                          className={`px-2 py-1.5 text-xs rounded-lg transition-all ${
                            (animConfig.arrowConfig?.curveStyle ?? 'straight') === option.value
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50'
                              : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-transparent'
                          }`}
                          title={option.description}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Color Mode Selector */}
                  <div className="space-y-2">
                    <label className="text-xs text-gray-400 flex items-center gap-1.5">
                      <Palette className="w-3 h-3" />
                      Color Mode
                    </label>
                    <div className="grid grid-cols-4 gap-1">
                      {colorModeOptions.map((option) => (
                        <button
                          key={option.value}
                          onClick={() => updateAnimConfig({
                            arrowConfig: { ...getDefaultArrowConfig(), ...(animConfig.arrowConfig ?? {}), colorMode: option.value }
                          })}
                          className={`px-2 py-1.5 text-[10px] rounded-lg transition-all ${
                            (animConfig.arrowConfig?.colorMode ?? 'accent') === option.value
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50'
                              : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-transparent'
                          }`}
                          title={option.description}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="h-px bg-white/5" />

                  {/* Arrow Head Size */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-xs text-gray-400">Head Size</label>
                      <span className="text-xs text-gray-500">{animConfig.arrowConfig?.headSize ?? 2.5}px</span>
                    </div>
                    <Slider
                      value={[(animConfig.arrowConfig?.headSize ?? 2.5) * 10]}
                      onValueChange={([value]) => updateAnimConfig({
                        arrowConfig: { ...getDefaultArrowConfig(), ...(animConfig.arrowConfig ?? {}), headSize: value / 10 }
                      })}
                      min={10}
                      max={80}
                      step={5}
                      className="w-full"
                    />
                  </div>

                  {/* Arrow Angle */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-xs text-gray-400">Head Angle</label>
                      <span className="text-xs text-gray-500">{Math.round(180 / (animConfig.arrowConfig?.headAngle ?? 7))}°</span>
                    </div>
                    <Slider
                      value={[animConfig.arrowConfig?.headAngle ?? 7]}
                      onValueChange={([value]) => updateAnimConfig({
                        arrowConfig: { ...getDefaultArrowConfig(), ...(animConfig.arrowConfig ?? {}), headAngle: value }
                      })}
                      min={4}
                      max={12}
                      step={1}
                      className="w-full"
                    />
                  </div>

                  {/* Line Width */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-xs text-gray-400">Line Width</label>
                      <span className="text-xs text-gray-500">{(animConfig.arrowConfig?.lineWidth ?? 0.4).toFixed(2)}px</span>
                    </div>
                    <Slider
                      value={[(animConfig.arrowConfig?.lineWidth ?? 0.4) * 100]}
                      onValueChange={([value]) => updateAnimConfig({
                        arrowConfig: { ...getDefaultArrowConfig(), ...(animConfig.arrowConfig ?? {}), lineWidth: value / 100 }
                      })}
                      min={10}
                      max={150}
                      step={5}
                      className="w-full"
                    />
                    <p className="text-xs text-gray-500">
                      Arrows stretch thinner when nodes are far apart
                    </p>
                  </div>

                  <div className="h-px bg-white/5" />

                  {/* Style Toggles */}
                  <div className="space-y-2">
                    {/* Tapered Line Toggle */}
                    <div className="flex items-center justify-between py-1">
                      <label className="text-xs text-gray-400">Tapered Lines</label>
                      <Switch
                        checked={animConfig.arrowConfig?.tapered ?? false}
                        onCheckedChange={(checked) => updateAnimConfig({
                          arrowConfig: { ...getDefaultArrowConfig(), ...(animConfig.arrowConfig ?? {}), tapered: checked }
                        })}
                      />
                    </div>

                    {/* Value-Based Opacity Toggle */}
                    <div className="flex items-center justify-between py-1">
                      <label className="text-xs text-gray-400">Value-Based Opacity</label>
                      <Switch
                        checked={animConfig.arrowConfig?.valueBasedOpacity ?? false}
                        onCheckedChange={(checked) => updateAnimConfig({
                          arrowConfig: { ...getDefaultArrowConfig(), ...(animConfig.arrowConfig ?? {}), valueBasedOpacity: checked }
                        })}
                      />
                    </div>

                    {/* Glow Effect Toggle */}
                    <div className="flex items-center justify-between py-1">
                      <label className="text-xs text-gray-400">Glow Effect</label>
                      <Switch
                        checked={animConfig.arrowConfig?.showGlow ?? false}
                        onCheckedChange={(checked) => updateAnimConfig({
                          arrowConfig: { ...getDefaultArrowConfig(), ...(animConfig.arrowConfig ?? {}), showGlow: checked }
                        })}
                      />
                    </div>

                    {/* Glow Intensity */}
                    {(animConfig.arrowConfig?.showGlow ?? false) && (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <label className="text-xs text-gray-400">Glow Intensity</label>
                          <span className="text-xs text-gray-500">{((animConfig.arrowConfig?.glowIntensity ?? 0.5) * 100).toFixed(0)}%</span>
                        </div>
                        <Slider
                          value={[(animConfig.arrowConfig?.glowIntensity ?? 0.5) * 100]}
                          onValueChange={([value]) => updateAnimConfig({
                            arrowConfig: { ...getDefaultArrowConfig(), ...(animConfig.arrowConfig ?? {}), glowIntensity: value / 100 }
                          })}
                          min={10}
                          max={100}
                          step={5}
                          className="w-full"
                        />
                      </div>
                    )}
                  </div>

                  <div className="h-px bg-white/5" />

                  {/* Flow Animation Toggle */}
                  <div className="flex items-center justify-between py-1">
                    <div className="flex items-center gap-2">
                      <MoveRight className="w-3.5 h-3.5 text-gray-400" />
                      <label className="text-xs text-gray-400">Flow Animation</label>
                    </div>
                    <Switch
                      checked={animConfig.arrowConfig?.showFlowAnimation ?? true}
                      onCheckedChange={(checked) => updateAnimConfig({
                        arrowConfig: { ...getDefaultArrowConfig(), ...(animConfig.arrowConfig ?? {}), showFlowAnimation: checked }
                      })}
                    />
                  </div>

                  {/* Flow Speed & Opacity */}
                  {(animConfig.arrowConfig?.showFlowAnimation ?? true) && (
                    <>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <label className="text-xs text-gray-400">Flow Speed</label>
                          <span className="text-xs text-gray-500">{((animConfig.arrowConfig?.flowSpeed ?? 0.4) * 100).toFixed(0)}%</span>
                        </div>
                        <Slider
                          value={[(animConfig.arrowConfig?.flowSpeed ?? 0.4) * 100]}
                          onValueChange={([value]) => updateAnimConfig({
                            arrowConfig: { ...getDefaultArrowConfig(), ...(animConfig.arrowConfig ?? {}), flowSpeed: value / 100 }
                          })}
                          min={10}
                          max={100}
                          step={5}
                          className="w-full"
                        />
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <label className="text-xs text-gray-400">Flow Opacity</label>
                          <span className="text-xs text-gray-500">{((animConfig.arrowConfig?.flowOpacity ?? 0.15) * 100).toFixed(0)}%</span>
                        </div>
                        <Slider
                          value={[(animConfig.arrowConfig?.flowOpacity ?? 0.15) * 100]}
                          onValueChange={([value]) => updateAnimConfig({
                            arrowConfig: { ...getDefaultArrowConfig(), ...(animConfig.arrowConfig ?? {}), flowOpacity: value / 100 }
                          })}
                          min={5}
                          max={50}
                          step={5}
                          className="w-full"
                        />
                      </div>
                    </>
                  )}
                </div>

                {/* Preview hint */}
                <div className="pt-2 border-t border-white/10">
                  <p className="text-xs text-gray-500 text-center">
                    Click "Reset Layout" to see bloom animation with new settings
                  </p>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
