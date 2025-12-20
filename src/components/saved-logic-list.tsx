"use client";

import { type Logic } from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { ScrollArea } from "./ui/scroll-area";
import { Download, Trash2 } from "lucide-react";

interface SavedLogicListProps {
  savedLogics: Logic[];
  onLoad: (logic: Logic) => void;
  onDelete: (id: string) => void;
}

export function SavedLogicList({ savedLogics, onLoad, onDelete }: SavedLogicListProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Saved Logics</CardTitle>
        <CardDescription>Load or manage your saved automation rules.</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-96">
          {savedLogics.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-muted-foreground">No logic saved yet.</p>
            </div>
          ) : (
            <div className="space-y-2 pr-4">
              {savedLogics.map(logic => (
                <div key={logic.id} className="flex items-center justify-between p-2 rounded-md border hover:bg-muted/50">
                  <span className="font-medium truncate pr-2">{logic.name}</span>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => onLoad(logic)} aria-label={`Load ${logic.name}`}>
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => logic.id && onDelete(logic.id)} aria-label={`Delete ${logic.name}`}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
