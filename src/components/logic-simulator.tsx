
"use client";

import { type Logic, type SensorData, type EventLogEntry } from "@/types";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "./ui/card";
import { Label } from "./ui/label";
import { Slider } from "./ui/slider";
import { Input } from "./ui/input";
import { Switch } from "./ui/switch";
import { Button } from "./ui/button";
import { Sun, Thermometer, Accessibility, Save, Trash2 } from "lucide-react";
import { EventLog } from "./event-log";
import { cn } from "@/lib/utils";

interface LogicSimulatorProps {
  logic: Logic;
  sensorData: SensorData;
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
  onSensorChange,
  onSave,
  onClear,
  eventLog,
  onClearLog,
  className
}: LogicSimulatorProps) {
  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <CardTitle>Logic Simulation: <span className="text-primary">{logic.name}</span></CardTitle>
        <CardDescription>Adjust the sensor values to test the loaded logic.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          {/* Light Sensor */}
          <div className="flex items-center gap-4">
            <Label htmlFor="light-sensor" className="flex items-center gap-2 w-28"><Sun /> Light</Label>
            <Slider
              id="light-sensor"
              min={0}
              max={1000}
              step={10}
              value={[sensorData.light]}
              onValueChange={(value) => onSensorChange({ ...sensorData, light: value[0] })}
            />
            <span className="w-12 text-right">{sensorData.light} lx</span>
          </div>

          {/* Temperature Sensor */}
          <div className="flex items-center gap-4">
            <Label htmlFor="temp-sensor" className="flex items-center gap-2 w-28"><Thermometer /> Temp</Label>
            <Input
              id="temp-sensor"
              type="number"
              value={sensorData.temperature}
              onChange={(e) => onSensorChange({ ...sensorData, temperature: Number(e.target.value) })}
              className="w-24"
            />
            <span>°C</span>
          </div>

          {/* Motion Sensor */}
          <div className="flex items-center gap-4">
            <Label htmlFor="motion-sensor" className="flex items-center gap-2 w-28"><Accessibility /> Motion</Label>
            <Switch
              id="motion-sensor"
              checked={sensorData.motion}
              onCheckedChange={(checked) => onSensorChange({ ...sensorData, motion: checked })}
            />
             <span className="text-muted-foreground">{sensorData.motion ? 'Detected' : 'None'}</span>
          </div>
        </div>

        <EventLog log={eventLog} onClearLog={onClearLog} />

      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={onSave}><Save className="mr-2 h-4 w-4"/> Save Logic</Button>
        <Button variant="ghost" onClick={onClear}><Trash2 className="mr-2 h-4 w-4"/> Unload Logic</Button>
      </CardFooter>
    </Card>
  );
}
