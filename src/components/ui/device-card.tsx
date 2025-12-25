
"use client";

import { Logic, Trigger } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Thermometer, Sun, DoorOpen, DoorClosed, ChevronUp, ChevronDown } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Button } from "./button";
import { Input } from "./input";
import { cn } from "@/lib/utils";
import { Badge } from "./badge";

type SensorType = "temperature" | "light" | "motion";

interface DeviceCardProps {
  sensorType: SensorType;
  value: number | boolean;
  onValueChange: (value: number | boolean) => void;
  logic: Logic | null;
}

const getIsActive = (logic: Logic | null, sensorType: SensorType): boolean => {
    if (!logic) return false;

    const findRelevantConditions = (trigger: Trigger): boolean => {
        if ('sensor' in trigger) {
            return trigger.sensor === sensorType;
        }
        return trigger.conditions.some(findRelevantConditions);
    };

    return logic.triggers.some(findRelevantConditions);
};

export const DeviceCard = ({ sensorType, value, onValueChange, logic }: DeviceCardProps) => {
    const isActive = getIsActive(logic, sensorType);

    const renderIcon = () => {
        switch (sensorType) {
            case "temperature": return <Thermometer className={cn("w-8 h-8 transition-colors", isActive && "text-red-500")} />;
            case "light": return <Sun className={cn("w-8 h-8 transition-colors", isActive && "text-yellow-400")} />;
            case "motion": return value ? <DoorOpen className={cn("w-8 h-8", isActive && "text-teal-500")} /> : <DoorClosed className="w-8 h-8 text-muted-foreground" />;
        }
    };

    const renderControl = () => {
        switch (sensorType) {
            case "temperature": return (
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={() => onValueChange((value as number) - 1)}><ChevronDown className="w-5 h-5" /></Button>
                    <Input 
                        type="number" 
                        className="w-20 text-center text-2xl font-bold" 
                        value={value} 
                        onChange={(e) => onValueChange(Number(e.target.value))}
                    />
                    <Button variant="ghost" size="icon" onClick={() => onValueChange((value as number) + 1)}><ChevronUp className="w-5 h-5" /></Button>
                </div>
            );
            case "light": return (
                <div className="flex items-center gap-4 w-full">
                    <Slider min={0} max={100} step={1} value={[value as number]} onValueChange={(v) => onValueChange(v[0])} />
                    <span className="font-semibold w-8 text-right">{value}%</span>
                </div>
            );
            case "motion": return (
                <div className="flex items-center gap-3">
                    <Switch checked={value as boolean} onCheckedChange={onValueChange} />
                    <span className="font-semibold">{value ? "Motion Detected" : "No Motion"}</span>
                </div>
            );
        }
    };

    const titleMap: Record<SensorType, string> = {
        temperature: "Thermostat",
        light: "Light Sensor",
        motion: "Motion Detector"
    };
    
    const unitMap: Record<SensorType, string> = {
        temperature: "°C",
        light: "%",
        motion: ""
    }

    return (
        <Card className={cn("transition-all duration-300", isActive ? "border-primary shadow-lg shadow-primary/20" : "")}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base font-medium">{titleMap[sensorType]}</CardTitle>
                {renderIcon()}
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center space-y-4 pt-4">
                <div className="h-16 flex items-center justify-center">
                    {renderControl()}
                </div>
                <Badge variant={isActive ? "default" : "secondary"}>
                    {`Value: ${value}${unitMap[sensorType]}`}
                </Badge>
            </CardContent>
        </Card>
    );
};
