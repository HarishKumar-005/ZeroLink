
import { z } from "zod";

// This file is now the single source of truth for the Logic data structure.

// Base condition for a single sensor check
const BaseConditionSchema = z.object({
  sensor: z.enum(['light', 'temperature', 'motion', 'timeOfDay']),
  operator: z.enum(['>', '<', '=', '!=']),
  value: z.union([z.number(), z.boolean(), z.string()]),
});

// A trigger can be a single condition or a nested group of conditions
export const TriggerSchema: z.ZodType<any> = z.lazy(() =>
  z.union([
    BaseConditionSchema,
    z.object({
      type: z.enum(['all', 'any']),
      conditions: z.array(TriggerSchema),
    }),
  ])
);

// An action to be performed when a trigger is met
export const ActionSchema = z.object({
  type: z.enum(['flashBackground', 'vibrate', 'log', 'toggle']),
  payload: z.object({
    message: z.string().optional(),
    color: z.string().optional(),
    duration: z.number().optional(),
    device: z.enum(['light', 'fan', 'pump', 'siren']).optional(),
    state: z.enum(['on', 'off']).optional(),
  }).optional(),
});

// The main Logic schema, combining triggers and actions
export const LogicSchema = z.object({
  id: z.string().optional(), // for storage
  name: z.string(),
  triggers: z.union([TriggerSchema, z.array(TriggerSchema)]),
  actions: z.union([ActionSchema, z.array(ActionSchema)]),
});

// INFERRED TYPES: All other parts of the app will use these types.
export type Logic = z.infer<typeof LogicSchema>;
export type Action = z.infer<typeof ActionSchema>;
export type Trigger = z.infer<typeof TriggerSchema>;
export type Condition = z.infer<typeof BaseConditionSchema>;
