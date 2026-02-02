"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCryptoVizStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Clock,
  Calendar,
  ChevronUp,
  ChevronDown,
  FastForward,
} from "lucide-react";

// Generate date labels for the last 30 days
const generateDateRange = () => {
  const dates: Date[] = [];
  const now = new Date();
  for (let i = 30; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    dates.push(date);
  }
  return dates;
};

const dateRange = generateDateRange();

export function TimeTravelSlider() {
  const { currentTime, setCurrentTime, isPlaying, setIsPlaying, playbackSpeed, setPlaybackSpeed } =
    useCryptoVizStore();

  const [isExpanded, setIsExpanded] = useState(false);
  const [sliderValue, setSliderValue] = useState([100]); // 0-100 representing 30 days

  // Convert slider value to date
  const valueToDate = useCallback((value: number): Date => {
    const index = Math.floor((value / 100) * (dateRange.length - 1));
    return dateRange[index];
  }, []);

  // Convert date to slider value
  const dateToValue = useCallback((date: Date): number => {
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    const value = ((30 - diffDays) / 30) * 100;
    return Math.max(0, Math.min(100, value));
  }, []);

  // Playback effect
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setSliderValue((prev) => {
        const newValue = Math.min(prev[0] + playbackSpeed * 0.5, 100);
        const newDate = valueToDate(newValue);
        setCurrentTime(newDate);

        if (newValue >= 100) {
          setIsPlaying(false);
        }

        return [newValue];
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isPlaying, playbackSpeed, setCurrentTime, setIsPlaying, valueToDate]);

  const handleSliderChange = (value: number[]) => {
    setSliderValue(value);
    setCurrentTime(valueToDate(value[0]));
  };

  const handlePlayPause = () => {
    if (sliderValue[0] >= 100) {
      setSliderValue([0]);
      setCurrentTime(valueToDate(0));
    }
    setIsPlaying(!isPlaying);
  };

  const handleSkipBack = () => {
    const newValue = Math.max(0, sliderValue[0] - 10);
    setSliderValue([newValue]);
    setCurrentTime(valueToDate(newValue));
  };

  const handleSkipForward = () => {
    const newValue = Math.min(100, sliderValue[0] + 10);
    setSliderValue([newValue]);
    setCurrentTime(valueToDate(newValue));
  };

  const handleJumpToNow = () => {
    setSliderValue([100]);
    setCurrentTime(new Date());
    setIsPlaying(false);
  };

  const speedOptions = [0.5, 1, 2, 4];

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="absolute bottom-0 left-0 right-0 z-40">
      {/* Expand Toggle */}
      <motion.button
        onClick={() => setIsExpanded(!isExpanded)}
        className="absolute -top-10 left-1/2 -translate-x-1/2 glass px-3 sm:px-4 py-1.5 sm:py-2 rounded-t-xl flex items-center gap-1.5 sm:gap-2 text-gray-400 hover:text-white transition-colors"
        whileHover={{ y: -2 }}
        whileTap={{ scale: 0.98 }}
      >
        <Clock className="w-3 h-3 sm:w-4 sm:h-4 text-[#00ff88]" />
        <span className="text-xs sm:text-sm font-medium">Time Travel</span>
        {isExpanded ? (
          <ChevronDown className="w-3 h-3 sm:w-4 sm:h-4" />
        ) : (
          <ChevronUp className="w-3 h-3 sm:w-4 sm:h-4" />
        )}
      </motion.button>

      {/* Main Slider Panel */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="glass border-t border-white/5 p-3 sm:p-4">
              <div className="max-w-4xl mx-auto">
                {/* Current Time Display */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <Calendar className="w-3 h-3 sm:w-4 sm:h-4 text-[#00ff88]" />
                      <span className="text-white font-medium text-sm sm:text-base">
                        {formatDate(currentTime)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 sm:gap-2 text-gray-400">
                      <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
                      <span className="text-xs sm:text-sm">{formatTime(currentTime)}</span>
                    </div>
                  </div>

                  {/* Playback Speed */}
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <FastForward className="w-3 h-3 sm:w-4 sm:h-4 text-gray-500" />
                    <div className="flex gap-0.5 sm:gap-1">
                      {speedOptions.map((speed) => (
                        <Button
                          key={speed}
                          variant="ghost"
                          size="sm"
                          onClick={() => setPlaybackSpeed(speed)}
                          className={`text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 h-auto ${
                            playbackSpeed === speed
                              ? "text-[#00ff88] bg-[#00ff88]/10"
                              : "text-gray-400 hover:text-white"
                          }`}
                        >
                          {speed}x
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Timeline Slider */}
                <div className="relative mb-4">
                  {/* Mobile Layout */}
                  <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4">
                    {/* Playback Controls */}
                    <div className="flex items-center gap-1 order-1 sm:order-none">
                      <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={handleSkipBack}
                          className="text-gray-400 hover:text-white hover:bg-white/10 h-8 w-8"
                        >
                          <SkipBack className="w-4 h-4" />
                        </Button>
                      </motion.div>

                      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={handlePlayPause}
                          className={`h-10 w-10 sm:h-12 sm:w-12 rounded-full transition-all duration-300 ${
                            isPlaying
                              ? "bg-[#00ff88] text-black hover:bg-[#00cc6a] glow-green"
                              : "bg-white/10 text-white hover:bg-white/20"
                          }`}
                        >
                          <AnimatePresence mode="wait">
                            {isPlaying ? (
                              <motion.div
                                key="pause"
                                initial={{ scale: 0, rotate: -90 }}
                                animate={{ scale: 1, rotate: 0 }}
                                exit={{ scale: 0, rotate: 90 }}
                              >
                                <Pause className="w-5 h-5" />
                              </motion.div>
                            ) : (
                              <motion.div
                                key="play"
                                initial={{ scale: 0, rotate: -90 }}
                                animate={{ scale: 1, rotate: 0 }}
                                exit={{ scale: 0, rotate: 90 }}
                              >
                                <Play className="w-5 h-5 ml-0.5" />
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </Button>
                      </motion.div>

                      <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={handleSkipForward}
                          className="text-gray-400 hover:text-white hover:bg-white/10 h-8 w-8"
                        >
                          <SkipForward className="w-4 h-4" />
                        </Button>
                      </motion.div>
                    </div>

                    {/* Slider */}
                    <div className="flex-1 relative w-full order-2 sm:order-none">
                      <Slider
                        value={sliderValue}
                        onValueChange={handleSliderChange}
                        max={100}
                        step={0.5}
                        className="w-full"
                      />

                      {/* Date Labels */}
                      <div className="flex justify-between mt-2 text-[10px] sm:text-xs text-gray-500">
                        <span>{formatDate(dateRange[0])}</span>
                        <span className="hidden sm:inline">{formatDate(dateRange[Math.floor(dateRange.length / 2)])}</span>
                        <span>Now</span>
                      </div>
                    </div>

                    {/* Jump to Now */}
                    <motion.div
                      className="order-3 sm:order-none"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleJumpToNow}
                        className="text-xs border-white/10 hover:bg-white/10 text-gray-300 hover:border-[#00ff88]/50"
                      >
                        Live
                        <motion.span
                          className="ml-1 w-2 h-2 rounded-full bg-[#00ff88]"
                          animate={{ scale: [1, 1.2, 1], opacity: [1, 0.7, 1] }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                        />
                      </Button>
                    </motion.div>
                  </div>
                </div>

                {/* Activity Heatmap - Hidden on very small screens */}
                <div className="hidden sm:block">
                  <div className="flex gap-0.5 sm:gap-1 h-6 sm:h-8">
                    {Array.from({ length: 31 }).map((_, i) => {
                      const activity = Math.random();
                      const isCurrentDay = Math.abs(sliderValue[0] - (i / 30) * 100) < 5;
                      return (
                        <motion.div
                          key={i}
                          className="flex-1 rounded-sm cursor-pointer transition-all"
                          style={{
                            background: `rgba(0, 255, 136, ${activity * 0.6 + 0.1})`,
                            boxShadow: isCurrentDay ? '0 0 10px rgba(0, 255, 136, 0.5)' : 'none',
                          }}
                          whileHover={{ scale: 1.15, y: -3 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => {
                            const value = (i / 30) * 100;
                            setSliderValue([value]);
                            setCurrentTime(valueToDate(value));
                          }}
                        />
                      );
                    })}
                  </div>
                  <div className="flex justify-between text-[10px] sm:text-xs text-gray-500 mt-1">
                    <span>Low Activity</span>
                    <span>High Activity</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Collapsed Mini View */}
      {!isExpanded && (
        <div className="glass border-t border-white/5 px-4 py-2">
          <div className="max-w-4xl mx-auto flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={handlePlayPause}
              className="h-8 w-8 text-gray-400 hover:text-white"
            >
              {isPlaying ? (
                <Pause className="w-4 h-4" />
              ) : (
                <Play className="w-4 h-4" />
              )}
            </Button>

            <Slider
              value={sliderValue}
              onValueChange={handleSliderChange}
              max={100}
              step={0.5}
              className="flex-1"
            />

            <span className="text-xs text-gray-400 min-w-[80px] text-right">
              {formatDate(currentTime)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
