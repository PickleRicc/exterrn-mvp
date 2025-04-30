import './globals.css';
import MobileNavbar from './components/MobileNavbar';

export const metadata = {
  title: 'Extern App',
  description: 'Extern Application for Craftsmen in Germany',
};

export default function RootLayout({ children }) {
  // MobileNavbar hides itself on /auth routes, so always render here
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
