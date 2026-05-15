import { createFileRoute } from "@tanstack/react-router";
import { useLenis } from "@/lib/lenis";
import { SiteHeader } from "@/components/site/SiteHeader";
import { HeroScene } from "@/components/site/HeroScene";
import { DocumentPipelineScene } from "@/components/site/DocumentPipelineScene";
import { VaultScene } from "@/components/site/VaultScene";
import { MonitoringScene } from "@/components/site/MonitoringScene";
import { ContactsScene } from "@/components/site/ContactsScene";
import { FinalScene } from "@/components/site/FinalScene";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  useLenis();
  return (
    <main className="relative">
      <SiteHeader />
      <HeroScene />
      <DocumentPipelineScene />
      <VaultScene />
      <MonitoringScene />
      <ContactsScene />
      <FinalScene />
    </main>
  );
}
