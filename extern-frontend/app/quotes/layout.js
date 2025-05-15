import MobileNavbar from '../components/MobileNavbar';

export default function QuotesLayout({ children }) {
  return (
    <>
      {children}
      <MobileNavbar />
    </>
  );
}
