'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';

export function OnboardingMiddleware({ children }) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Skip middleware for auth pages
    if (pathname.startsWith('/auth')) {
      return;
    }

    // Check if user is logged in
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/auth/login');
      return;
    }

    // Parse the token to get user info
    try {
      const tokenData = JSON.parse(atob(token.split('.')[1]));
      // We no longer need to check for onboarding
      // Just validate the token is valid
    } catch (err) {
      console.error('Error parsing token:', err);
      // If there's an error with the token, redirect to login
      localStorage.removeItem('token');
      router.push('/auth/login');
    }
  }, [pathname, router]);

  return children;
}
