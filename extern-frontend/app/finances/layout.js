import { OnboardingMiddleware } from '../middleware';
import MobileNavbar from '../components/MobileNavbar';

export default function FinancesLayout({ children }) {
  return (
    <OnboardingMiddleware>
      {children}
      <MobileNavbar />
    </OnboardingMiddleware>
  );
}
