
"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { type Logic, type SensorData, type Condition, type EventLogEntry, type DeviceStates, Trigger, Action } from '@/types';
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
        return checkCondition(trigger, sensorData);
    }
    
    if (trigger.type === 'all') {
        return trigger.conditions.every(subTrigger => evaluateTrigger(subTrigger, sensorData));
    } else { // 'any'
        return trigger.conditions.some(subTrigger => evaluateTrigger(subTrigger, sensorData));
    }
}

const playBeep = () => {
    if (typeof window === 'undefined' || !window.AudioContext) return;
    try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(660, audioContext.currentTime);
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.3);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.3);
    } catch (e) {
        console.error("Audio context error:", e);
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
        
        // Log every action for consistent feedback, unless it's a toggle with a custom message
        if (action.type !== 'toggle') {
            const message = action.payload?.message || defaultMessage;
            addLogEntry(message);
        }
        playBeep();

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

        const triggers = Array.isArray(logic.triggers) ? logic.triggers : [logic.triggers];
        const actions = Array.isArray(logic.actions) ? logic.actions : [logic.actions];

        const now = Date.now();
        if (now - lastTriggerTime.current < 2000) {
             return; // Debounce for 2 seconds
        }

        let somethingTriggered = false;
        triggers.forEach((trigger, index) => {
            if (evaluateTrigger(trigger, sensorData)) {
                somethingTriggered = true;
                const actionToRun = actions[index] || actions[0]; // Fallback to first action
                if(actionToRun){
                    triggerAction(actionToRun, logic.name);
                }
            }
        });
        
        if (somethingTriggered) {
             lastTriggerTime.current = now;
        }

    }, [logic, sensorData, triggerAction]);

    return { eventLog, clearLog };
};
