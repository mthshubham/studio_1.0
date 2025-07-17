"use client";

import { useState, useCallback } from "react";
import JSZip from "jszip";
import type { InstagramChat, InstagramMessage, ChatFile } from "@/types/instagram";
import { useToast } from "@/hooks/use-toast";
import FileUploadScreen from "@/components/file-upload-screen";
import ChatView from "@/components/chat-view";
import ChatListScreen from "@/components/chat-list-screen";
import { Skeleton } from "@/components/ui/skeleton";
import { fixInstagramString } from "@/lib/utils";

// This represents the chat data once it's fully loaded for viewing
export type LoadedInstagramChat = Omit<InstagramChat, 'files' | 'messageCount'> & {
  messages: InstagramMessage[];
};

export default function Home() {
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [allChatsData, setAllChatsData] = useState<InstagramChat[] | null>(null);
  const [selectedChat, setSelectedChat] = useState<LoadedInstagramChat | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isChatLoading, setIsChatLoading] = useState<boolean>(false);
  const { toast } = useToast();

  const handleFileSelect = async (file: File) => {
    setIsLoading(true);
    setZipFile(file); // Store the file in state
    try {
      const zip = await JSZip.loadAsync(file);
      
      const chatFiles: { [key: string]: ChatFile[] } = {};
      const filePromises = [];

      for (const zipEntry of Object.values(zip.files)) {
        if (/inbox\/[^\/]+\/message_\d+\.json$/.test(zipEntry.name) && !zipEntry.name.startsWith("__MACOSX")) {
          const promise = zipEntry.async("string").then(content => {
            try {
              const data = JSON.parse(content);
              const threadPath = data.thread_path;
              if (threadPath && data.messages) {
                if (!chatFiles[threadPath]) {
                  chatFiles[threadPath] = [];
                }
                // Don't store content, just the reference and message count
                chatFiles[threadPath].push({
                  name: zipEntry.name,
                  messageCount: data.messages.length
                });
              }
            } catch (e) {
              console.warn(`Skipping file due to JSON parsing error: ${zipEntry.name}`, e);
            }
          });
          filePromises.push(promise);
        }
      }

      await Promise.all(filePromises);

      const allChats: InstagramChat[] = [];
      const chatDetailsPromises = [];

      for (const threadPath in chatFiles) {
        const files = chatFiles[threadPath];
        if (files.length > 0) {
          const firstFileName = files[0].name;
          const promise = zip.file(firstFileName)?.async("string").then(content => {
            if (content) {
              try {
                const data = JSON.parse(content);
                allChats.push({
                  participants: data.participants.map((p: any) => ({ name: fixInstagramString(p.name) })),
                  title: fixInstagramString(data.title),
                  thread_path: data.thread_path,
                  is_still_participant: data.is_still_participant,
                  thread_type: data.thread_type,
                  files: files,
                  messageCount: files.reduce((sum, f) => sum + f.messageCount, 0),
                });
              } catch (e) {
                  console.warn(`Could not parse chat details from ${firstFileName}`, e)
              }
            }
          });
          chatDetailsPromises.push(promise);
        }
      }

      await Promise.all(chatDetailsPromises);

      if (allChats.length === 0) {
        toast({
          variant: "destructive",
          title: "No Chats Found",
          description: "Could not find any 'message_x.json' files in the expected folder structure.",
        });
        setIsLoading(false);
        setZipFile(null);
        return;
      }

      setAllChatsData(allChats);
      
      toast({
        title: "Success!",
        description: `Found ${allChats.length} conversations. Select one to view the messages.`,
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

  const handleSelectChat = useCallback(async (chat: InstagramChat) => {
    setIsChatLoading(true);
    if (!zipFile) {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not find the uploaded ZIP file.' });
        setIsChatLoading(false);
        return;
    }

    try {
        const zip = await JSZip.loadAsync(zipFile);
        let allMessages: InstagramMessage[] = [];
        
        const filesToLoad = chat.files.map(f => f.name);

        for (const fileName of filesToLoad) {
            const file = zip.file(fileName);
            if (file) {
                const content = await file.async("string");
                const rawData = JSON.parse(content);
                const messages = rawData.messages.map((m: any) => ({
                    ...m,
                    sender_name: fixInstagramString(m.sender_name),
                    content: m.content ? fixInstagramString(m.content) : undefined,
                    reactions: m.reactions?.map((r: any) => ({
                        ...r,
                        reaction: fixInstagramString(r.reaction),
                        actor: fixInstagramString(r.actor),
                    }))
                }));
                allMessages.push(...messages);
            }
        }
        
        allMessages.sort((a, b) => a.timestamp_ms - b.timestamp_ms);

        setSelectedChat({
            ...chat,
            messages: allMessages,
        });

    } catch (error) {
        console.error("Error loading chat details:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to load chat messages.' });
    } finally {
        setIsChatLoading(false);
    }
  }, [toast, zipFile]);
  

  const handleClearData = useCallback(() => {
    setZipFile(null);
    setAllChatsData(null);
    setSelectedChat(null);
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    if (fileInput) fileInput.value = "";
    toast({
      title: "Data Cleared",
      description: "You can now upload a new file.",
    });
  }, [toast]);

  const handleBackToList = () => {
    setSelectedChat(null);
  };

  const FullScreenLoader = ({ text }: { text: string }) => (
    <div className="flex flex-col h-screen items-center justify-center p-4 bg-background">
      <div className="w-full max-w-2xl space-y-4">
        <Skeleton className="h-12 w-1/3" />
        <Skeleton className="h-8 w-full" />
        <p className="text-center text-muted-foreground pt-4">{text}</p>
        <div className="space-y-2 pt-8">
            <Skeleton className="h-16 w-3/4 ml-auto rounded-lg"/>
            <Skeleton className="h-20 w-2/3 rounded-lg"/>
            <Skeleton className="h-10 w-1/2 ml-auto rounded-lg"/>
        </div>
      </div>
    </div>
  );

  if (isLoading) {
    return <FullScreenLoader text="Processing your ZIP file, this may take a moment..." />;
  }
  if (isChatLoading) {
    return <FullScreenLoader text="Loading your conversation..." />;
  }
  
  return (
    <main className="h-full bg-background">
      {!allChatsData ? (
        <FileUploadScreen onFileSelect={handleFileSelect} />
      ) : selectedChat ? (
        <ChatView 
          key={selectedChat.thread_path} 
          chatData={selectedChat} 
          onClearData={handleClearData} 
          onBack={handleBackToList}
          fullChat={allChatsData.find(c => c.thread_path === selectedChat.thread_path)!}
        />
      ) : (
        <ChatListScreen chats={allChatsData} onSelectChat={handleSelectChat} onClearData={handleClearData} />
      )}
    </main>
  );
}
