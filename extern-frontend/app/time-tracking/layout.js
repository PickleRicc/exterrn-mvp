'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import MobileNavbar from '../components/MobileNavbar';

export default function TimeTrackingLayout({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/auth/login');
    } else {
      setIsAuthenticated(true);
    }
  }, [router]);

  if (!isAuthenticated) {
    return null; // Don't render anything while checking authentication
  }

  return (
    <div className="flex flex-col min-h-screen pb-16 md:pb-0">
      {children}
      <MobileNavbar />
    </div>
  );
}
