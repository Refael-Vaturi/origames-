import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";

const ContactUs = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    formData.append("access_key", "25aafeb2-3cd0-4d12-a7d7-c56b58b88532");

    setSubmitting(true);
    try {
      const response = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      if (response.ok) {
        toast({ title: t("contact.successTitle"), description: t("contact.successBody") });
        form.reset();
      } else {
        toast({ title: t("contact.errorTitle"), description: data.message, variant: "destructive" });
      }
    } catch {
      toast({ title: t("contact.genericErrorTitle"), description: t("contact.tryAgain"), variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background px-4 py-8">
      <div className="max-w-xl mx-auto">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> {t("arcade.back")}
        </button>

        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
          <h1 className="font-display text-3xl font-bold mb-2 bg-gradient-to-r from-primary to-[hsl(var(--game-pink))] bg-clip-text text-transparent">
            {t("contact.title")}
          </h1>
          <p className="text-muted-foreground mb-6">
            {t("contact.subtitle")}
          </p>

          <form id="form" onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">{t("contact.name")}</label>
              <Input name="name" required maxLength={100} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{t("contact.email")}</label>
              <Input name="email" type="email" required maxLength={255} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{t("contact.phone")}</label>
              <Input name="phone" type="tel" required maxLength={30} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{t("contact.message")}</label>
              <Textarea name="message" required maxLength={2000} rows={5} />
            </div>
            <Button type="submit" variant="hero" size="lg" className="w-full" disabled={submitting}>
              {submitting ? t("contact.sending") : t("contact.sendMessage")}
            </Button>
          </form>
        </motion.div>
      </div>
    </div>
  );
};

export default ContactUs;
