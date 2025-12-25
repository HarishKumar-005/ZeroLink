export type Condition = {
  sensor: 'light' | 'temperature' | 'motion' | 'timeOfDay';
  operator: '>' | '<' | '=' | '!=';
  value: number | boolean | string;
};

// A Trigger can be a single Condition or a group of other Triggers.
export type Trigger = Condition | {
  type: 'all' | 'any';
  conditions: Trigger[];
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
  triggers: Trigger[];
  actions: Action[];
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
