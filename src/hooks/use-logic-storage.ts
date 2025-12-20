"use client";

import { useState, useEffect, useCallback } from 'react';
import { type Logic } from '@/types';
import { useToast } from './use-toast';
import { db } from '@/lib/firebase';
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, query, where } from 'firebase/firestore';

// Mock user ID - in a real app, this would come from an auth hook
const MOCK_USER_ID = 'local-user';

const LOCAL_STORAGE_KEY = `zero-link-logics-${MOCK_USER_ID}`;

export const useLogicStorage = () => {
    const { toast } = useToast();
    const [savedLogics, setSavedLogics] = useState<Logic[]>([]);
    const [isInitialized, setIsInitialized] = useState(false);

    const getLogicsCollection = () => {
        // This is a placeholder. In a real app with auth, you'd get the user ID dynamically.
        // For now, we simulate a "local" user collection vs a logged-in one.
        if (db && MOCK_USER_ID !== 'local-user') {
            return collection(db, `users/${MOCK_USER_ID}/logics`);
        }
        return null;
    }

    const persistToLocalStorage = (logics: Logic[]) => {
        if (typeof window === 'undefined') return;
        try {
            window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(logics));
        } catch (error) {
            console.error("Failed to save to local storage", error);
        }
    };
    
    // Load initial data from Firestore or localStorage
    useEffect(() => {
        const loadData = async () => {
            const logicsCollection = getLogicsCollection();
            if (logicsCollection) {
                try {
                    const snapshot = await getDocs(logicsCollection);
                    const logics = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Logic));
                    setSavedLogics(logics);
                } catch (error) {
                    console.error("Failed to load logics from Firestore", error);
                    toast({ title: 'Could not load saved logics from the cloud.', variant: 'destructive' });
                }
            } else if (typeof window !== 'undefined') {
                try {
                    const localData = window.localStorage.getItem(LOCAL_STORAGE_KEY);
                    if (localData) {
                        setSavedLogics(JSON.parse(localData));
                    }
                } catch (error) {
                    console.error("Failed to load logics from local storage", error);
                    toast({ title: 'Could not load saved logics.', variant: 'destructive' });
                }
            }
            setIsInitialized(true);
        };
        loadData();
    }, [toast]);


    const saveLogic = useCallback(async (logic: Logic) => {
        if (!logic.name) {
            toast({ title: 'Cannot save logic without a name.', variant: 'destructive'});
            return;
        }

        const logicsCollection = getLogicsCollection();
        let updatedLogics;

        if (logic.id) { // Existing logic
            if (logicsCollection) {
                const logicRef = doc(db, `users/${MOCK_USER_ID}/logics`, logic.id);
                await updateDoc(logicRef, logic);
            }
            updatedLogics = savedLogics.map(l => l.id === logic.id ? logic : l);
        } else { // New logic
            let newId = crypto.randomUUID();
            if (logicsCollection) {
                const docRef = await addDoc(logicsCollection, logic);
                newId = docRef.id;
            }
            const newLogic = { ...logic, id: newId };
            updatedLogics = [newLogic, ...savedLogics];
        }

        setSavedLogics(updatedLogics);
        if (!logicsCollection) {
            persistToLocalStorage(updatedLogics);
        }

        toast({ title: 'Logic Saved!', description: `'${logic.name}' has been saved.` });

    }, [savedLogics, toast]);

    const deleteLogic = useCallback(async (logicId: string) => {
        const logicsCollection = getLogicsCollection();

        if (logicsCollection) {
            try {
                await deleteDoc(doc(db, `users/${MOCK_USER_ID}/logics`, logicId));
            } catch (error) {
                console.error("Error deleting from Firestore:", error);
                toast({ title: 'Delete failed.', variant: 'destructive' });
                return;
            }
        }
        
        const newLogics = savedLogics.filter(l => l.id !== logicId);
        setSavedLogics(newLogics);

        if (!logicsCollection) {
            persistToLocalStorage(newLogics);
        }

        toast({ title: 'Logic Deleted' });
    }, [savedLogics, toast]);
    
    return { savedLogics, saveLogic, deleteLogic, isInitialized };
};
