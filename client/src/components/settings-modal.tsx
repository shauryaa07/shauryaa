import { Settings } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X } from "lucide-react";
import { useState } from "react";

interface SettingsModalProps {
  settings: Settings;
  onSettingsChange: (settings: Settings) => void;
  onClose: () => void;
}

export default function SettingsModal({
  settings,
  onSettingsChange,
  onClose,
}: SettingsModalProps) {
  const [localSettings, setLocalSettings] = useState(settings);

  const handleSave = () => {
    onSettingsChange(localSettings);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in"
      onClick={onClose}
      data-testid="modal-settings"
    >
      <div
        className="w-full max-w-lg bg-card dark:bg-card border border-border dark:border-border rounded-2xl shadow-2xl animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border dark:border-border">
          <h2 className="text-lg font-semibold text-foreground dark:text-foreground">
            Settings
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center hover:bg-muted dark:hover:bg-muted rounded-lg transition-colors"
            aria-label="Close"
            data-testid="button-close-settings"
          >
            <X className="w-4 h-4 text-muted-foreground dark:text-muted-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Video Settings */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground dark:text-foreground">
              Video & Audio
            </h3>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="video-enabled" className="text-sm font-medium text-foreground dark:text-foreground">
                  Enable Video
                </Label>
                <p className="text-xs text-muted-foreground dark:text-muted-foreground">
                  Turn your camera on by default
                </p>
              </div>
              <Switch
                id="video-enabled"
                checked={localSettings.videoEnabled}
                onCheckedChange={(checked) =>
                  setLocalSettings({ ...localSettings, videoEnabled: checked })
                }
                data-testid="switch-video"
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="audio-enabled" className="text-sm font-medium text-foreground dark:text-foreground">
                  Enable Audio
                </Label>
                <p className="text-xs text-muted-foreground dark:text-muted-foreground">
                  Turn your microphone on by default
                </p>
              </div>
              <Switch
                id="audio-enabled"
                checked={localSettings.audioEnabled}
                onCheckedChange={(checked) =>
                  setLocalSettings({ ...localSettings, audioEnabled: checked })
                }
                data-testid="switch-audio"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="video-quality" className="text-sm font-medium text-foreground dark:text-foreground">
                Video Quality
              </Label>
              <Select
                value={localSettings.videoQuality}
                onValueChange={(value: any) =>
                  setLocalSettings({ ...localSettings, videoQuality: value })
                }
              >
                <SelectTrigger id="video-quality" className="h-10" data-testid="select-quality">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low (Save bandwidth)</SelectItem>
                  <SelectItem value="medium">Medium (Balanced)</SelectItem>
                  <SelectItem value="high">High (Best quality)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground dark:text-muted-foreground">
                Lower quality uses less bandwidth
              </p>
            </div>
          </div>

          {/* Overlay Settings */}
          <div className="space-y-4 pt-4 border-t border-border dark:border-border">
            <h3 className="text-sm font-semibold text-foreground dark:text-foreground">
              Overlay
            </h3>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="auto-hide" className="text-sm font-medium text-foreground dark:text-foreground">
                  Auto-hide Overlay
                </Label>
                <p className="text-xs text-muted-foreground dark:text-muted-foreground">
                  Hide overlay when inactive
                </p>
              </div>
              <Switch
                id="auto-hide"
                checked={localSettings.autoHideOverlay}
                onCheckedChange={(checked) =>
                  setLocalSettings({ ...localSettings, autoHideOverlay: checked })
                }
                data-testid="switch-auto-hide"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-border dark:border-border">
          <Button
            variant="outline"
            onClick={onClose}
            className="h-10"
            data-testid="button-cancel"
          >
            Cancel
          </Button>
          <Button onClick={handleSave} className="h-10" data-testid="button-save-settings">
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
}
