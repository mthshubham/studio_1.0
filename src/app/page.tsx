"use client";

import { useState, useEffect, useCallback } from "react";
import JSZip from "jszip";
import type { InstagramChat } from "@/types/instagram";
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
      const chatFiles = Object.values(zip.files).filter((f) =>
        f.name.endsWith("message_1.json") && !f.name.startsWith("__MACOSX")
      );

      if (chatFiles.length === 0) {
        toast({
          variant: "destructive",
          title: "No Chats Found",
          description: "Could not find any 'message_1.json' files in the zip archive. Please ensure you've uploaded the correct file.",
        });
        setIsLoading(false);
        return;
      }

      const allChats: InstagramChat[] = [];
      for (const chatFile of chatFiles) {
        try {
            const content = await chatFile.async("string");
            const parsedData = JSON.parse(content);
            if (parsedData.messages && parsedData.participants && parsedData.title) {
            // It's a valid chat file, add it to our list
            parsedData.messages.sort((a: any, b: any) => a.timestamp_ms - b.timestamp_ms);
            allChats.push(parsedData);
            }
        } catch (jsonError) {
            console.warn(`Skipping file due to JSON parsing error: ${chatFile.name}`, jsonError);
            // This file might not be a chat log, so we can safely ignore it.
        }
      }
      
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
