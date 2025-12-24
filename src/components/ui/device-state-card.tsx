
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lightbulb, Fan, Droplets, Siren } from "lucide-react";
import { cn } from "@/lib/utils";

type DeviceType = 'fan' | 'light' | 'pump' | 'siren';

interface DeviceStateCardProps {
    device: DeviceType;
    state: boolean; // true = on, false = off
}

export function DeviceStateCard({ device, state }: DeviceStateCardProps) {
    const renderIcon = () => {
        const iconClass = "w-8 h-8 transition-colors";
        const onClass = "text-primary";
        const offClass = "text-muted-foreground";

        switch (device) {
            case "light": return <Lightbulb className={cn(iconClass, state ? "text-yellow-400" : offClass)} />;
            case "fan": return <Fan className={cn(iconClass, state ? `${onClass} animate-spin-slow` : offClass)} />;
            case "pump": return <Droplets className={cn(iconClass, state ? `${onClass} animate-pulse` : offClass)} />;
            case "siren": return <Siren className={cn(iconClass, state ? `text-red-500 animate-pulse` : offClass)} />;
        }
    };

    const titleMap: Record<DeviceType, string> = {
        fan: "Fan",
        light: "Light",
        pump: "Water Pump",
        siren: "Alarm Siren"
    };

    return (
        <Card className={cn("transition-all duration-300", state ? "border-primary shadow-lg shadow-primary/20" : "bg-muted/30")}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base font-medium capitalize">{titleMap[device]}</CardTitle>
                {renderIcon()}
            </CardHeader>
            <CardContent>
                <div className={cn("text-2xl font-bold", state ? "text-primary" : "text-muted-foreground")}>
                    {state ? "ON" : "OFF"}
                </div>
                <p className="text-xs text-muted-foreground">
                    Device is currently {state ? "active" : "inactive"}
                </p>
            </CardContent>
        </Card>
    );
};
