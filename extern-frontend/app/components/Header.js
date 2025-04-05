'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Header() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userName, setUserName] = useState('');
  const [userInitials, setUserInitials] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem('token');
    if (token) {
      setIsLoggedIn(true);
      
      // Get user info from localStorage
      try {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        setUserName(user.username || '');
        
        // Generate initials from username or name
        if (user.name) {
          const nameParts = user.name.split(' ');
          if (nameParts.length > 1) {
            setUserInitials(`${nameParts[0][0]}${nameParts[1][0]}`);
          } else {
            setUserInitials(user.name.substring(0, 2).toUpperCase());
          }
        } else if (user.username) {
          const usernameParts = user.username.split('.');
          if (usernameParts.length > 1) {
            setUserInitials(`${usernameParts[0][0]}${usernameParts[1][0]}`);
          } else {
            setUserInitials(user.username.substring(0, 2).toUpperCase());
          }
        }
      } catch (err) {
        console.error('Error parsing user data:', err);
      }
    }
  }, []);

  const handleLogout = () => {
    // Clear localStorage
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('onboardingCompleted');
    
    // Update state
    setIsLoggedIn(false);
    
    // Redirect to login page
    router.push('/auth/login');
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };
  
  const toggleProfileMenu = () => {
    setShowProfileMenu(!showProfileMenu);
  };

  return (
    <header className="bg-[#132f4c] text-white shadow-md">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center py-3">
          <a href="/" className="text-xl md:text-2xl font-bold text-white">ZIMMR</a>
          
          {/* Mobile menu button */}
          <button 
            className="md:hidden flex items-center p-2 rounded hover:bg-[#1e3a5f]"
            onClick={toggleMenu}
          >
            <svg 
              className="w-6 h-6" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24" 
              xmlns="http://www.w3.org/2000/svg"
            >
              {isMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
          
          {/* Desktop navigation */}
          <nav className="hidden md:block">
            <ul className="flex space-x-6 items-center">
              <li><a href="/" className="hover:text-[#f48fb1] transition-colors">Home</a></li>
              <li><a href="/appointments" className="hover:text-[#f48fb1] transition-colors">Appointments</a></li>
              <li><a href="/customers" className="hover:text-[#f48fb1] transition-colors">Customers</a></li>
              {isLoggedIn ? (
                <>
                  <li className="relative">
                    <div 
                      className="flex items-center space-x-2 cursor-pointer"
                      onClick={toggleProfileMenu}
                    >
                      <div className="w-10 h-10 rounded-full bg-[#e91e63] flex items-center justify-center text-white font-medium">
                        {userInitials}
                      </div>
                      <span className="text-sm text-gray-300 hidden md:inline">
                        {userName}
                      </span>
                      <svg 
                        className="w-4 h-4 text-gray-300" 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24" 
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                    
                    {/* Profile dropdown menu */}
                    {showProfileMenu && (
                      <div className="absolute right-0 mt-2 w-48 bg-[#1e3a5f] rounded-md shadow-lg py-1 z-10">
                        <a 
                          href="/profile" 
                          className="block px-4 py-2 text-sm text-white hover:bg-[#2c5282]"
                        >
                          Your Profile
                        </a>
                        <a 
                          href="/onboarding" 
                          className="block px-4 py-2 text-sm text-white hover:bg-[#2c5282]"
                        >
                          Settings
                        </a>
                        <button 
                          onClick={handleLogout}
                          className="block w-full text-left px-4 py-2 text-sm text-white hover:bg-[#2c5282]"
                        >
                          Logout
                        </button>
                      </div>
                    )}
                  </li>
                </>
              ) : (
                <li>
                  <a 
                    href="/auth/login"
                    className="ml-4 bg-[#e91e63] hover:bg-[#c2185b] text-white px-4 py-2 rounded-md text-sm transition-colors"
                  >
                    Login
                  </a>
                </li>
              )}
            </ul>
          </nav>
        </div>
        
        {/* Mobile navigation */}
        {isMenuOpen && (
          <nav className="md:hidden pb-4 border-t border-[#1e3a5f] mt-2 pt-2">
            <ul className="space-y-3">
              <li><a href="/" className="block py-2 hover:text-[#f48fb1] transition-colors">Home</a></li>
              <li><a href="/appointments" className="block py-2 hover:text-[#f48fb1] transition-colors">Appointments</a></li>
              <li><a href="/customers" className="block py-2 hover:text-[#f48fb1] transition-colors">Customers</a></li>
              {isLoggedIn ? (
                <>
                  <li className="py-2 flex items-center space-x-2">
                    <div className="w-10 h-10 rounded-full bg-[#e91e63] flex items-center justify-center text-white font-medium">
                      {userInitials}
                    </div>
                    <span className="text-sm text-gray-300">
                      {userName}
                    </span>
                  </li>
                  <li>
                    <a 
                      href="/profile" 
                      className="block py-2 hover:text-[#f48fb1] transition-colors"
                    >
                      Your Profile
                    </a>
                  </li>
                  <li>
                    <a 
                      href="/onboarding" 
                      className="block py-2 hover:text-[#f48fb1] transition-colors"
                    >
                      Settings
                    </a>
                  </li>
                  <li>
                    <button 
                      onClick={handleLogout}
                      className="w-full text-left py-2 text-[#f48fb1] hover:text-[#e91e63] transition-colors"
                    >
                      Logout
                    </button>
                  </li>
                </>
              ) : (
                <li>
                  <a 
                    href="/auth/login"
                    className="block w-full text-left bg-[#e91e63] hover:bg-[#c2185b] text-white px-4 py-2 rounded-md text-sm transition-colors"
                  >
                    Login
                  </a>
                </li>
              )}
            </ul>
          </nav>
        )}
      </div>
    </header>
  );
}
