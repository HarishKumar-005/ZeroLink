
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
        const className = cn("w-8 h-8 transition-colors", state ? "text-primary" : "text-muted-foreground");
        const animationClass = state ? "animate-pulse" : "";
        switch (device) {
            case "light": return <Lightbulb className={cn(className, state && "text-yellow-400")} />;
            case "fan": return <Fan className={cn(className, state && "animate-spin-slow")} />;
            case "pump": return <Droplets className={cn(className, animationClass)} />;
            case "siren": return <Siren className={cn(className, animationClass)} />;
        }
    };

    const titleMap: Record<DeviceType, string> = {
        fan: "Fan",
        light: "Light",
        pump: "Water Pump",
        siren: "Alarm Siren"
    };

    return (
        <Card className={cn("transition-all duration-300", state ? "bg-accent/30 border-accent" : "bg-muted/30")}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base font-medium capitalize">{titleMap[device]}</CardTitle>
                {renderIcon()}
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">
                    {state ? "ON" : "OFF"}
                </div>
                <p className="text-xs text-muted-foreground">
                    Device is currently {state ? "active" : "inactive"}
                </p>
            </CardContent>
        </Card>
    );
};

// Add animation to tailwind config if not present
// in tailwind.config.ts
// animation: {
//     'spin-slow': 'spin 3s linear infinite',
// }
