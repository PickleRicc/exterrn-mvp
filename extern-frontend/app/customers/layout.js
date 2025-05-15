import MobileNavbar from '../components/MobileNavbar'; // assuming MobileNavbar is located in this file

export default function CustomersLayout({ children }) {
  return (
    <>
      {children}
      <MobileNavbar />
    </>
  );
}
