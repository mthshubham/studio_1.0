"use client";

import { forwardRef } from 'react';
import type { InstagramMessage } from "@/types/instagram";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface MessageBubbleProps {
  message: InstagramMessage;
  isOwner: boolean;
  searchQuery: string;
}

const highlightText = (text: string, query: string) => {
    if (!query) return text;
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return (
      <>
        {parts.map((part, i) =>
          part.toLowerCase() === query.toLowerCase() ? (
            <mark key={i} className="bg-yellow-300 dark:bg-yellow-500 rounded px-0.5">
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </>
    );
};

const MessageBubble = forwardRef<HTMLDivElement, MessageBubbleProps>(({ message, isOwner, searchQuery }, ref) => {
  
  const renderContent = () => {
    if (message.content) {
      return <p className="text-sm md:text-base whitespace-pre-wrap break-words">{highlightText(message.content, searchQuery)}</p>;
    }
    if (message.photos && message.photos.length > 0) {
        return <div className="text-sm italic text-muted-foreground">[Photo]</div>
    }
    if (message.videos && message.videos.length > 0) {
        return <div className="text-sm italic text-muted-foreground">[Video]</div>
    }
    if (message.audio_files && message.audio_files.length > 0) {
        return <div className="text-sm italic text-muted-foreground">[Audio]</div>
    }
    if (message.share) {
        return <div className="text-sm italic text-muted-foreground">[Shared Link]</div>
    }
    if (message.call_duration !== undefined) {
        return <div className="text-sm italic text-muted-foreground">[Call]</div>
    }
    return <div className="text-sm italic text-muted-foreground">[Unsupported message type]</div>;
  };

  return (
    <div
      ref={ref}
      className={cn(
        "flex w-full items-start gap-3",
        isOwner ? "justify-start" : "justify-end"
      )}
    >
      <div
        className={cn(
          "max-w-[75%] rounded-2xl p-3 shadow-md",
          !isOwner
            ? "rounded-br-lg bg-accent text-accent-foreground"
            : "rounded-bl-lg bg-card"
        )}
      >
        <div className="flex flex-col">
            {isOwner && <p className="text-xs font-semibold mb-1">{message.sender_name}</p>}
            {renderContent()}
            <p className={cn("text-xs mt-1.5 opacity-70", !isOwner ? "text-right" : "text-left")}>
                {format(new Date(message.timestamp_ms), "h:mm a")}
            </p>
        </div>
      </div>
    </div>
  );
});

MessageBubble.displayName = "MessageBubble";

export default MessageBubble;
