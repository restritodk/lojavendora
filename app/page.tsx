import { FeatureSection, PlanSection } from "@/components/marketing/feature-section";
import { HeroSection } from "@/components/marketing/hero-section";
import { SiteHeader } from "@/components/marketing/site-header";

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-slate-950 text-white">
      <section className="relative px-6 py-6 sm:px-8 lg:px-12">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,#34d39933,transparent_32%),radial-gradient(circle_at_top_right,#38bdf833,transparent_28%)]" />
        <SiteHeader />
        <HeroSection />
      </section>
      <FeatureSection />
      <PlanSection />
    </main>
  );
}
