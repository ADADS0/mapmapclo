"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Bell,
  Plus,
  Trash2,
  AlertTriangle,
  Zap,
  DollarSign,
  ArrowUpDown,
  Shield,
  TrendingUp,
  Settings,
} from "lucide-react";
import { toast } from "sonner";

interface AlertRule {
  id: string;
  name: string;
  type: "value" | "volume" | "risk" | "whale" | "custom";
  condition: "above" | "below" | "equals" | "between";
  threshold: number;
  thresholdMax?: number;
  enabled: boolean;
  notifySound: boolean;
  notifyDesktop: boolean;
  createdAt: Date;
  triggerCount: number;
}

const defaultRules: AlertRule[] = [
  {
    id: "rule-1",
    name: "Large Transaction Alert",
    type: "value",
    condition: "above",
    threshold: 100,
    enabled: true,
    notifySound: true,
    notifyDesktop: true,
    createdAt: new Date(),
    triggerCount: 0,
  },
  {
    id: "rule-2",
    name: "High Risk Score",
    type: "risk",
    condition: "above",
    threshold: 80,
    enabled: true,
    notifySound: false,
    notifyDesktop: true,
    createdAt: new Date(),
    triggerCount: 0,
  },
];

const ruleTypeIcons: Record<string, React.ReactNode> = {
  value: <DollarSign className="w-4 h-4" />,
  volume: <ArrowUpDown className="w-4 h-4" />,
  risk: <Shield className="w-4 h-4" />,
  whale: <TrendingUp className="w-4 h-4" />,
  custom: <Settings className="w-4 h-4" />,
};

const ruleTypeColors: Record<string, string> = {
  value: "#00ff88",
  volume: "#00ffff",
  risk: "#ff4444",
  whale: "#ffff00",
  custom: "#ff00ff",
};

