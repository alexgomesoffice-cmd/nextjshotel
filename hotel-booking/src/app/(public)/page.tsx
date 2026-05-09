import { HeroSection } from '@/components/home/hero-section';
import DestinationsSection from '@/components/home/destinations-section';
import FeaturedHotels from '@/components/home/featured-hotels';
import NewsletterSection from '@/components/home/newsletter-section';

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <HeroSection />
      <DestinationsSection />
      <FeaturedHotels />
      <NewsletterSection />
    </div>
  )
}
