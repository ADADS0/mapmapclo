"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCryptoVizStore, themes } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Bell,
  BellRing,
  AlertTriangle,
  TrendingUp,
  ArrowRightLeft,
  X,
  Settings,
  Volume2,
  VolumeX,
} from "lucide-react";
import { shortenAddress, formatBalance } from "@/lib/mockData";

interface Notification {
  id: string;
  type: "whale_alert" | "high_risk" | "large_transaction" | "new_connection";
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  nodeId?: string;
  value?: number;
}

const notificationIcons: Record<Notification["type"], React.ElementType> = {
  whale_alert: TrendingUp,
  high_risk: AlertTriangle,
  large_transaction: ArrowRightLeft,
  new_connection: BellRing,
};

const notificationColors: Record<Notification["type"], string> = {
  whale_alert: "#ffff00",
  high_risk: "#ff4444",
  large_transaction: "#00ff88",
  new_connection: "#00ffff",
};

export function NotificationSystem() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [enabledTypes, setEnabledTypes] = useState<Record<Notification["type"], boolean>>({
    whale_alert: true,
    high_risk: true,
    large_transaction: true,
    new_connection: false,
  });

  const { nodes, theme, selectNode, setView } = useCryptoVizStore();
  const themeConfig = themes[theme];

  const unreadCount = notifications.filter(n => !n.read).length;

  const generateNotification = useCallback(() => {
    const types: Notification["type"][] = ["whale_alert", "high_risk", "large_transaction", "new_connection"];
    const type = types[Math.floor(Math.random() * types.length)];

    if (!enabledTypes[type]) return;

    const node = nodes[Math.floor(Math.random() * nodes.length)];
    if (!node) return;

    let title = "";
    let message = "";
    let value: number | undefined;

    switch (type) {
      case "whale_alert":
        title = "Whale Movement Detected";
        value = Math.random() * 1000 + 100;
        message = `Large holder ${shortenAddress(node.address)} moved ${formatBalance(value)}`;
        break;
      case "high_risk":
        title = "High Risk Activity";
        message = `Suspicious transaction from ${shortenAddress(node.address)} (Risk: ${node.riskScore}%)`;
        break;
      case "large_transaction":
        title = "Large Transaction";
        value = Math.random() * 500 + 50;
        message = `${formatBalance(value)} transferred via ${node.label || shortenAddress(node.address)}`;
        break;
      case "new_connection":
        title = "New Connection";
        message = `New link established with ${shortenAddress(node.address)}`;
        break;
    }

    const newNotification: Notification = {
      id: `notif-${Date.now()}-${Math.random()}`,
      type,
      title,
      message,
      timestamp: new Date(),
      read: false,
      nodeId: node.id,
      value,
    };

    setNotifications(prev => [newNotification, ...prev].slice(0, 50));
  }, [nodes, enabledTypes]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (Math.random() > 0.7) {
        generateNotification();
      }
    }, 8000);

    return () => clearInterval(interval);
  }, [generateNotification]);

  const markAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  const handleNotificationClick = (notification: Notification) => {
    markAsRead(notification.id);
    if (notification.nodeId) {
      selectNode(notification.nodeId);
      const node = nodes.find(n => n.id === notification.nodeId);
      if (node?.x && node?.y) {
        setView({ panX: -node.x + 400, panY: -node.y + 300 });
      }
    }
    setIsOpen(false);
  };

  const toggleNotificationType = (type: Notification["type"]) => {
    setEnabledTypes(prev => ({ ...prev, [type]: !prev[type] }));
  };

  return (
    <>
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <motion.div className="relative" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              variant="outline"
              size="sm"
              className="border-white/10 text-white hover:bg-white/10 hover:border-[#ffff00]/50 transition-all relative"
            >
              <Bell className="w-4 h-4" />
              <AnimatePresence>
                {unreadCount > 0 && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#ff4444] flex items-center justify-center text-[10px] font-bold"
                  >
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </motion.div>
                )}
              </AnimatePresence>
            </Button>
          </motion.div>
        </SheetTrigger>

        <SheetContent side="right" className="w-[380px] max-w-[90vw] p-0 bg-[#0a0a0f] border-l border-white/10">
          <SheetHeader className="p-4 border-b border-white/10">
            <div className="flex items-center justify-between">
              <SheetTitle className="flex items-center gap-2 text-white">
                <BellRing className="w-5 h-5" style={{ color: themeConfig.accentColor }} />
                Notifications
                {unreadCount > 0 && (
                  <Badge className="ml-2 bg-[#ff4444]/20 text-[#ff4444] border-none">
                    {unreadCount} new
                  </Badge>
                )}
              </SheetTitle>
              <div className="flex items-center gap-2">
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  className="p-1.5 rounded-md hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                >
                  {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setShowSettings(!showSettings)}
                  className="p-1.5 rounded-md hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                >
                  <Settings className="w-4 h-4" />
                </motion.button>
              </div>
            </div>
          </SheetHeader>

          <AnimatePresence>
            {showSettings && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="border-b border-white/10 overflow-hidden"
              >
                <div className="p-4 space-y-3">
                  <h4 className="text-xs font-medium text-gray-400 uppercase">Notification Types</h4>
                  {(Object.keys(enabledTypes) as Notification["type"][]).map((type) => {
                    const Icon = notificationIcons[type];
                    const color = notificationColors[type];
                    return (
                      <div key={type} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Icon className="w-4 h-4" style={{ color }} />
                          <span className="text-sm text-gray-300 capitalize">
                            {type.replace("_", " ")}
                          </span>
                        </div>
                        <Switch
                          checked={enabledTypes[type]}
                          onCheckedChange={() => toggleNotificationType(type)}
                        />
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="px-4 py-2 border-b border-white/10 flex items-center justify-between">
            <button onClick={markAllAsRead} className="text-xs text-gray-400 hover:text-white transition-colors">
              Mark all as read
            </button>
            <button onClick={clearAll} className="text-xs text-gray-400 hover:text-red-400 transition-colors">
              Clear all
            </button>
          </div>

          <ScrollArea className="h-[calc(100vh-200px)]">
            <div className="p-2">
              <AnimatePresence mode="popLayout">
                {notifications.length === 0 ? (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-12 text-gray-500">
                    <Bell className="w-12 h-12 mb-4 opacity-30" />
                    <p>No notifications yet</p>
                    <p className="text-xs mt-1">Activity alerts will appear here</p>
                  </motion.div>
                ) : (
                  notifications.map((notification, index) => {
                    const Icon = notificationIcons[notification.type];
                    const color = notificationColors[notification.type];
                    return (
                      <motion.div
                        key={notification.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ delay: index * 0.02 }}
                        onClick={() => handleNotificationClick(notification)}
                        className={`p-3 mb-2 rounded-lg cursor-pointer transition-all ${
                          notification.read ? "bg-white/5 hover:bg-white/10" : "bg-white/10 hover:bg-white/15 border-l-2"
                        }`}
                        style={{ borderLeftColor: notification.read ? "transparent" : color }}
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${color}20` }}>
                            <Icon className="w-4 h-4" style={{ color }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <h4 className="text-sm font-medium text-white truncate">{notification.title}</h4>
                              {!notification.read && <div className="w-2 h-2 rounded-full bg-[#00ff88] flex-shrink-0" />}
                            </div>
                            <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{notification.message}</p>
                            <p className="text-[10px] text-gray-500 mt-1">{notification.timestamp.toLocaleTimeString()}</p>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </AnimatePresence>
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </>
  );
}