export function AlertsConfigPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [rules, setRules] = useState<AlertRule[]>(defaultRules);
  const [globalEnabled, setGlobalEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [desktopNotifications, setDesktopNotifications] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newRuleName, setNewRuleName] = useState("");
  const [newRuleType, setNewRuleType] = useState<AlertRule["type"]>("value");
  const [newRuleCondition, setNewRuleCondition] = useState<AlertRule["condition"]>("above");
  const [newRuleThreshold, setNewRuleThreshold] = useState(50);

  const toggleRule = (id: string) => {
    setRules(rules.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r)));
  };

  const deleteRule = (id: string) => {
    setRules(rules.filter((r) => r.id !== id));
    toast.success("Alert rule deleted");
  };

  const createRule = () => {
    if (!newRuleName.trim()) {
      toast.error("Please enter a rule name");
      return;
    }
    const newRule: AlertRule = {
      id: `rule-${Date.now()}`,
      name: newRuleName,
      type: newRuleType,
      condition: newRuleCondition,
      threshold: newRuleThreshold,
      enabled: true,
      notifySound: soundEnabled,
      notifyDesktop: desktopNotifications,
      createdAt: new Date(),
      triggerCount: 0,
    };
    setRules([...rules, newRule]);
    setNewRuleName("");
    setNewRuleThreshold(50);
    setIsCreating(false);
    toast.success("Alert rule created");
  };

  return (
    <>
      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsOpen(true)}
          className="border-white/10 text-white hover:bg-white/10 hover:border-[#ff9800]/50 transition-all relative"
        >
          <Bell className="w-4 h-4 mr-2" />
          <span className="hidden xl:inline">Alerts</span>
          {rules.filter((r) => r.enabled).length > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#ff9800] text-[10px] flex items-center justify-center text-black font-bold">
              {rules.filter((r) => r.enabled).length}
            </span>
          )}
        </Button>
      </motion.div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="glass border-white/10 max-w-2xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
              <Bell className="w-5 h-5 text-[#ff9800]" />
              Alert Configuration
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Configure transaction alerts and notification preferences
            </DialogDescription>
          </DialogHeader>

          <div className="p-4 rounded-lg bg-white/5 border border-white/10">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-[#ff9800]" />
                <span className="text-white font-medium">Global Alerts</span>
              </div>
              <Switch checked={globalEnabled} onCheckedChange={setGlobalEnabled} />
            </div>
            <Separator className="bg-white/10 my-3" />
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center justify-between p-2 rounded bg-white/5">
                <span className="text-sm text-gray-400">Sound</span>
                <Switch checked={soundEnabled} onCheckedChange={setSoundEnabled} />
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-white/5">
                <span className="text-sm text-gray-400">Desktop</span>
                <Switch checked={desktopNotifications} onCheckedChange={setDesktopNotifications} />
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-white font-medium flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-[#ff9800]" />
                Alert Rules
              </h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsCreating(!isCreating)}
                className="border-[#00ff88]/30 text-[#00ff88] hover:bg-[#00ff88]/10"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Rule
              </Button>
            </div>

            <AnimatePresence>
              {isCreating && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="p-4 rounded-lg bg-[#00ff88]/5 border border-[#00ff88]/30 space-y-4">
                    <Input
                      placeholder="Rule name..."
                      value={newRuleName}
                      onChange={(e) => setNewRuleName(e.target.value)}
                      className="bg-white/5 border-white/10 text-white"
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <Select value={newRuleType} onValueChange={(v) => setNewRuleType(v as AlertRule["type"])}>
                        <SelectTrigger className="bg-white/5 border-white/10 text-white">
                          <SelectValue placeholder="Alert type" />
                        </SelectTrigger>
                        <SelectContent className="bg-[#0a0a0f] border-white/10">
                          <SelectItem value="value">Transaction Value</SelectItem>
                          <SelectItem value="volume">Volume Change</SelectItem>
                          <SelectItem value="risk">Risk Score</SelectItem>
                          <SelectItem value="whale">Whale Activity</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select value={newRuleCondition} onValueChange={(v) => setNewRuleCondition(v as AlertRule["condition"])}>
                        <SelectTrigger className="bg-white/5 border-white/10 text-white">
                          <SelectValue placeholder="Condition" />
                        </SelectTrigger>
                        <SelectContent className="bg-[#0a0a0f] border-white/10">
                          <SelectItem value="above">Above</SelectItem>
                          <SelectItem value="below">Below</SelectItem>
                          <SelectItem value="equals">Equals</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm text-gray-400 mb-2">
                        <span>Threshold</span>
                        <span className="text-white font-mono">{newRuleThreshold} {newRuleType === "risk" ? "%" : "ETH"}</span>
                      </div>
                      <Slider
                        value={[newRuleThreshold]}
                        onValueChange={(v) => setNewRuleThreshold(v[0])}
                        max={newRuleType === "risk" ? 100 : 1000}
                        step={newRuleType === "risk" ? 1 : 10}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={createRule} className="flex-1 bg-[#00ff88] text-black hover:bg-[#00cc66]">
                        Create Rule
                      </Button>
                      <Button variant="ghost" onClick={() => setIsCreating(false)} className="text-gray-400">
                        Cancel
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <ScrollArea className="h-[250px]">
              <div className="space-y-2 pr-4">
                {rules.map((rule) => (
                  <motion.div
                    key={rule.id}
                    layout
                    className={`p-4 rounded-lg border transition-all ${
                      rule.enabled ? "bg-white/5 border-white/10" : "bg-white/[0.02] border-white/5 opacity-60"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center"
                          style={{ background: `${ruleTypeColors[rule.type]}20`, color: ruleTypeColors[rule.type] }}
                        >
                          {ruleTypeIcons[rule.type]}
                        </div>
                        <div>
                          <p className="text-white font-medium">{rule.name}</p>
                          <p className="text-xs text-gray-400">
                            {rule.condition} <span className="font-mono text-white/80">{rule.threshold}{rule.type === "risk" ? "%" : " ETH"}</span>
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs border-white/20">{rule.triggerCount} triggered</Badge>
                        <Switch checked={rule.enabled} onCheckedChange={() => toggleRule(rule.id)} />
                        <Button variant="ghost" size="icon" onClick={() => deleteRule(rule.id)} className="text-gray-400 hover:text-red-400">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                ))}
                {rules.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No alert rules configured</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
