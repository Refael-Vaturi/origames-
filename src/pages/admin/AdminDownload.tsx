import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";
import { Smartphone, Apple, Download } from "lucide-react";

export default function AdminDownload() {
  const { t } = useLanguage();
  const [version, setVersion] = useState("1.0.0");
  const [changelog, setChangelog] = useState("");
  const [installPrompt, setInstallPrompt] = useState<Event | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const promptInstall = async () => {
    if (!installPrompt) {
      toast.info("PWA install not available in this browser. Use 'Add to Home Screen' from the browser menu.");
      return;
    }
    // @ts-expect-error - prompt() exists at runtime
    await installPrompt.prompt();
    setInstallPrompt(null);
  };

  return (
    <div className="space-y-4 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">{t("admin.download.title")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("admin.download.subtitle")}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-4 w-4" /> Install as PWA
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-muted-foreground">
            The fastest way to get the game onto a phone — no app store, no build pipeline.
          </p>
          <Button onClick={promptInstall}>Install on this device</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-4 w-4" /> Build native APK / IPA
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p className="text-muted-foreground">
            Generating native binaries requires Capacitor and a local toolchain. Follow the steps:
          </p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Export to GitHub (button in the top-right of Lovable)</li>
            <li>
              <code className="bg-muted px-1.5 py-0.5 rounded text-xs">git pull</code> the project locally
            </li>
            <li>
              <code className="bg-muted px-1.5 py-0.5 rounded text-xs">npm install</code>
            </li>
            <li>
              <code className="bg-muted px-1.5 py-0.5 rounded text-xs">
                npx cap add android
              </code>{" "}
              and/or{" "}
              <code className="bg-muted px-1.5 py-0.5 rounded text-xs">npx cap add ios</code>
            </li>
            <li>
              <code className="bg-muted px-1.5 py-0.5 rounded text-xs">npm run build</code> then{" "}
              <code className="bg-muted px-1.5 py-0.5 rounded text-xs">npx cap sync</code>
            </li>
            <li>
              <code className="bg-muted px-1.5 py-0.5 rounded text-xs">
                npx cap open android
              </code>{" "}
              → build APK in Android Studio
            </li>
            <li>
              <code className="bg-muted px-1.5 py-0.5 rounded text-xs">npx cap open ios</code> →
              build IPA in Xcode (Mac required)
            </li>
          </ol>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" disabled>
              <Smartphone className="h-4 w-4 mr-1" /> Build APK (CI not configured)
            </Button>
            <Button variant="outline" disabled>
              <Apple className="h-4 w-4 mr-1" /> Build IPA (CI not configured)
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Release Notes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <Label>Version</Label>
            <Input value={version} onChange={(e) => setVersion(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Changelog</Label>
            <Textarea
              rows={6}
              placeholder="What's new in this release…"
              value={changelog}
              onChange={(e) => setChangelog(e.target.value)}
            />
          </div>
          <Button
            onClick={() => {
              navigator.clipboard.writeText(`v${version}\n\n${changelog}`);
              toast.success("Release notes copied");
            }}
          >
            Copy Release Notes
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
