"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { type Logic, type SensorData, type Condition, type EventLogEntry } from '@/types';

const checkCondition = (condition: Condition, sensorData: SensorData): boolean => {
    const sensorValue = sensorData[condition.sensor];
    switch (condition.operator) {
        case '>': return sensorValue > (condition.value as number);
        case '<': return sensorValue < (condition.value as number);
        case '=': return sensorValue === condition.value;
        case '!=': return sensorValue !== condition.value;
        default: return false;
    }
};

export const useLogicRunner = (logic: Logic | null, sensorData: SensorData) => {
    const [eventLog, setEventLog] = useState<EventLogEntry[]>([]);
    const lastTriggerTime = useRef<number>(0);
    
    const addLogEntry = useCallback((message: string) => {
        setEventLog(prev => [{ id: crypto.randomUUID(), timestamp: new Date(), message }, ...prev].slice(0, 50));
    }, []);

    const clearLog = () => setEventLog([]);

    const triggerAction = useCallback((logic: Logic) => {
        const { action } = logic;
        addLogEntry(`Action triggered: ${action.type}`);

        switch (action.type) {
            case 'flashBackground':
                const color = action.payload?.color || 'yellow';
                document.body.style.transition = 'background-color 0.1s ease-in-out';
                const originalColor = window.getComputedStyle(document.body).backgroundColor;
                document.body.style.backgroundColor = color;
                setTimeout(() => {
                    document.body.style.backgroundColor = originalColor;
                }, 500);
                break;
            case 'vibrate':
                if (navigator.vibrate) {
                    navigator.vibrate(action.payload?.duration || 200);
                }
                break;
            case 'log':
                console.log('LOG ACTION:', action.payload?.message || 'Logic action logged.');
                break;
        }
    }, [addLogEntry]);

    useEffect(() => {
        if (typeof window === 'undefined' || !logic) return;

        const { trigger } = logic;
        const conditionResults = trigger.conditions.map(c => checkCondition(c, sensorData));

        let shouldTrigger = false;
        if (trigger.type === 'all') {
            shouldTrigger = conditionResults.every(res => res === true);
        } else { // 'any'
            shouldTrigger = conditionResults.some(res => res === true);
        }

        const now = Date.now();
        if (shouldTrigger && (now - lastTriggerTime.current > 1000)) { // Debounce for 1 second
            lastTriggerTime.current = now;
            triggerAction(logic);
        }

    }, [logic, sensorData, triggerAction]);

    return { eventLog, clearLog };
};
