import { OnboardingMiddleware } from '../middleware';
import MobileNavbar from '../components/MobileNavbar';

export default function QuotesLayout({ children }) {
  return (
    <OnboardingMiddleware>
      {children}
      <MobileNavbar />
    </OnboardingMiddleware>
  );
}
