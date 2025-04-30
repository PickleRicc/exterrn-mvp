import { OnboardingMiddleware } from '../middleware';
import MobileNavbar from '../components/MobileNavbar'; // assuming MobileNavbar is located in this file

export default function CustomersLayout({ children }) {
  return (
    <OnboardingMiddleware>
      {children}
      <MobileNavbar />
    </OnboardingMiddleware>
  );
}
