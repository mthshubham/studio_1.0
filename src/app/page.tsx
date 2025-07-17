"use client";

import { useState, useEffect, useCallback } from "react";
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
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { toast } = useToast();

  useEffect(() => {
    try {
      const savedData = localStorage.getItem("instaChronicleAllChats");
      if (savedData) {
        const parsedData = JSON.parse(savedData);
        if (Array.isArray(parsedData) && parsedData.length > 0) {
          setAllChatsData(parsedData);
        }
      }
    } catch (error) {
      console.error("Failed to load data from localStorage", error);
      localStorage.removeItem("instaChronicleAllChats");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleFileSelect = async (file: File) => {
    setIsLoading(true);
    try {
      const zip = await JSZip.loadAsync(file);
      const messageFiles = Object.values(zip.files).filter((f) =>
        /messages\/inbox\/[^/]+\/message_\d+\.json$/.test(f.name) && !f.name.startsWith("__MACOSX")
      );

      if (messageFiles.length === 0) {
        toast({
          variant: "destructive",
          title: "No Chats Found",
          description: "Could not find any 'message_x.json' files in the expected folder structure. Please ensure you've uploaded the correct file.",
        });
        setIsLoading(false);
        return;
      }
      
      const chats: { [key: string]: Partial<InstagramChat> & { messages: InstagramMessage[] } } = {};

      for (const messageFile of messageFiles) {
        try {
            const content = await messageFile.async("string");
            const parsedData = JSON.parse(content);
            const threadPath = messageFile.name.split('/').slice(0, -1).join('/');

            if (!chats[threadPath]) {
              chats[threadPath] = { messages: [] };
            }
            
            // Merge properties from the JSON file, but don't overwrite existing messages
            Object.assign(chats[threadPath], {
                ...parsedData,
                messages: chats[threadPath].messages || [], 
                thread_path: threadPath
            });
            
            if (Array.isArray(parsedData.messages)) {
              chats[threadPath].messages.push(...parsedData.messages);
            }

        } catch (jsonError) {
            console.warn(`Skipping file due to JSON parsing error: ${messageFile.name}`, jsonError);
        }
      }
      
      const allChats: InstagramChat[] = Object.values(chats).filter(
        (c): c is InstagramChat => !!(c.messages && c.participants && c.title && c.thread_path)
      ).map((chat) => {
        // Ensure newest message is last
        chat.messages.sort((a, b) => a.timestamp_ms - b.timestamp_ms);
        return chat;
      });


      if (allChats.length === 0) {
        toast({
            variant: "destructive",
            title: "No Valid Chats Found",
            description: "Found some JSON files, but they weren't in the expected chat format.",
        });
        setIsLoading(false);
        return;
      }

      setAllChatsData(allChats);
      localStorage.setItem("instaChronicleAllChats", JSON.stringify(allChats));
      toast({
        title: "Success!",
        description: `Found ${allChats.length} conversations.`,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Upload Failed",
        description: "Please upload a valid zip file from your Instagram data export.",
      });
      console.error("Error processing zip file:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearData = useCallback(() => {
    localStorage.removeItem("instaChronicleAllChats");
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
