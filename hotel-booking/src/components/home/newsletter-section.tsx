"use client";

import { useState } from "react";
import { Send, Mail, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const NewsletterSection = () => {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setStatus("loading");
    
    // Simulate API call
    setTimeout(() => {
      setStatus("success");
      setEmail("");
      
      // Reset after 3 seconds
      setTimeout(() => {
        setStatus("idle");
      }, 3000);
    }, 1000);
  };

  return (
    <section className="py-24 relative overflow-hidden">
      <div className="max-w-5xl mx-auto px-4 md:px-8">
        <div className="relative rounded-3xl overflow-hidden bg-primary/5 border border-primary/10 shadow-xl">
          {/* Background shapes */}
          <div className="absolute top-0 right-0 w-125 h-125 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-accent/10 rounded-full blur-3xl translate-y-1/3 -translate-x-1/3 pointer-events-none" />

          <div className="relative z-10 px-6 py-16 md:px-12 md:py-20 flex flex-col items-center text-center">
            <div className="h-16 w-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-6 shadow-inner">
              <Mail className="h-8 w-8 text-primary" />
            </div>
            
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4 text-foreground">
              Get Special <span className="text-transparent bg-clip-text bg-linear-to-r from-primary to-accent">Offers</span>
            </h2>
            
            <p className="text-muted-foreground text-lg max-w-xl mb-10">
              Subscribe to our newsletter and receive exclusive deals, travel inspiration, and updates directly to your inbox.
            </p>

            <form onSubmit={handleSubmit} className="w-full max-w-md relative">
              <div className="relative flex items-center">
                <Mail className="absolute left-4 h-5 w-5 text-muted-foreground" />
                <input
                  id="mail"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email address"
                  className="w-full h-14 pl-12 pr-32 rounded-full border border-border/50 bg-background/50 backdrop-blur-md focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all shadow-sm"
                  required
                  disabled={status === "loading" || status === "success"}
                />
                <Button 
                  type="submit" 
                  className="absolute right-1.5 h-11 rounded-full px-6 transition-all duration-300"
                  disabled={status === "loading" || status === "success"}
                >
                  {status === "loading" ? (
                    <div className="h-5 w-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  ) : status === "success" ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : (
                    <>
                      <span className="hidden sm:inline mr-2">Subscribe</span>
                      <Send className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
              
              {status === "success" && (
                <p className="absolute -bottom-8 left-0 w-full text-center text-sm font-medium text-green-500 animate-fade-in-up">
                  Successfully subscribed to the newsletter!
                </p>
              )}
            </form>
            
            <p className="text-xs text-muted-foreground mt-8">
              By subscribing, you agree to our Terms of Service and Privacy Policy.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default NewsletterSection;
