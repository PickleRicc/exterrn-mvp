import { OnboardingMiddleware } from '../middleware';
import MobileNavbar from '../components/MobileNavbar'; // assuming MobileNavbar is in this location

export default function AppointmentsLayout({ children }) {
  return (
    <OnboardingMiddleware>
      {children}
      <MobileNavbar />
    </OnboardingMiddleware>
  );
}
