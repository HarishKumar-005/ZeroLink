
"use client";

import { ScrollArea } from "./ui/scroll-area";
import { type EventLogEntry } from "@/types";
import { formatDistanceToNow } from "date-fns";
import { Button } from "./ui/button";
import { ListX, Bot } from "lucide-react";

interface EventLogProps {
    log: EventLogEntry[];
    onClearLog: () => void;
}

export function EventLog({ log, onClearLog }: EventLogProps) {
  return (
    <div className="space-y-2" aria-live="polite">
        <div className="flex justify-between items-center">
            <h4 className="font-semibold flex items-center gap-2"><Bot className="w-5 h-5"/> Event Log</h4>
            <Button variant="ghost" size="sm" onClick={onClearLog} disabled={log.length === 0}><ListX className="mr-2 h-4 w-4" /> Clear</Button>
        </div>
      <ScrollArea className="h-48 w-full rounded-md border bg-muted/20 p-4 font-mono text-sm">
        {log.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">No events triggered yet.</p>
        ) : (
          log.map(entry => (
            <div key={entry.id} className="flex items-start">
              <span className="text-muted-foreground mr-2 w-28 shrink-0">
                {formatDistanceToNow(entry.timestamp, { addSuffix: true })}:
              </span>
              <span className="break-words">{entry.message}</span>
            </div>
          ))
        )}
      </ScrollArea>
    </div>
  );
}
