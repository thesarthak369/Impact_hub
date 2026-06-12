import Navbar from "@/components/layout/Navbar";
import HeroSection from "@/components/sections/HeroSection";
import HorizontalScrollSection from "@/components/sections/HorizontalScrollSection";
import MobileAppSection from "@/components/sections/MobileAppSection";
import SMSFallbackSection from "@/components/sections/SMSFallbackSection";
import LiveDemoSection from "@/components/sections/LiveDemoSection";
import ImpactSection from "@/components/sections/ImpactSection";
import TestimonialsSection from "@/components/sections/TestimonialsSection";
import RoadmapSection from "@/components/sections/RoadmapSection";
import FinalCTASection from "@/components/sections/FinalCTASection";
import Footer from "@/components/layout/Footer";

export default function Home() {
  return (
    <main className="min-h-screen rich-bg text-foreground relative">
      {/* Ambient Background Orbs — Theme aware */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[10%] left-[5%] w-[600px] h-[600px] bg-foreground/[0.03] rounded-full blur-[120px] animate-float-orb" />
        <div className="absolute top-[50%] right-[5%] w-[500px] h-[500px] bg-accent-muted/[0.03] rounded-full blur-[100px] animate-float-orb-delayed" />
        <div className="absolute bottom-[10%] left-[30%] w-[700px] h-[700px] bg-foreground/[0.02] rounded-full blur-[150px] animate-float-orb-slow" />
      </div>

      <div className="relative z-10">
        <Navbar />
        <HeroSection />
        <HorizontalScrollSection />
        <MobileAppSection />
        <SMSFallbackSection />
        <LiveDemoSection />
        <ImpactSection />
        <TestimonialsSection />
        <RoadmapSection />
        <FinalCTASection />
        <Footer />
      </div>
    </main>
  );
}
