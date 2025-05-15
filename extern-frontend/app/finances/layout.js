import MobileNavbar from '../components/MobileNavbar';

export default function FinancesLayout({ children }) {
  return (
    <>
      {children}
      <MobileNavbar />
    </>
  );
}
