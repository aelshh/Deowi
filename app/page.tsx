import { Nav } from "@/components/landing/nav";
import { Hero } from "@/components/landing/hero";
import { SocialProof } from "@/components/landing/social-proof";
import { CapabilityGrid } from "@/components/landing/capability-grid";
import { HowItWorks } from "@/components/landing/how-it-works";
import { Testimonials } from "@/components/landing/testimonials";
import { Pricing } from "@/components/landing/pricing";
import { FinalCta } from "@/components/landing/final-cta";
import { Footer } from "@/components/landing/footer";

export default function Home() {
  return (
    <>
      <Nav />
      <Hero />
      <SocialProof />
      <CapabilityGrid />
      <HowItWorks />
      <Testimonials />
      <Pricing />
      <FinalCta />
      <Footer />
    </>
  );
}
