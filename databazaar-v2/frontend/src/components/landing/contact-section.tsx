"use client";

import { useState, type FormEvent } from "react";
import { Mail, Phone, Clock, Send } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useLanguage } from "@/providers/language-provider";
import { SUPPORT_EMAIL, HOTLINE_PHONE, SUPPORT_HOURS } from "@/lib/constants";

export function ContactSection() {
  const { t } = useLanguage();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!name || !email || !message) {
      toast.warning("Please fill in all required fields.");
      return;
    }

    const cleanPhone = HOTLINE_PHONE.replace(/[^0-9]/g, "");
    const waMsg = `Hi MarketingOstad Support,\n\n*Name:* ${name}\n*Email:* ${email}\n*Phone:* ${phone || "N/A"}\n*Subject:* ${subject || "General Inquiry"}\n\n*Message:*\n${message}`;
    const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(waMsg)}`;

    toast.success("Opening WhatsApp support chat with your message...");
    setTimeout(() => {
      window.open(waUrl, "_blank");
    }, 600);

    setName("");
    setEmail("");
    setPhone("");
    setSubject("");
    setMessage("");
  };

  return (
    <section id="contact" className="py-20 border-t border-border/40 relative">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
            {t.contact.title}
          </h2>
          <p className="text-base text-muted-foreground">{t.contact.subtitle}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Form */}
          <Card className="lg:col-span-7 glass-panel p-6 sm:p-8">
            <CardContent className="p-0 space-y-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="contact-name">{t.contact.nameLabel}</Label>
                  <Input
                    id="contact-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder="Your full name"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="contact-email">{t.contact.emailLabel}</Label>
                    <Input
                      id="contact-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder="name@company.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contact-phone">{t.contact.phoneLabel}</Label>
                    <Input
                      id="contact-phone"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+880 1XXXXXXXXX"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contact-subject">{t.contact.subjectLabel}</Label>
                  <Input
                    id="contact-subject"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Pricing, ERP Pack, Scraper inquiry..."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contact-message">{t.contact.messageLabel}</Label>
                  <Textarea
                    id="contact-message"
                    rows={4}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    required
                    placeholder="Tell us about your lead requirements..."
                  />
                </div>

                <Button type="submit" className="w-full gap-2 font-bold py-6">
                  <Send className="h-4 w-4" />
                  {t.contact.btnSubmit}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Channels Info Box */}
          <div className="lg:col-span-5 space-y-6">
            <Card className="glass-panel p-6 sm:p-8 space-y-6">
              <CardContent className="p-0 space-y-6">
                <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
                  <Mail className="h-5 w-5 text-emerald-400" />
                  {t.contact.channelsTitle}
                </h3>

                <div className="space-y-6">
                  {/* Email */}
                  <div className="flex gap-4 items-start">
                    <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 text-primary shrink-0">
                      <Mail className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="font-semibold text-sm text-foreground">
                        {t.contact.emailTitle}
                      </div>
                      <a
                        href={`mailto:${SUPPORT_EMAIL}`}
                        className="text-xs font-mono text-amber-500 hover:underline block mt-1"
                      >
                        {SUPPORT_EMAIL}
                      </a>
                    </div>
                  </div>

                  {/* Hotline */}
                  <div className="flex gap-4 items-start">
                    <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shrink-0">
                      <Phone className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="font-semibold text-sm text-foreground">
                        {t.contact.hotlineTitle}
                      </div>
                      <a
                        href={`https://wa.me/${HOTLINE_PHONE.replace(/[^0-9]/g, "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-mono text-cyan-400 hover:underline block mt-1"
                      >
                        {HOTLINE_PHONE}{" "}
                        <span className="text-[10px] text-muted-foreground">
                          {t.contact.clickToChat}
                        </span>
                      </a>
                    </div>
                  </div>

                  {/* Hours */}
                  <div className="flex gap-4 items-start">
                    <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 shrink-0">
                      <Clock className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="font-semibold text-sm text-foreground">
                        {t.contact.hoursTitle}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {SUPPORT_HOURS}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
}
