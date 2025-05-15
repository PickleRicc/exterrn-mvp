import MobileNavbar from '../components/MobileNavbar'; // assuming MobileNavbar is in this location

export default function AppointmentsLayout({ children }) {
  return (
    <>
      {children}
      <MobileNavbar />
    </>
  );
}
