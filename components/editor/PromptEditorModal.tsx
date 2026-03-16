"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

interface PromptEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (prompt: string) => void;
  initialPrompt: string;
  variables: {
    lyric?: string;
    title?: string;
    font?: string;
    color?: string;
  };
  title?: string;
}

export function PromptEditorModal({
  isOpen,
  onClose,
  onSave,
  initialPrompt,
  variables,
  title = "Edit Image Prompt",
}: PromptEditorModalProps) {
  const [editedPrompt, setEditedPrompt] = useState(initialPrompt);

  useEffect(() => {
    setEditedPrompt(initialPrompt);
  }, [initialPrompt]);

  if (!isOpen) return null;

  // Generate preview by replacing variables
  const getPreview = () => {
    let preview = editedPrompt;
    if (variables.lyric !== undefined) {
      preview = preview.replace(/\{\{lyric\}\}/g, variables.lyric);
    }
    if (variables.title !== undefined) {
      preview = preview.replace(/\{\{title\}\}/g, variables.title);
    }
    if (variables.font !== undefined) {
      preview = preview.replace(/\{\{font\}\}/g, variables.font);
    }
    if (variables.color !== undefined) {
      preview = preview.replace(/\{\{color\}\}/g, variables.color);
    }
    return preview;
  };

  const handleSave = () => {
    onSave(editedPrompt);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-background rounded-lg shadow-lg max-w-6xl w-full max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center hover:bg-muted rounded-full transition-colors text-2xl font-bold"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="grid grid-cols-2 gap-6">
            {/* Left: Editable Template */}
            <div className="space-y-3">
              <div>
                <h3 className="text-sm font-semibold mb-1">Prompt Template</h3>
                <p className="text-xs text-muted-foreground mb-3">
                  Use variables: <code className="bg-muted px-1 rounded">{"{{lyric}}"}</code>,{" "}
                  <code className="bg-muted px-1 rounded">{"{{title}}"}</code>,{" "}
                  <code className="bg-muted px-1 rounded">{"{{font}}"}</code>,{" "}
                  <code className="bg-muted px-1 rounded">{"{{color}}"}</code>
                </p>
              </div>
              <textarea
                value={editedPrompt}
                onChange={(e) => setEditedPrompt(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-background border border-border rounded font-mono resize-y min-h-[300px]"
                placeholder="Enter your prompt template..."
              />
            </div>

            {/* Right: Preview */}
            <div className="space-y-3">
              <div>
                <h3 className="text-sm font-semibold mb-1">Preview (with variables filled)</h3>
                <p className="text-xs text-muted-foreground mb-3">
                  This is what will be sent to the AI model
                </p>
              </div>
              <div className="w-full px-3 py-2 text-sm bg-muted border border-border rounded min-h-[300px] overflow-auto whitespace-pre-wrap">
                {getPreview()}
              </div>
            </div>
          </div>

          {/* Variables Info */}
          <div className="mt-6 p-4 bg-muted/50 rounded-lg">
            <h4 className="text-xs font-semibold mb-2">Current Variables:</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              {variables.lyric !== undefined && (
                <div>
                  <span className="font-medium">{"{{lyric}}"}</span>
                  <p className="text-muted-foreground truncate">→ {variables.lyric}</p>
                </div>
              )}
              {variables.title !== undefined && (
                <div>
                  <span className="font-medium">{"{{title}}"}</span>
                  <p className="text-muted-foreground truncate">→ {variables.title}</p>
                </div>
              )}
              {variables.font !== undefined && (
                <div>
                  <span className="font-medium">{"{{font}}"}</span>
                  <p className="text-muted-foreground truncate">→ {variables.font}</p>
                </div>
              )}
              {variables.color !== undefined && (
                <div>
                  <span className="font-medium">{"{{color}}"}</span>
                  <p className="text-muted-foreground truncate">→ {variables.color}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save & Close
          </Button>
        </div>
      </div>
    </div>
  );
}
