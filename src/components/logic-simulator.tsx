
"use client";

import { type Logic, type SensorData, type EventLogEntry, type DeviceStates } from "@/types";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Save, Trash2 } from "lucide-react";
import { EventLog } from "./event-log";
import { cn } from "@/lib/utils";
import { DeviceCard } from "./ui/device-card";
import { DeviceStateCard } from "./ui/device-state-card";

interface LogicSimulatorProps {
  logic: Logic;
  sensorData: SensorData;
  deviceStates: DeviceStates;
  onSensorChange: (data: SensorData) => void;
  onSave: () => void;
  onClear: () => void;
  eventLog: EventLogEntry[];
  onClearLog: () => void;
  className?: string;
}

export function LogicSimulator({
  logic,
  sensorData,
  deviceStates,
  onSensorChange,
  onSave,
  onClear,
  eventLog,
  onClearLog,
  className
}: LogicSimulatorProps) {
  return (
    <div className={cn("space-y-6", className)}>
        <div className="text-center">
            <h2 className="text-2xl font-bold">Smart Device Simulator</h2>
            <p className="text-muted-foreground">
                Simulating: <span className="font-semibold text-primary">{logic.name}</span>
            </p>
        </div>
        
        <div>
            <h3 className="text-lg font-semibold mb-2 text-center md:text-left">Inputs (Sensors)</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <DeviceCard
                    sensorType="temperature"
                    value={sensorData.temperature}
                    onValueChange={(value) => onSensorChange({ ...sensorData, temperature: value as number })}
                    logic={logic}
                />
                <DeviceCard
                    sensorType="light"
                    value={sensorData.light}
                    onValueChange={(value) => onSensorChange({ ...sensorData, light: value as number })}
                    logic={logic}
                />
                <DeviceCard
                    sensorType="motion"
                    value={sensorData.motion}
                    onValueChange={(value) => onSensorChange({ ...sensorData, motion: value as boolean })}
                    logic={logic}
                />
            </div>
        </div>

        <div>
            <h3 className="text-lg font-semibold mb-2 text-center md:text-left">Outputs (Virtual Devices)</h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <DeviceStateCard device="light" state={deviceStates.light} />
                <DeviceStateCard device="fan" state={deviceStates.fan} />
                <DeviceStateCard device="pump" state={deviceStates.pump} />
                <DeviceStateCard device="siren" state={deviceStates.siren} />
            </div>
        </div>


      <EventLog log={eventLog} onClearLog={onClearLog} />

      <div className="flex justify-between items-center gap-4 pt-4 border-t">
        <Button variant="outline" onClick={onSave}><Save className="mr-2 h-4 w-4"/> Save Logic</Button>
        <Button variant="ghost" onClick={onClear}><Trash2 className="mr-2 h-4 w-4"/> Unload Logic</Button>
      </div>
    </div>
  );
}
