
"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { type Logic, type SensorData, type Condition, type EventLogEntry } from '@/types';
import { toast } from './use-toast';

const checkCondition = (condition: Condition, sensorData: SensorData): boolean => {
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

export const useLogicRunner = (logic: Logic | null, sensorData: SensorData) => {
    const [eventLog, setEventLog] = useState<EventLogEntry[]>([]);
    const lastTriggerTime = useRef<number>(0);
    
    const addLogEntry = useCallback((message: string) => {
        setEventLog(prev => [{ id: crypto.randomUUID(), timestamp: new Date(), message }, ...prev].slice(0, 50));
    }, []);

    const clearLog = () => setEventLog([]);

    const triggerAction = useCallback((logic: Logic) => {
        const { action, name } = logic;
        const message = action.payload?.message || `Action '${action.type}' triggered by '${name}'`;
        addLogEntry(message);
        playBeep();

        switch (action.type) {
            case 'flashBackground':
                const overlay = document.createElement('div');
                overlay.className = 'flash-overlay';
                overlay.innerHTML = `<span>${message}</span>`;
                
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
                if (navigator.vibrate) {
                    navigator.vibrate(action.payload?.duration || [200, 100, 200]);
                }
                break;
            case 'log':
                console.log('LOG ACTION:', message);
                toast({
                    title: '✅ Simulated Log',
                    description: message,
                })
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
        if (shouldTrigger && (now - lastTriggerTime.current > 2000)) { // Debounce for 2 seconds
            lastTriggerTime.current = now;
            triggerAction(logic);
        }

    }, [logic, sensorData, triggerAction]);

    return { eventLog, clearLog };
};
