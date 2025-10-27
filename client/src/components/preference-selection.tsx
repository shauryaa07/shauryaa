import { useState } from "react";
import { Button } from "@/components/ui/button";
import { User, Preference } from "@shared/schema";
import { Users, ArrowLeft, ArrowRight } from "lucide-react";

interface PreferenceSelectionProps {
  user: User;
  onSubmit: (preferences: Preference) => void;
  onBack: () => void;
}

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
    partnerType: "any",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (preferences.partnerType) {
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
            disabled={!preferences.partnerType}
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
