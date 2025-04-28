import './globals.css';
import { OnboardingMiddleware } from './middleware';
import BottomNav from './components/BottomNav';

export const metadata = {
  title: 'ZIMMR',
  description: 'ZIMMR Application for Craftsmen in Germany',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover, maximum-scale=1.0, user-scalable=no" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="theme-color" content="#0a1929" />
      </head>
      <body className="antialiased">
        <OnboardingMiddleware>
          {children}
          <BottomNav />
        </OnboardingMiddleware>
      </body>
    </html>
  );
}
