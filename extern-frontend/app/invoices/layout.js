import MobileNavbar from '../components/MobileNavbar'; // assuming MobileNavbar is in this location

export default function InvoicesLayout({ children }) {
  return (
    <>
      {children}
      <MobileNavbar />
    </>
  );
}
