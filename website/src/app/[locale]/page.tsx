import { setRequestLocale } from "next-intl/server";
import { CodeSection } from "@/components/landing/CodeSection";
import { DirectionDemo } from "@/components/landing/DirectionDemo";
import { ExclusiveTeaser } from "@/components/landing/ExclusiveTeaser";
import { Hero } from "@/components/landing/Hero";
import { HonestyStrip } from "@/components/landing/HonestyStrip";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { NewsletterSection } from "@/components/landing/NewsletterSection";
import { RiskExplainer } from "@/components/landing/RiskExplainer";
import { SubmitGuardDemo } from "@/components/landing/SubmitGuardDemo";

export default async function LandingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <Hero />
      <HonestyStrip />
      <DirectionDemo />
      <SubmitGuardDemo />
      <HowItWorks />
      <RiskExplainer />
      <CodeSection />
      <ExclusiveTeaser />
      <NewsletterSection />
    </>
  );
}
