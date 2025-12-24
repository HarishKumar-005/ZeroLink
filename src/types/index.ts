export type Condition = {
  sensor: 'light' | 'temperature' | 'motion';
  operator: '>' | '<' | '=' | '!=';
  value: number | boolean | string;
};

export type Trigger = {
  type: 'all' | 'any';
  conditions: Condition[];
};

export type Action = {
  type: 'flashBackground' | 'vibrate' | 'log' | 'toggle';
  payload?: {
    // For flashBackground
    color?: string;
    message?: string;
    duration?: number;

    // For toggle
    device?: 'light' | 'fan' | 'pump' | 'siren';
    state?: 'on' | 'off';
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
