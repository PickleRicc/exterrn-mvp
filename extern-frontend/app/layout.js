import './globals.css';
import { OnboardingMiddleware } from './middleware';

export const metadata = {
  title: 'Extern App',
  description: 'Extern Application for Craftsmen in Germany',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="antialiased">
        <OnboardingMiddleware>
          {children}
        </OnboardingMiddleware>
      </body>
    </html>
  );
}
