"use client";

import { useState, useCallback } from "react";
import JSZip from "jszip";
import type { InstagramChat, InstagramMessage } from "@/types/instagram";
import { useToast } from "@/hooks/use-toast";
import FileUploadScreen from "@/components/file-upload-screen";
import ChatView from "@/components/chat-view";
import ChatListScreen from "@/components/chat-list-screen";
import { Skeleton } from "@/components/ui/skeleton";
import { fixInstagramString } from "@/lib/utils";

export default function Home() {
  const [allChatsData, setAllChatsData] = useState<InstagramChat[] | null>(null);
  const [selectedChat, setSelectedChat] = useState<InstagramChat | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { toast } = useToast();

  const handleFileSelect = async (file: File) => {
    setIsLoading(true);
    try {
      const zip = await JSZip.loadAsync(file);
      const messageFiles = Object.values(zip.files).filter((f) =>
        /message_\d+\.json$/.test(f.name) && !f.name.startsWith("__MACOSX")
      );

      if (messageFiles.length === 0) {
        toast({
          variant: "destructive",
          title: "No Chats Found",
          description: "Could not find any 'message_x.json' files. Please ensure you've uploaded the correct zip file.",
        });
        setIsLoading(false);
        return;
      }
      
      const chats: { [key: string]: InstagramChat } = {};

      for (const messageFile of messageFiles) {
        try {
            const content = await messageFile.async("string");
            const rawData = JSON.parse(content);
            const threadPath = rawData.thread_path;

            // If chat doesn't exist, create it with properly encoded data
            if (!chats[threadPath]) {
              const participants = rawData.participants.map((p: any) => ({ name: fixInstagramString(p.name) }));
              const title = fixInstagramString(rawData.title);
              
              chats[threadPath] = {
                ...rawData,
                participants,
                title,
                messages: [], // Initialize with empty messages
              };
            }
            
            // Process and add messages to the existing chat
            if (Array.isArray(rawData.messages)) {
              const newMessages = rawData.messages.map((m: any) => ({
                ...m,
                sender_name: fixInstagramString(m.sender_name),
                content: m.content ? fixInstagramString(m.content) : undefined,
                reactions: m.reactions?.map((r: any) => ({
                  ...r,
                  reaction: fixInstagramString(r.reaction),
                  actor: fixInstagramString(r.actor),
                }))
              }));
              chats[threadPath].messages.push(...newMessages);
            }

        } catch (jsonError) {
            console.warn(`Skipping file due to JSON parsing error: ${messageFile.name}`, jsonError);
        }
      }
      
      const allChats: InstagramChat[] = Object.values(chats).filter(
        (c): c is InstagramChat => !!(c.messages && c.participants && c.title && c.thread_path)
      );

      // Sort messages within each chat after all files are processed
      allChats.forEach((chat) => {
        chat.messages.sort((a, b) => a.timestamp_ms - b.timestamp_ms);
      });

      if (allChats.length === 0) {
        toast({
            variant: "destructive",
            title: "No Valid Chats Found",
            description: "Found JSON files, but they weren't in the expected chat format.",
        });
        setIsLoading(false);
        return;
      }

      setAllChatsData(allChats);
      
      toast({
        title: "Success!",
        description: `Found ${allChats.length} conversations.`,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Upload Failed",
        description: "An error occurred while processing the zip file.",
      });
      console.error("Error processing zip file:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearData = useCallback(() => {
    setAllChatsData(null);
    setSelectedChat(null);
    toast({
      title: "Data Cleared",
      description: "You can now upload a new file.",
    });
  }, [toast]);

  const handleSelectChat = (chat: InstagramChat) => {
    setSelectedChat(chat);
  };
  
  const handleBackToList = () => {
    setSelectedChat(null);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-screen items-center justify-center p-4 bg-background">
        <div className="w-full max-w-2xl space-y-4">
            <h1 className="text-3xl font-bold text-center">InstaChronicle</h1>
            <p className="text-center text-muted-foreground pt-4">Processing your chats, this may take a moment...</p>
            <div className="space-y-2 pt-8">
                <Skeleton className="h-16 w-3/4 ml-auto rounded-lg"/>
                <Skeleton className="h-20 w-2/3 rounded-lg"/>
                <Skeleton className="h-10 w-1/2 ml-auto rounded-lg"/>
            </div>
        </div>
      </div>
    );
  }
  
  return (
    <main className="h-full bg-background">
      {!allChatsData ? (
        <FileUploadScreen onFileSelect={handleFileSelect} />
      ) : selectedChat ? (
        <ChatView chatData={selectedChat} onClearData={handleClearData} onBack={handleBackToList}/>
      ) : (
        <ChatListScreen chats={allChatsData} onSelectChat={handleSelectChat} onClearData={handleClearData} />
      )}
    </main>
  );
}
