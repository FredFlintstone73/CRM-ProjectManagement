import { useState, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";

import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Upload, Link, FileText, Edit, Trash2, Download, ExternalLink } from "lucide-react";
import type { ContactFile } from "@shared/schema";

interface ContactFilesProps {
  contactId: number;
}

export default function ContactFiles({ contactId }: ContactFilesProps) {

  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [isAddFileDialogOpen, setIsAddFileDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingFile, setEditingFile] = useState<ContactFile | null>(null);
  const [uploadType, setUploadType] = useState<'file' | 'url'>('file');
  const [fileName, setFileName] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [editFileName, setEditFileName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: files = [], isLoading } = useQuery<ContactFile[]>({
    queryKey: ['/api/contacts', contactId, 'files'],
    enabled: isAuthenticated && !!contactId,
  });

  const createFileMutation = useMutation({
    mutationFn: async (fileData: any) => {
      await apiRequest('POST', `/api/contacts/${contactId}/files`, fileData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/contacts', contactId, 'files'] });
      setIsAddFileDialogOpen(false);
      setFileName('');
      setFileUrl('');
      setUploadType('file');

    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        setTimeout(() => {
          window.location.href = "/";
        }, 500);
        return;
      }
    },
  });

  const updateFileMutation = useMutation({
    mutationFn: async ({ fileId, updates }: { fileId: number; updates: any }) => {
      await apiRequest('PUT', `/api/contacts/${contactId}/files/${fileId}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/contacts', contactId, 'files'] });
      setIsEditDialogOpen(false);
      setEditingFile(null);
      setEditFileName('');

    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        setTimeout(() => {
          window.location.href = "/";
        }, 500);
        return;
      }
    },
  });

  const deleteFileMutation = useMutation({
    mutationFn: async (fileId: number) => {
      await apiRequest('DELETE', `/api/contacts/${contactId}/files/${fileId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/contacts', contactId, 'files'] });

    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        setTimeout(() => {
          window.location.href = "/";
        }, 500);
        return;
      }
    },
  });

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Read file content as base64
    const reader = new FileReader();
    reader.onload = (e) => {
      const fileContent = e.target?.result as string;
      
      const fileData = {
        fileName: file.name,
        originalName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        fileContent: fileContent,
        isUrl: false,
      };

      createFileMutation.mutate(fileData);
    };
    
    reader.readAsDataURL(file);
  };

  const handleUrlSubmit = () => {
    if (!fileUrl.trim()) {

      return;
    }

    const displayName = fileName.trim() || new URL(fileUrl).pathname.split('/').pop() || 'Untitled';
    
    const fileData = {
      fileName: displayName,
      originalName: displayName,
      fileUrl: fileUrl,
      isUrl: true,
    };

    createFileMutation.mutate(fileData);
  };

  const handleEdit = (file: ContactFile) => {
    setEditingFile(file);
    setEditFileName(file.fileName);
    setIsEditDialogOpen(true);
  };

  const handleRename = () => {
    if (!editingFile || !editFileName.trim()) return;

    updateFileMutation.mutate({
      fileId: editingFile.id,
      updates: { fileName: editFileName.trim() }
    });
  };

  const handleDelete = (fileId: number) => {
    if (window.confirm('Are you sure you want to delete this file?')) {
      deleteFileMutation.mutate(fileId);
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return 'Unknown size';
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (file: ContactFile) => {
    if (file.isUrl) return <ExternalLink className="w-4 h-4" />;
    return <FileText className="w-4 h-4" />;
  };

  if (isLoading) {
    return <div className="p-4">Loading files...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Files ({files.length})
          </CardTitle>
          <Dialog open={isAddFileDialogOpen} onOpenChange={setIsAddFileDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Upload className="w-4 h-4 mr-2" />
                Add File
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add File</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>File Type</Label>
                  <Select value={uploadType} onValueChange={(value: 'file' | 'url') => setUploadType(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="file">Upload File</SelectItem>
                      <SelectItem value="url">Add URL Link</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {uploadType === 'file' ? (
                  <div>
                    <Label>Choose File</Label>
                    <Input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      disabled={createFileMutation.isPending}
                    />
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <Label>File URL</Label>
                      <Input
                        value={fileUrl}
                        onChange={(e) => setFileUrl(e.target.value)}
                        placeholder="https://example.com/document.pdf"
                        disabled={createFileMutation.isPending}
                      />
                    </div>
                    <div>
                      <Label>Display Name (optional)</Label>
                      <Input
                        value={fileName}
                        onChange={(e) => setFileName(e.target.value)}
                        placeholder="Document name"
                        disabled={createFileMutation.isPending}
                      />
                    </div>
                    <Button 
                      onClick={handleUrlSubmit}
                      disabled={createFileMutation.isPending || !fileUrl.trim()}
                    >
                      {createFileMutation.isPending ? 'Adding...' : 'Add URL'}
                    </Button>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {files.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>No files uploaded yet</p>
            <p className="text-sm">Add files or URL links to keep important documents organized</p>
          </div>
        ) : (
          <div className="space-y-3">
            {files.map((file) => (
              <div key={file.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  {getFileIcon(file)}
                  <div>
                    <div className="font-medium">{file.fileName}</div>
                    <div className="text-sm text-gray-500 flex items-center gap-2">
                      {file.isUrl ? (
                        <Badge variant="outline">URL</Badge>
                      ) : (
                        <span>{formatFileSize(file.fileSize)}</span>
                      )}
                      <span>•</span>
                      <span>Added by {file.userFirstName} {file.userLastName}</span>
                      <span>•</span>
                      <span>{new Date(file.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {file.isUrl ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.open(file.fileUrl, '_blank')}
                    >
                      <ExternalLink className="w-4 h-4 mr-1" />
                      Open
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        // Create a download trigger for the file
                        const link = document.createElement('a');
                        link.href = `/api/contacts/${contactId}/files/${file.id}/download`;
                        link.download = file.fileName;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                      }}
                    >
                      <Download className="w-4 h-4 mr-1" />
                      Download
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEdit(file)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDelete(file.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Edit File Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename File</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>File Name</Label>
              <Input
                value={editFileName}
                onChange={(e) => setEditFileName(e.target.value)}
                placeholder="Enter new file name"
                disabled={updateFileMutation.isPending}
              />
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={handleRename}
                disabled={updateFileMutation.isPending || !editFileName.trim()}
              >
                {updateFileMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setIsEditDialogOpen(false)}
                disabled={updateFileMutation.isPending}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}