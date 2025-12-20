"use client";

import { useState, useEffect, useCallback } from 'react';
import { type Logic } from '@/types';
import { useToast } from './use-toast';
import { db } from '@/lib/firebase'; // Mocked for now

const LOCAL_STORAGE_KEY = 'zero-link-logics';

export const useLogicStorage = () => {
    const { toast } = useToast();
    const [savedLogics, setSavedLogics] = useState<Logic[]>([]);
    const [isInitialized, setIsInitialized] = useState(false);

    // Load initial data from localStorage
    useEffect(() => {
        if (typeof window !== 'undefined') {
            try {
                const localData = window.localStorage.getItem(LOCAL_STORAGE_KEY);
                if (localData) {
                    const logics = JSON.parse(localData) as Logic[];
                    setSavedLogics(logics);
                }
            } catch (error) {
                console.error("Failed to load logics from local storage", error);
                toast({ title: 'Could not load saved logics.', variant: 'destructive' });
            }
            setIsInitialized(true);
        }
    }, [toast]);

    const persistToLocalStorage = (logics: Logic[]) => {
        if (typeof window === 'undefined') return;
        try {
            window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(logics));
        } catch (error) {
            console.error("Failed to save to local storage", error);
        }
    };

    const saveLogic = useCallback(async (logic: Logic) => {
        if (!logic.name) {
            toast({ title: 'Cannot save logic without a name.', variant: 'destructive'});
            return;
        }

        // In a real app with Firebase, you'd do this:
        if (db) {
            // ... firebase save logic here
        }

        const newLogics = [...savedLogics];
        const logicWithId = { ...logic, id: logic.id || crypto.randomUUID() };
        const existingIndex = newLogics.findIndex(l => l.id === logicWithId.id);

        if (existingIndex > -1) {
            newLogics[existingIndex] = logicWithId;
        } else {
            newLogics.unshift(logicWithId);
        }

        setSavedLogics(newLogics);
        persistToLocalStorage(newLogics);
        toast({ title: 'Logic Saved!', description: `'${logic.name}' has been saved locally.` });

    }, [savedLogics, toast]);

    const deleteLogic = useCallback(async (logicId: string) => {
        // In a real app with Firebase, you'd do this:
        if (db) {
            // ... firebase delete logic here
        }

        const newLogics = savedLogics.filter(l => l.id !== logicId);
        setSavedLogics(newLogics);
        persistToLocalStorage(newLogics);
        toast({ title: 'Logic Deleted' });
    }, [savedLogics, toast]);
    
    return { savedLogics, saveLogic, deleteLogic, isInitialized };
};
