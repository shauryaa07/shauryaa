import { useState } from "react";
import { Button } from "@/components/ui/button";
import { User, Preference } from "@shared/schema";
import { BookOpen, Sparkles, Users, ArrowLeft, ArrowRight } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface PreferenceSelectionProps {
  user: User;
  onSubmit: (preferences: Preference) => void;
  onBack: () => void;
}

const subjects = [
  { value: "mathematics", label: "Mathematics", icon: "📐" },
  { value: "physics", label: "Physics", icon: "⚛️" },
  { value: "chemistry", label: "Chemistry", icon: "🧪" },
  { value: "biology", label: "Biology", icon: "🧬" },
  { value: "computer-science", label: "Computer Science", icon: "💻" },
  { value: "literature", label: "Literature", icon: "📚" },
  { value: "history", label: "History", icon: "🏛️" },
  { value: "general", label: "General", icon: "🌟" },
];

const moods = [
  { value: "focus", label: "Focus", desc: "Serious study mode", icon: "🎯" },
  { value: "chill", label: "Chill", desc: "Relaxed learning", icon: "😊" },
  { value: "balanced", label: "Balanced", desc: "Mix of both", icon: "⚖️" },
];

const partnerTypes = [
  { value: "any", label: "Anyone", icon: "👥" },
  { value: "male", label: "Male", icon: "👨" },
  { value: "female", label: "Female", icon: "👩" },
];

export default function PreferenceSelection({
  user,
  onSubmit,
  onBack,
}: PreferenceSelectionProps) {
  const [preferences, setPreferences] = useState<Partial<Preference>>({
    subject: "general",
    mood: "balanced",
    partnerType: "any",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (preferences.subject && preferences.mood && preferences.partnerType) {
      onSubmit(preferences as Preference);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 dark:from-background dark:to-muted/5 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={onBack}
            className="mb-6"
            data-testid="button-back"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          
          <div>
            <h1 className="text-3xl font-bold text-foreground dark:text-foreground mb-2">
              Find Your Study Partners
            </h1>
            <p className="text-muted-foreground dark:text-muted-foreground">
              Welcome, <span className="font-medium text-foreground dark:text-foreground">{user.username}</span>! Set your preferences to match with similar students.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Subject Selection */}
          <div className="bg-card dark:bg-card border border-border dark:border-border rounded-xl p-6 shadow-md animate-fade-in">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground dark:text-foreground">Subject</h2>
                <p className="text-sm text-muted-foreground dark:text-muted-foreground">What are you studying today?</p>
              </div>
            </div>
            
            <Select
              value={preferences.subject}
              onValueChange={(value) =>
                setPreferences({ ...preferences, subject: value as any })
              }
            >
              <SelectTrigger className="h-12" data-testid="select-subject">
                <SelectValue placeholder="Select a subject" />
              </SelectTrigger>
              <SelectContent>
                {subjects.map((subject) => (
                  <SelectItem key={subject.value} value={subject.value}>
                    <span className="flex items-center gap-2">
                      <span>{subject.icon}</span>
                      <span>{subject.label}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Mood Selection */}
          <div className="bg-card dark:bg-card border border-border dark:border-border rounded-xl p-6 shadow-md animate-fade-in">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground dark:text-foreground">Study Mood</h2>
                <p className="text-sm text-muted-foreground dark:text-muted-foreground">How do you want to study?</p>
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-3">
              {moods.map((mood) => (
                <button
                  key={mood.value}
                  type="button"
                  onClick={() =>
                    setPreferences({ ...preferences, mood: mood.value as any })
                  }
                  className={`p-4 rounded-lg border-2 transition-all duration-150 text-left ${
                    preferences.mood === mood.value
                      ? "border-primary bg-primary/5 dark:bg-primary/10"
                      : "border-border dark:border-border hover:border-primary/50 bg-background dark:bg-background"
                  }`}
                  data-testid={`button-mood-${mood.value}`}
                >
                  <div className="text-2xl mb-2">{mood.icon}</div>
                  <div className="font-medium text-sm text-foreground dark:text-foreground">{mood.label}</div>
                  <div className="text-xs text-muted-foreground dark:text-muted-foreground mt-1">{mood.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Partner Type Selection */}
          <div className="bg-card dark:bg-card border border-border dark:border-border rounded-xl p-6 shadow-md animate-fade-in">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground dark:text-foreground">Partner Preference</h2>
                <p className="text-sm text-muted-foreground dark:text-muted-foreground">Who would you like to connect with?</p>
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-3">
              {partnerTypes.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() =>
                    setPreferences({ ...preferences, partnerType: type.value as any })
                  }
                  className={`p-4 rounded-lg border-2 transition-all duration-150 text-center ${
                    preferences.partnerType === type.value
                      ? "border-primary bg-primary/5 dark:bg-primary/10"
                      : "border-border dark:border-border hover:border-primary/50 bg-background dark:bg-background"
                  }`}
                  data-testid={`button-partner-${type.value}`}
                >
                  <div className="text-2xl mb-2">{type.icon}</div>
                  <div className="font-medium text-sm text-foreground dark:text-foreground">{type.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full h-14 text-lg font-medium"
            disabled={!preferences.subject || !preferences.mood || !preferences.partnerType}
            data-testid="button-find-partners"
          >
            Find Study Partners
            <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
        </form>
      </div>
    </div>
  );
}
