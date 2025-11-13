import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera, Save, X } from "lucide-react";
import { useLocation } from "wouter";
import { Profile } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import AppNav from "@/components/app-nav";

export default function ProfilePage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [currentUser, setCurrentUser] = useState<{ id: string; username: string } | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [bio, setBio] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");

  useEffect(() => {
    const userStr = localStorage.getItem("currentUser");
    if (userStr) {
      const user = JSON.parse(userStr);
      setCurrentUser(user);
    }
  }, []);

  const { data: profile, isLoading } = useQuery<Profile>({
    queryKey: [`/api/profiles/${currentUser?.id}`],
    enabled: !!currentUser?.id,
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: { bio?: string; photoUrl?: string }) => {
      return await apiRequest("POST", `/api/profiles/${currentUser?.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/profiles/${currentUser?.id}`] });
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully",
      });
      setIsEditing(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (profile) {
      setBio(profile.bio || "");
      setPhotoUrl(profile.photoUrl || "");
    }
  }, [profile]);

  const handleSave = () => {
    updateProfileMutation.mutate({ bio, photoUrl });
  };

  const handleCancel = () => {
    setBio(profile?.bio || "");
    setPhotoUrl(profile?.photoUrl || "");
    setIsEditing(false);
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 dark:from-background dark:to-muted/5 flex items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground" data-testid="text-please-login">
              Please log in to view your profile
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 dark:from-background dark:to-muted/5">
      <AppNav currentUser={currentUser} />
      <div className="max-w-2xl mx-auto pt-24 pb-12 px-4">
        <Card>
          <CardHeader>
            <CardTitle data-testid="text-profile-title">My Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {isLoading ? (
              <p className="text-center text-muted-foreground" data-testid="text-loading">Loading...</p>
            ) : (
              <>
                <div className="flex flex-col items-center gap-4">
                  <Avatar className="w-24 h-24">
                    <AvatarImage src={isEditing ? photoUrl : (profile?.photoUrl || "")} data-testid="img-profile-avatar" />
                    <AvatarFallback data-testid="text-profile-initials">
                      {currentUser.username.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <h2 className="text-2xl font-bold" data-testid="text-profile-username">{currentUser.username}</h2>
                </div>

                {isEditing ? (
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">Photo URL</label>
                      <Input
                        value={photoUrl}
                        onChange={(e) => setPhotoUrl(e.target.value)}
                        placeholder="Enter photo URL"
                        data-testid="input-photo-url"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Bio</label>
                      <Textarea
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        placeholder="Tell us about yourself"
                        rows={4}
                        data-testid="input-bio"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleSave} disabled={updateProfileMutation.isPending} data-testid="button-save">
                        <Save className="w-4 h-4 mr-2" />
                        {updateProfileMutation.isPending ? "Saving..." : "Save"}
                      </Button>
                      <Button variant="outline" onClick={handleCancel} data-testid="button-cancel">
                        <X className="w-4 h-4 mr-2" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground mb-2">Bio</h3>
                      <p className="text-foreground" data-testid="text-bio">
                        {profile?.bio || "No bio yet"}
                      </p>
                    </div>
                    <Button onClick={() => setIsEditing(true)} data-testid="button-edit">
                      <Camera className="w-4 h-4 mr-2" />
                      Edit Profile
                    </Button>
                  </>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
