import Header from '../components/Header';
import MobileNavbar from '../components/MobileNavbar';

export default function DashboardLayout({ children }) {
  return (
    <>
      <Header />
      {children}
      <MobileNavbar />
    </>
  );
}
