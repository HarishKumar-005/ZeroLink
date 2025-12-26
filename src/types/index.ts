
// All core types are now inferred from the Zod schemas in `src/lib/schema.ts`.
// This file can be expanded with other application types that are not part of the Logic schema.

export type { Logic, Action, Trigger, Condition } from "@/lib/schema";

export type SensorData = {
  light: number;
  temperature: number;
  motion: boolean;
};

export type DeviceStates = {
  fan: boolean;
  light: boolean;
  pump: boolean;
  siren: boolean;
}

export type EventLogEntry = {
  id: string;
  timestamp: Date;
  message: string;
};
