import { Button } from "@/components/ui/button";
import { Users, Shield, Zap, Video, Mic, Settings } from "lucide-react";
import { Link } from "wouter";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Hero Section */}
      <section className="min-h-[80vh] flex items-center bg-gradient-to-b from-background to-muted/20">
        <div className="max-w-6xl mx-auto px-4 py-12 lg:py-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left Column */}
            <div className="space-y-6">
              <div className="inline-block">
                <div className="flex items-center gap-2 mb-4">
                  <div className="bg-primary/10 p-2 rounded-lg">
                    <Video className="w-6 h-6 text-primary" />
                  </div>
                  <span className="text-sm font-medium text-primary">StudyConnect</span>
                </div>
              </div>
              
              <h1 className="text-4xl lg:text-5xl font-bold leading-tight text-foreground dark:text-foreground">
                Study Together,<br />Learn Together
              </h1>
              
              <p className="text-lg text-muted-foreground dark:text-muted-foreground">
                Connect with 2-3 study partners during live online classes. Share a floating video overlay while watching lectures together on Physics Wallah, Unacademy, and more.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 mt-8">
                <Link href="/app" data-testid="button-get-started">
                  <Button size="lg" className="w-full sm:w-auto h-12 text-lg font-medium">
                    Get Started Free
                  </Button>
                </Link>
                <a href="#how-it-works">
                  <Button variant="outline" size="lg" className="w-full sm:w-auto h-12 text-lg font-medium" data-testid="button-learn-more">
                    How It Works
                  </Button>
                </a>
              </div>
              
              <div className="flex items-center gap-6 pt-4 text-sm text-muted-foreground dark:text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-primary" />
                  <span>100% Private</span>
                </div>
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-primary" />
                  <span>Always Free</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" />
                  <span>Peer-to-Peer</span>
                </div>
              </div>
            </div>
            
            {/* Right Column - Hero Image */}
            <div className="relative">
              <div className="rounded-2xl shadow-2xl bg-card dark:bg-card border border-border dark:border-border overflow-hidden">
                <div className="aspect-video bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                  <div className="text-center p-8">
                    <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-primary/10 mb-4">
                      <Video className="w-12 h-12 text-primary" />
                    </div>
                    <p className="text-sm text-muted-foreground dark:text-muted-foreground">
                      Connect with study partners while watching lectures
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Floating overlay preview */}
              <div className="absolute -bottom-6 -right-6 w-48 bg-card dark:bg-card border border-border dark:border-border rounded-xl shadow-xl p-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-xs font-medium text-foreground dark:text-foreground">2 Connected</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="aspect-square bg-muted dark:bg-muted rounded-lg"></div>
                  <div className="aspect-square bg-muted dark:bg-muted rounded-lg"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 lg:py-24 bg-background dark:bg-background" id="features">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground dark:text-foreground mb-4">
              Why StudyConnect?
            </h2>
            <p className="text-lg text-muted-foreground dark:text-muted-foreground max-w-2xl mx-auto">
              Built for students who want to learn together without disrupting their online classes
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <div className="group p-6 rounded-xl bg-card dark:bg-card border border-border dark:border-border hover:shadow-lg transition-all duration-150 hover:scale-105" data-testid="card-feature-privacy">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <Shield className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-foreground dark:text-foreground mt-4 mb-2">
                100% Private & Secure
              </h3>
              <p className="text-sm text-muted-foreground dark:text-muted-foreground">
                Peer-to-peer connections mean your video never touches our servers. Zero data storage, complete privacy.
              </p>
            </div>
            
            {/* Feature 2 */}
            <div className="group p-6 rounded-xl bg-card dark:bg-card border border-border dark:border-border hover:shadow-lg transition-all duration-150 hover:scale-105" data-testid="card-feature-connection">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-foreground dark:text-foreground mt-4 mb-2">
                Smart Matching
              </h3>
              <p className="text-sm text-muted-foreground dark:text-muted-foreground">
                Find 2-3 study partners based on subject, study mood, and preferences. Connect instantly.
              </p>
            </div>
            
            {/* Feature 3 */}
            <div className="group p-6 rounded-xl bg-card dark:bg-card border border-border dark:border-border hover:shadow-lg transition-all duration-150 hover:scale-105" data-testid="card-feature-focus">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <Zap className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-foreground dark:text-foreground mt-4 mb-2">
                Non-Intrusive Design
              </h3>
              <p className="text-sm text-muted-foreground dark:text-muted-foreground">
                Minimal floating overlay that doesn't interfere with your class. Hide, resize, or mute anytime.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-16 lg:py-24 bg-muted/20 dark:bg-muted/5" id="how-it-works">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground dark:text-foreground mb-4">
              How It Works
            </h2>
            <p className="text-lg text-muted-foreground dark:text-muted-foreground">
              Get started in less than a minute
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 md:gap-4">
            {[
              { num: 1, title: "Enter Username", desc: "Quick and simple - no registration required" },
              { num: 2, title: "Set Preferences", desc: "Choose subject, mood, and partner type" },
              { num: 3, title: "Get Matched", desc: "Connect with 2-3 similar students instantly" },
              { num: 4, title: "Study Together", desc: "Watch class with overlay, talk anytime" },
            ].map((step, idx) => (
              <div key={idx} className="flex flex-col items-center text-center" data-testid={`step-${idx + 1}`}>
                <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-lg font-semibold mb-4">
                  {step.num}
                </div>
                <h3 className="text-lg font-semibold text-foreground dark:text-foreground mb-2">
                  {step.title}
                </h3>
                <p className="text-sm text-muted-foreground dark:text-muted-foreground">
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-16 lg:py-24 bg-background dark:bg-background">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground dark:text-foreground mb-4">
              What Students Say
            </h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 rounded-xl bg-card dark:bg-card border border-border dark:border-border" data-testid="testimonial-1">
              <p className="text-base text-foreground dark:text-foreground mb-4">
                "Finally! I can see my friends' faces while watching PW lectures. Makes studying so much less lonely."
              </p>
              <div className="flex items-center gap-3 mt-4">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-semibold">
                  R
                </div>
                <div>
                  <div className="text-sm font-medium text-foreground dark:text-foreground">Rahul K.</div>
                  <div className="text-xs text-muted-foreground dark:text-muted-foreground">JEE Aspirant</div>
                </div>
              </div>
            </div>
            
            <div className="p-6 rounded-xl bg-card dark:bg-card border border-border dark:border-border" data-testid="testimonial-2">
              <p className="text-base text-foreground dark:text-foreground mb-4">
                "Love the privacy-first approach. No data storage, direct connections. Perfect for group study sessions."
              </p>
              <div className="flex items-center gap-3 mt-4">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-semibold">
                  P
                </div>
                <div>
                  <div className="text-sm font-medium text-foreground dark:text-foreground">Priya S.</div>
                  <div className="text-xs text-muted-foreground dark:text-muted-foreground">NEET Student</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 lg:py-24 bg-primary/5 dark:bg-primary/10">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold text-foreground dark:text-foreground mb-4">
            Ready to Study Together?
          </h2>
          <p className="text-lg text-muted-foreground dark:text-muted-foreground mb-8">
            Join thousands of students connecting during live classes
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/app">
              <Button size="lg" className="w-full sm:w-auto h-14 text-lg font-medium px-8" data-testid="button-start-now">
                Start Now - It's Free
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-card dark:bg-card border-t border-border dark:border-border py-12">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="bg-primary/10 p-2 rounded-lg">
                  <Video className="w-5 h-5 text-primary" />
                </div>
                <span className="font-semibold text-foreground dark:text-foreground">StudyConnect</span>
              </div>
              <p className="text-sm text-muted-foreground dark:text-muted-foreground">
                Connect with study partners during live online classes
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold text-foreground dark:text-foreground mb-4">Quick Links</h3>
              <div className="space-y-2">
                <a href="#features" className="block text-sm text-muted-foreground dark:text-muted-foreground hover:text-primary transition-colors">Features</a>
                <a href="#how-it-works" className="block text-sm text-muted-foreground dark:text-muted-foreground hover:text-primary transition-colors">How It Works</a>
                <Link href="/app" className="block text-sm text-muted-foreground dark:text-muted-foreground hover:text-primary transition-colors">Get Started</Link>
              </div>
            </div>
            
            <div>
              <h3 className="font-semibold text-foreground dark:text-foreground mb-4">About</h3>
              <p className="text-sm text-muted-foreground dark:text-muted-foreground">
                Built for students, by students. 100% free and privacy-focused.
              </p>
            </div>
          </div>
          
          <div className="pt-8 border-t border-border dark:border-border text-center">
            <p className="text-xs text-muted-foreground dark:text-muted-foreground">
              © 2025 StudyConnect. All rights reserved. Made with ❤️ for students.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
