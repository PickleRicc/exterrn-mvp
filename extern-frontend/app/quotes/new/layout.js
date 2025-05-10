import { OnboardingMiddleware } from '../../middleware';
import MobileNavbar from '../../components/MobileNavbar';

export default function NewQuoteLayout({ children }) {
  return (
    <OnboardingMiddleware>
      {children}
      <MobileNavbar />
    </OnboardingMiddleware>
  );
}
