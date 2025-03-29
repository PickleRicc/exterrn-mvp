import './styles/globals.css';

export const metadata = {
  title: 'Extern App',
  description: 'Extern Application',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
