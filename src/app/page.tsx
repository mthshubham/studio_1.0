"use client";

import { useState, useCallback } from "react";
import JSZip from "jszip";
import type { InstagramChat, IncompleteChat, InstagramMessage } from "@/types/instagram";
import { useToast } from "@/hooks/use-toast";
import FileUploadScreen from "@/components/file-upload-screen";
import ChatView from "@/components/chat-view";
import ChatListScreen from "@/components/chat-list-screen";
import { Skeleton } from "@/components/ui/skeleton";
import { fixInstagramString } from "@/lib/utils";

export default function Home() {
  const [zipInstance, setZipInstance] = useState<JSZip | null>(null);
  const [incompleteChats, setIncompleteChats] = useState<IncompleteChat[] | null>(null);
  const [selectedChat, setSelectedChat] = useState<InstagramChat | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { toast } = useToast();

  const handleFileSelect = async (file: File) => {
    setIsLoading(true);
    try {
      const zip = await JSZip.loadAsync(file);
      setZipInstance(zip);
      
      const chatMetadata: { [key: string]: { title: string, participants: any[], thread_type: string, is_still_participant: boolean, files: string[], lastActivity: number } } = {};
      const messageFiles = Object.values(zip.files).filter((f) =>
        f.name.endsWith(".json") && !f.name.startsWith("__MACOSX") && f.name.includes("message_")
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

      // First pass: build chat metadata without reading full message content
      for (const file of messageFiles) {
          try {
              // Only read enough to get metadata, not the whole file
              const content = await file.async("string");
              const data = JSON.parse(content);

              if (data.thread_path && Array.isArray(data.participants)) {
                  if (!chatMetadata[data.thread_path]) {
                       chatMetadata[data.thread_path] = {
                          title: fixInstagramString(data.title),
                          participants: data.participants.map((p: any) => ({ name: fixInstagramString(p.name) })),
                          thread_type: data.thread_type,
                          is_still_participant: data.is_still_participant,
                          files: [],
                          lastActivity: 0,
                      };
                  }
                  chatMetadata[data.thread_path].files.push(file.name);
              }
          } catch(e) {
              console.warn(`Skipping metadata scan for file: ${file.name}`, e);
          }
      }
      
      // Second pass: get last activity from message_1.json for sorting
      for(const thread_path in chatMetadata) {
        const message1File = zip.file(chatMetadata[thread_path].files.find(f => f.endsWith('message_1.json')) || chatMetadata[thread_path].files[0]);
        if (message1File) {
            try {
                const content = await message1File.async("string");
                const data = JSON.parse(content);
                if (data.messages && data.messages.length > 0) {
                    chatMetadata[thread_path].lastActivity = data.messages[0].timestamp_ms;
                }
            } catch(e) {
                console.warn(`Could not read last activity for ${thread_path}`, e);
            }
        }
      }


      const chatsList: IncompleteChat[] = Object.entries(chatMetadata).map(([thread_path, meta]) => ({
        thread_path,
        title: meta.title,
        participants: meta.participants,
        thread_type: meta.thread_type,
        is_still_participant: meta.is_still_participant,
        // Sort files numerically: message_1.json, message_2.json, ...
        message_files: meta.files.sort((a, b) => {
            const numA = parseInt(a.match(/message_(\d+)\.json$/)?.[1] || '0', 10);
            const numB = parseInt(b.match(/message_(\d+)\.json$/)?.[1] || '0', 10);
            return numA - numB;
        }),
        lastActivity: meta.lastActivity
      }));

      if (chatsList.length === 0) {
        toast({
            variant: "destructive",
            title: "No Valid Chats Found",
            description: "Found JSON files, but they weren't in the expected chat format.",
        });
        setIsLoading(false);
        return;
      }
      
      setIncompleteChats(chatsList);
      toast({
        title: "Success!",
        description: `Found ${chatsList.length} conversations. Select one to view it.`,
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

  const handleSelectChat = async (chatToLoad: IncompleteChat) => {
    if (!zipInstance) {
        toast({ variant: "destructive", title: "Error", description: "Zip file instance not found." });
        return;
    }
    
    setIsLoading(true);
    
    try {
        const firstFile = chatToLoad.message_files[0];
        const file = zipInstance.file(firstFile);
        let initialMessages: InstagramMessage[] = [];

        if (file) {
            const content = await file.async("string");
            const data = JSON.parse(content);
            initialMessages = data.messages.map((m: any) => ({
                ...m,
                sender_name: fixInstagramString(m.sender_name),
                content: m.content ? fixInstagramString(m.content) : undefined,
                reactions: m.reactions?.map((r: any) => ({
                  ...r,
                  reaction: fixInstagramString(r.reaction),
                  actor: fixInstagramString(r.actor),
                }))
            }));
        }
        
        initialMessages.sort((a, b) => a.timestamp_ms - b.timestamp_ms);
        
        const fullChat: InstagramChat = {
            ...chatToLoad,
            messages: initialMessages,
            loadedFileIndex: 0,
        };
        
        setSelectedChat(fullChat);

    } catch (e) {
        toast({ variant: "destructive", title: "Failed to load chat", description: "There was an error processing the chat messages."});
        console.error("Failed to load full chat:", e);
    } finally {
        setIsLoading(false);
    }
  };

  const loadMoreMessages = async () => {
    if (!selectedChat || !zipInstance) return;

    const nextFileIndex = (selectedChat.loadedFileIndex ?? 0) + 1;
    if (nextFileIndex >= selectedChat.message_files.length) {
        // No more files to load
        if (selectedChat) {
            setSelectedChat({ ...selectedChat, loadedFileIndex: nextFileIndex });
        }
        return;
    }

    const fileName = selectedChat.message_files[nextFileIndex];
    const file = zipInstance.file(fileName);

    try {
        if (file) {
            const content = await file.async("string");
            const data = JSON.parse(content);
            const newMessages: InstagramMessage[] = data.messages.map((m: any) => ({
                ...m,
                sender_name: fixInstagramString(m.sender_name),
                content: m.content ? fixInstagramString(m.content) : undefined,
                 reactions: m.reactions?.map((r: any) => ({
                    ...r,
                    reaction: fixInstagramString(r.reaction),
                    actor: fixInstagramString(r.actor),
                 }))
            }));

            newMessages.sort((a, b) => a.timestamp_ms - b.timestamp_ms);
            
            setSelectedChat({
                ...selectedChat,
                messages: [...newMessages, ...selectedChat.messages],
                loadedFileIndex: nextFileIndex,
            });
        }
    } catch (e) {
        toast({ variant: "destructive", title: "Failed to load older messages", description: "The next message file might be corrupted."});
        console.error("Failed to load more messages:", e);
    }
  };

  const handleClearData = useCallback(() => {
    setIncompleteChats(null);
    setSelectedChat(null);
    setZipInstance(null);
  }, []);
  
  const handleBackToList = () => {
    setSelectedChat(null);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-screen items-center justify-center p-4 bg-background">
        <div className="w-full max-w-2xl space-y-4">
            <h1 className="text-3xl font-bold text-center">InstaChronicle</h1>
            <p className="text-center text-muted-foreground pt-4">Processing, this may take a moment...</p>
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
      {!incompleteChats ? (
        <FileUploadScreen onFileSelect={handleFileSelect} />
      ) : selectedChat ? (
        <ChatView 
            chatData={selectedChat} 
            onClearData={handleClearData} 
            onBack={handleBackToList}
            onLoadMore={loadMoreMessages}
        />
      ) : (
        <ChatListScreen chats={incompleteChats} onSelectChat={handleSelectChat} onClearData={handleClearData} />
      )}
    </main>
  );
}
