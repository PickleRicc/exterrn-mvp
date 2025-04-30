import { OnboardingMiddleware } from '../middleware';
import Header from '../components/Header';
import MobileNavbar from '../components/MobileNavbar';

export default function DashboardLayout({ children }) {
  return (
    <OnboardingMiddleware>
      <Header />
      {children}
      <MobileNavbar />
    </OnboardingMiddleware>
  );
}
