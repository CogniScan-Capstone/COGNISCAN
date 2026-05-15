import {
  Navbar,
  BackToTopButton,
  Hero,
  Stats,
  HowItWorks,
  Features,
  DualAudience,
  Crisis,
  FAQ,
  Footer,
} from "@/components/landing";
import LandingScrollReset from "@/components/landing/LandingScrollReset";

export default function Home() {
  return (
    <>
      <LandingScrollReset />
      <Navbar />
      <BackToTopButton />
      <Hero />
      <Stats />
      <HowItWorks />
      <Features />
      <DualAudience />
      <Crisis />
      <FAQ />
      <Footer />
    </>
  );
}
