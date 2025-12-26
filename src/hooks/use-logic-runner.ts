
"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { type Logic, type SensorData, type Condition, type EventLogEntry, type DeviceStates, Trigger, Action } from '@/lib/schema';
import { toast } from './use-toast';

const getTimeOfDay = () => {
    const hour = new Date().getHours();
    return (hour > 6 && hour < 19) ? 'day' : 'night';
}

const checkCondition = (condition: Condition, sensorData: SensorData): boolean => {
    if (condition.sensor === 'timeOfDay') {
        const currentTimeOfDay = getTimeOfDay();
        switch (condition.operator) {
            case '=': return currentTimeOfDay === condition.value;
            case '!=': return currentTimeOfDay !== condition.value;
            default: return false;
        }
    }

    const sensorValue = sensorData[condition.sensor];
    switch (condition.operator) {
        case '>': return sensorValue > (condition.value as number);
        case '<': return sensorValue < (condition.value as number);
        case '=': 
            return String(sensorValue).toLowerCase() === String(condition.value).toLowerCase();
        case '!=':
            return String(sensorValue).toLowerCase() !== String(condition.value).toLowerCase();
        default: return false;
    }
};

const evaluateTrigger = (trigger: Trigger, sensorData: SensorData): boolean => {
    if ('sensor' in trigger) {
        return checkCondition(trigger as Condition, sensorData);
    }
    
    const triggerGroup = trigger as { type: 'all' | 'any', conditions: Trigger[] };
    if (triggerGroup.type === 'all') {
        return triggerGroup.conditions.every(subTrigger => evaluateTrigger(subTrigger, sensorData));
    } else { // 'any'
        return triggerGroup.conditions.some(subTrigger => evaluateTrigger(subTrigger, sensorData));
    }
}

// Triggers a brief visual pulse and haptic feedback
const triggerFeedback = () => {
    if (typeof window === 'undefined') return;

    // Visual pulse effect
    document.body.classList.remove('logic-pulse');
    // Use a timeout to ensure the class is re-applied for rapid triggers
    setTimeout(() => {
        document.body.classList.add('logic-pulse');
        setTimeout(() => document.body.classList.remove('logic-pulse'), 400);
    }, 10);
    
    // Haptic feedback
    if (navigator.vibrate) {
        // This will only work if the user has interacted with the page.
        // It fails silently if blocked by the browser.
        navigator.vibrate(150);
    }
};

export const useLogicRunner = (
    logic: Logic | null, 
    sensorData: SensorData,
    onDeviceStateChange: (device: keyof DeviceStates, state: boolean) => void
) => {
    const [eventLog, setEventLog] = useState<EventLogEntry[]>([]);
    const lastTriggerTime = useRef<number>(0);
    
    const addLogEntry = useCallback((message: string) => {
        setEventLog(prev => [{ id: crypto.randomUUID(), timestamp: new Date(), message }, ...prev].slice(0, 50));
    }, []);

    const clearLog = () => setEventLog([]);

    const triggerAction = useCallback((action: Action, logicName: string) => {
        const defaultMessage = `Action '${action.type}' triggered by '${logicName}'`;
        
        // Log every action for consistent feedback
        if (action.type !== 'toggle') {
            const message = action.payload?.message || defaultMessage;
            addLogEntry(message);
        }

        // Trigger the new visual and haptic feedback
        triggerFeedback();

        switch (action.type) {
            case 'flashBackground':
                const flashMessage = action.payload?.message || defaultMessage;
                const overlay = document.createElement('div');
                overlay.className = 'flash-overlay';
                overlay.innerHTML = `<span>${flashMessage}</span>`;
                
                const color = action.payload?.color?.toLowerCase() || 'blue';
                const colorMap: Record<string, string> = {
                    red: 'bg-red-600/90',
                    green: 'bg-green-600/90',
                    blue: 'bg-blue-600/90',
                    yellow: 'bg-yellow-500/90',
                };
                overlay.classList.add(colorMap[color] || 'bg-primary/90');
                
                document.body.appendChild(overlay);
                setTimeout(() => {
                    if (document.body.contains(overlay)) {
                        document.body.removeChild(overlay);
                    }
                }, 1500);

                if (navigator.vibrate) {
                    navigator.vibrate(action.payload?.duration || 200);
                }
                break;
            case 'vibrate':
                 addLogEntry("📳 Device is vibrating...");
                if (navigator.vibrate) {
                    navigator.vibrate(action.payload?.duration || [200, 100, 200]);
                }
                break;
            case 'log':
                const logMessage = action.payload?.message || defaultMessage;
                 addLogEntry(`✅ Simulated Log: ${logMessage}`);
                console.log('LOG ACTION:', logMessage);
                toast({
                    title: '✅ Simulated Log',
                    description: logMessage,
                })
                break;
            case 'toggle':
                const { device, state } = action.payload || {};
                if (device && state) {
                    const newState = state === 'on';
                    onDeviceStateChange(device, newState);
                    const status = newState ? "ON" : "OFF";
                    const icon = newState ? "🟢" : "🔴";
                    addLogEntry(`${icon} Device '${device}' was turned ${status}.`);
                } else {
                    console.warn("Invalid toggle action: missing device or state", action.payload);
                    addLogEntry(`⚠️ Invalid toggle action received.`);
                }
                break;
        }
    }, [addLogEntry, onDeviceStateChange]);

    useEffect(() => {
        if (typeof window === 'undefined' || !logic) return;

        // Normalize triggers and actions to always be arrays for consistent processing
        const triggers = Array.isArray(logic.triggers) ? logic.triggers : [logic.triggers];
        const actions = Array.isArray(logic.actions) ? logic.actions : [logic.actions];

        const now = Date.now();
        if (now - lastTriggerTime.current < 2000) {
             return; // Debounce for 2 seconds
        }

        const isTriggered = triggers.some(trigger => evaluateTrigger(trigger, sensorData));

        if (isTriggered) {
            actions.forEach(action => {
                triggerAction(action, logic.name);
            });
            lastTriggerTime.current = now;
        }

    }, [logic, sensorData, triggerAction]);

    return { eventLog, clearLog };
};
