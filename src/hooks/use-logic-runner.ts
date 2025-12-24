
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

// Simple Web Audio API to play a beep sound
const playBeep = () => {
    if (typeof window === 'undefined' || !window.AudioContext) return;
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(440, audioContext.currentTime); // A4 note
    gainNode.gain.setValueAtTime(0.5, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.5);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
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
        addLogEntry(`Action triggered: ${action.type}`);

        if (navigator.vibrate) {
            navigator.vibrate(action.payload?.duration || 200);
        }
        playBeep();

        const feedbackOverlay = document.createElement('div');
        feedbackOverlay.className = 'flash-overlay';
        feedbackOverlay.innerHTML = `🔔 Action Triggered: <strong>${name}</strong>`;
        document.body.appendChild(feedbackOverlay);
        setTimeout(() => {
            if (document.body.contains(feedbackOverlay)) {
                document.body.removeChild(feedbackOverlay);
            }
        }, 2000);


        switch (action.type) {
            case 'flashBackground':
                const overlay = document.createElement('div');
                overlay.className = 'fixed inset-0 text-white text-2xl font-bold flex items-center justify-center z-50 animate-fade';
                const color = action.payload?.color || 'blue';
                // A simple mapping for bg colors from the limited set.
                const bgColorClass = {
                    'red': 'bg-red-600',
                    'green': 'bg-green-600',
                    'blue': 'bg-blue-600'
                }[color] || 'bg-gray-800';
                
                overlay.classList.add(bgColorClass);
                overlay.innerText = action.payload?.message || `Action: ${name}`;
                
                document.body.appendChild(overlay);
                setTimeout(() => {
                    if (document.body.contains(overlay)) {
                      document.body.removeChild(overlay);
                    }
                }, 1500);
                break;
            case 'vibrate':
                // The vibration is now handled in the generic feedback section above
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
        if (shouldTrigger && (now - lastTriggerTime.current > 2000)) { // Debounce for 2 seconds
            lastTriggerTime.current = now;
            triggerAction(logic);
        }

    }, [logic, sensorData, triggerAction]);

    return { eventLog, clearLog };
};
