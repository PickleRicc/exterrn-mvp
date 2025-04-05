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
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      
      // If user is a craftsman, check if they need onboarding
      if (tokenData.role === 'craftsman' && tokenData.craftsmanId) {
        // For now, we'll use a simple check - if they've visited the onboarding page
        const onboardingCompleted = localStorage.getItem('onboardingCompleted');
        
        if (!onboardingCompleted && pathname !== '/onboarding') {
          router.push('/onboarding');
        }
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
