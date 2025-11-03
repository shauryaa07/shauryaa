import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera, Save, X, ArrowLeft } from "lucide-react";
import { Link, useLocation } from "wouter";
import { Profile } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import AppNav from "@/components/app-nav";

export default function ProfilePage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Get user from localStorage (since we're using username-based auth)
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

  // Fetch profile data
  const { data: profile, isLoading } = useQuery<Profile>({
    queryKey: [`/api/profiles/${currentUser?.id}`],
    enabled: !!currentUser?.id,
  });

  // Create profile mutation
  const createProfileMutation = useMutation({
    mutationFn: async (data: { userId: string; bio?: string; photoUrl?: string }) => {
      return await apiRequest("POST", "/api/profiles", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/profiles/${currentUser?.id}`] });
      toast({
        title: "Profile created",
        description: "Your profile has been created successfully",
      });
      setIsEditing(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create profile",
        variant: "destructive",
      });
    },
  });

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: { bio?: string; photoUrl?: string }) => {
      return await apiRequest("PATCH", `/api/profiles/${currentUser?.id}`, data);
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
    if (!currentUser) return;

    const data = {
      bio: bio.trim() || undefined,
      photoUrl: photoUrl.trim() || undefined,
    };

    if (profile) {
      updateProfileMutation.mutate(data);
    } else {
      createProfileMutation.mutate({
        userId: currentUser.id,
        ...data,
      });
    }
  };

  const handleCancel = () => {
    setBio(profile?.bio || "");
    setPhotoUrl(profile?.photoUrl || "");
    setIsEditing(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid File",
          description: "Please select an image file",
          variant: "destructive",
        });
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 dark:from-background dark:to-muted/5 flex items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground dark:text-muted-foreground mb-4">
              Please log in to view your profile
            </p>
            <Link href="/app">
              <Button className="w-full" data-testid="button-login">
                Go to App
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const displayPhotoUrl = photoUrl || profile?.photoUrl;
  const displayBio = bio || profile?.bio;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 dark:from-background dark:to-muted/5">
      <AppNav currentUser={currentUser} />
      <div className="max-w-2xl mx-auto py-8 px-4 mt-16">

        <Card className="bg-card dark:bg-card border border-border dark:border-border">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-foreground dark:text-foreground">
              {isEditing ? "Edit Profile" : "My Profile"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {isLoading ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground dark:text-muted-foreground">Loading...</p>
              </div>
            ) : (
              <>
                {/* Profile Photo */}
                <div className="flex flex-col items-center space-y-4">
                  <Avatar className="w-32 h-32" data-testid="img-profile-avatar">
                    <AvatarImage src={displayPhotoUrl} alt={currentUser.username} />
                    <AvatarFallback className="text-3xl bg-primary/10 text-primary">
                      {currentUser.username.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  
                  {isEditing && (
                    <div className="w-full max-w-md">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="hidden"
                        data-testid="input-photo-file"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full"
                        data-testid="button-upload-photo"
                      >
                        <Camera className="w-4 h-4 mr-2" />
                        Choose Photo from Gallery
                      </Button>
                    </div>
                  )}
                </div>

                {/* Username */}
                <div>
                  <label className="text-sm font-medium text-foreground dark:text-foreground mb-2 block">
                    Username
                  </label>
                  <Input
                    value={currentUser.username}
                    disabled
                    className="bg-muted/50"
                    data-testid="input-username"
                  />
                </div>

                {/* Bio */}
                <div>
                  <label className="text-sm font-medium text-foreground dark:text-foreground mb-2 block">
                    Bio
                  </label>
                  {isEditing ? (
                    <Textarea
                      placeholder="Tell us about yourself..."
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      maxLength={500}
                      rows={4}
                      data-testid="input-bio"
                    />
                  ) : (
                    <div className="min-h-[100px] p-3 rounded-md bg-muted/20 dark:bg-muted/10 border border-border dark:border-border">
                      <p className="text-foreground dark:text-foreground whitespace-pre-wrap" data-testid="text-bio">
                        {displayBio || "No bio yet. Click Edit Profile to add one."}
                      </p>
                    </div>
                  )}
                  {isEditing && (
                    <p className="text-xs text-muted-foreground dark:text-muted-foreground mt-1">
                      {bio.length}/500 characters
                    </p>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4">
                  {isEditing ? (
                    <>
                      <Button
                        onClick={handleSave}
                        disabled={updateProfileMutation.isPending || createProfileMutation.isPending}
                        className="flex-1"
                        data-testid="button-save"
                      >
                        <Save className="w-4 h-4 mr-2" />
                        {updateProfileMutation.isPending || createProfileMutation.isPending
                          ? "Saving..."
                          : "Save Changes"}
                      </Button>
                      <Button
                        onClick={handleCancel}
                        variant="outline"
                        disabled={updateProfileMutation.isPending || createProfileMutation.isPending}
                        data-testid="button-cancel"
                      >
                        <X className="w-4 h-4 mr-2" />
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <Button
                      onClick={() => setIsEditing(true)}
                      className="flex-1"
                      data-testid="button-edit"
                    >
                      <Camera className="w-4 h-4 mr-2" />
                      Edit Profile
                    </Button>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
