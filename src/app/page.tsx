"use client";

import { useState, useCallback } from "react";
import JSZip from "jszip";
import type { InstagramChat, InstagramMessage } from "@/types/instagram";
import { useToast } from "@/hooks/use-toast";
import FileUploadScreen from "@/components/file-upload-screen";
import ChatView from "@/components/chat-view";
import ChatListScreen from "@/components/chat-list-screen";
import { Skeleton } from "@/components/ui/skeleton";

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
      
      const chats: { [key: string]: Partial<InstagramChat> & { messages: InstagramMessage[] } } = {};

      for (const messageFile of messageFiles) {
        try {
            const content = await messageFile.async("string");
            const parsedData = JSON.parse(content);
            const threadPath = parsedData.thread_path;

            if (!chats[threadPath]) {
              chats[threadPath] = { 
                ...parsedData,
                messages: [], // Initialize with parsed data, but empty messages
              };
            }
            
            if (Array.isArray(parsedData.messages)) {
              chats[threadPath].messages!.push(...parsedData.messages);
            }

        } catch (jsonError) {
            console.warn(`Skipping file due to JSON parsing error: ${messageFile.name}`, jsonError);
        }
      }
      
      const allChats: InstagramChat[] = Object.values(chats).filter(
        (c): c is InstagramChat => !!(c.messages && c.participants && c.title && c.thread_path)
      ).map((chat) => {
        chat.messages.sort((a, b) => a.timestamp_ms - b.timestamp_ms);
        return chat;
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
            <Skeleton className="h-12 w-1/3" />
            <Skeleton className="h-8 w-full" />
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
