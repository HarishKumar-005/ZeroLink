"use client";

import { ScrollArea } from "./ui/scroll-area";
import { type EventLogEntry } from "@/types";
import { formatDistanceToNow } from "date-fns";
import { Button } from "./ui/button";
import { ListX } from "lucide-react";

interface EventLogProps {
    log: EventLogEntry[];
    onClearLog: () => void;
}

export function EventLog({ log, onClearLog }: EventLogProps) {
  return (
    <div className="space-y-2">
        <div className="flex justify-between items-center">
            <h4 className="font-semibold">Event Log</h4>
            <Button variant="ghost" size="sm" onClick={onClearLog} disabled={log.length === 0}><ListX className="mr-2 h-4 w-4" /> Clear</Button>
        </div>
      <ScrollArea className="h-48 w-full rounded-md border p-4 font-mono text-sm">
        {log.length === 0 ? (
          <p className="text-muted-foreground">No events triggered yet.</p>
        ) : (
          log.map(entry => (
            <div key={entry.id}>
              <span className="text-muted-foreground mr-2">
                {formatDistanceToNow(entry.timestamp, { addSuffix: true })}:
              </span>
              <span>{entry.message}</span>
            </div>
          ))
        )}
      </ScrollArea>
    </div>
  );
}
