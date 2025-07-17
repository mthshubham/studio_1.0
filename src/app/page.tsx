"use client";

import { useState, useEffect, useCallback } from "react";
import type { InstagramChat } from "@/types/instagram";
import { useToast } from "@/hooks/use-toast";
import FileUploadScreen from "@/components/file-upload-screen";
import ChatView from "@/components/chat-view";
import { Skeleton } from "@/components/ui/skeleton";

export default function Home() {
  const [chatData, setChatData] = useState<InstagramChat | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { toast } = useToast();

  useEffect(() => {
    try {
      const savedData = localStorage.getItem("instaChronicleData");
      if (savedData) {
        const parsedData = JSON.parse(savedData);
        // Basic validation
        if (parsedData.messages && parsedData.participants && parsedData.title) {
          setChatData(parsedData);
        }
      }
    } catch (error) {
      console.error("Failed to load data from localStorage", error);
      localStorage.removeItem("instaChronicleData");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleFileSelect = (file: File) => {
    setIsLoading(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const result = event.target?.result;
        if (typeof result !== 'string') {
          throw new Error("File could not be read properly.");
        }
        const parsedData = JSON.parse(result);
        
        // More robust validation
        if (!parsedData.messages || !Array.isArray(parsedData.messages) || !parsedData.participants || !parsedData.title) {
            toast({
                variant: "destructive",
                title: "Invalid File Format",
                description: "The selected JSON file does not have the expected Instagram chat structure.",
            });
            return;
        }

        // Sort messages by timestamp
        parsedData.messages.sort((a: any, b: any) => a.timestamp_ms - b.timestamp_ms);

        setChatData(parsedData);
        localStorage.setItem("instaChronicleData", JSON.stringify(parsedData));
        toast({
          title: "Success!",
          description: "Your chat history has been loaded.",
        });
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Upload Failed",
          description: "Please upload a valid JSON file from your Instagram data export.",
        });
        console.error("Error parsing JSON:", error);
      } finally {
        setIsLoading(false);
      }
    };
    reader.onerror = () => {
        toast({
            variant: "destructive",
            title: "File Read Error",
            description: "There was an error reading the file.",
        });
        setIsLoading(false);
    }
    reader.readAsText(file);
  };

  const handleClearData = useCallback(() => {
    localStorage.removeItem("instaChronicleData");
    setChatData(null);
    toast({
      title: "Data Cleared",
      description: "You can now upload a new file.",
    });
  }, [toast]);

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
      {chatData ? (
        <ChatView chatData={chatData} onClearData={handleClearData} />
      ) : (
        <FileUploadScreen onFileSelect={handleFileSelect} />
      )}
    </main>
  );
}
