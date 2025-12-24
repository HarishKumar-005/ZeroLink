export type Condition = {
  sensor: 'light' | 'temperature' | 'motion';
  operator: '>' | '<' | '=' | '!=' | '===' | '!==';
  value: number | boolean | string;
};

export type Trigger = {
  type: 'all' | 'any';
  conditions: Condition[];
};

export type Action = {
  type: 'flashBackground' | 'vibrate' | 'log';
  payload?: {
    color?: string;
    message?: string;
    duration?: number; // for vibration
  };
};

export interface Logic {
  id?: string; // for storage
  name: string;
  trigger: Trigger;
  action: Action;
}

export type SensorData = {
  light: number;
  temperature: number;
  motion: boolean;
};

export type EventLogEntry = {
  id: string;
  timestamp: Date;
  message: string;
};
