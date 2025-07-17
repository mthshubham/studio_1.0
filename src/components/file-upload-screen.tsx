"use client";

import { useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";

interface FileUploadScreenProps {
  onFileSelect: (file: File) => void;
}

export default function FileUploadScreen({ onFileSelect }: FileUploadScreenProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onFileSelect(file);
    }
  };

  return (
    <div className="flex h-full items-center justify-center p-4 sm:p-6">
      <Card className="w-full max-w-md text-center shadow-lg">
        <CardHeader>
          <CardTitle className="text-3xl font-bold text-accent">
            InstaChronicle
          </CardTitle>
          <CardDescription className="pt-2">
            Relive your Instagram conversations.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col items-center justify-center space-y-3 rounded-lg border-2 border-dashed border-border p-8">
            <Upload className="h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">
              Please select your `.zip` file from your Instagram data export.
            </p>
          </div>
          <Button onClick={handleButtonClick} size="lg" className="w-full bg-accent hover:bg-accent/90">
            <Upload className="mr-2 h-5 w-5" />
            Select Zip File
          </Button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            accept="application/zip,application/x-zip-compressed"
          />
        </CardContent>
      </Card>
    </div>
  );
}
