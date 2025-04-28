'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';

export function OnboardingMiddleware({ children }) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Skip middleware for auth pages and the onboarding page itself
    if (pathname.startsWith('/auth') || pathname === '/onboarding') {
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
      // Only redirect to onboarding if onboardingCompleted is not explicitly set to 'true'
      const onboardingCompleted = localStorage.getItem('onboardingCompleted');
      if (onboardingCompleted !== 'true' && pathname !== '/onboarding') {
        // Only redirect if this is a new registration or onboarding is truly incomplete
        // Optionally, you can add more checks here if needed
        router.push('/onboarding');
      }
    } catch (err) {
      console.error('Error parsing token:', err);
      // If there's an error with the token, redirect to login
      localStorage.removeItem('token');
      router.push('/auth/login');
    }
  }, [pathname, router]);

  return children;
}
