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
    <header className="bg-gradient-to-r from-[#0a1929] to-[#132f4c] text-white shadow-lg backdrop-blur-lg sticky top-0 z-50 transition-all duration-300 ease-in-out">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center py-4">
          <a href="/" className="text-xl md:text-2xl font-bold text-white flex items-center">
            <span className="bg-gradient-to-r from-[#00c2ff] to-[#7928ca] bg-clip-text text-transparent">ZIMMR</span>
          </a>
          
          {/* Mobile menu button */}
          <button 
            className="md:hidden flex items-center justify-center w-10 h-10 rounded-full bg-[#1e3a5f]/40 backdrop-blur-md text-white hover:bg-[#2c5282]/60 transition-all duration-300"
            onClick={toggleMenu}
            aria-label="Toggle menu"
          >
            <svg 
              className="w-5 h-5 transition-transform duration-200 ease-in-out"
              style={{ transform: isMenuOpen ? 'rotate(90deg)' : 'rotate(0)' }}
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
            <ul className="flex items-center space-x-1">
              <li>
                <a 
                  href="/" 
                  className="px-4 py-2 rounded-full text-white/90 hover:text-white hover:bg-white/10 transition-all duration-200"
                >
                  Dashboard
                </a>
              </li>
              <li>
                <a 
                  href="/appointments" 
                  className="px-4 py-2 rounded-full text-white/90 hover:text-white hover:bg-white/10 transition-all duration-200"
                >
                  Appointments
                </a>
              </li>
              <li>
                <a 
                  href="/customers" 
                  className="px-4 py-2 rounded-full text-white/90 hover:text-white hover:bg-white/10 transition-all duration-200"
                >
                  Customers
                </a>
              </li>
              <li>
                <a 
                  href="/invoices" 
                  className="px-4 py-2 rounded-full text-white/90 hover:text-white hover:bg-white/10 transition-all duration-200"
                >
                  Invoices
                </a>
              </li>
              {isLoggedIn ? (
                <>
                  <li className="relative ml-2">
                    <button 
                      className="flex items-center space-x-2 rounded-full pl-2 pr-3 py-1 hover:bg-white/10 transition-all duration-200"
                      onClick={toggleProfileMenu}
                      aria-expanded={showProfileMenu}
                      aria-haspopup="true"
                    >
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#0070f3] to-[#7928ca] flex items-center justify-center text-white font-medium text-sm shadow-lg">
                        {userInitials}
                      </div>
                      <span className="text-sm text-white/90 hidden md:inline">
                        {userName}
                      </span>
                      <svg 
                        className={`w-4 h-4 text-white/70 transition-transform duration-200 ${showProfileMenu ? 'rotate-180' : ''}`}
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24" 
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    
                    {/* Profile dropdown menu */}
                    {showProfileMenu && (
                      <div className="absolute right-0 mt-2 w-48 bg-[#1a2e3d]/90 backdrop-blur-lg rounded-xl shadow-xl py-1 z-10 ring-1 ring-white/10 animate-fade-in">
                        <a 
                          href="/profile" 
                          className="flex items-center px-4 py-2 text-sm text-white/90 hover:text-white hover:bg-white/10 transition-all"
                        >
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                          </svg>
                          Your Profile
                        </a>
                        <a 
                          href="/onboarding" 
                          className="flex items-center px-4 py-2 text-sm text-white/90 hover:text-white hover:bg-white/10 transition-all"
                        >
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                          </svg>
                          Settings
                        </a>
                        <div className="border-t border-white/10 my-1"></div>
                        <button 
                          onClick={handleLogout}
                          className="flex items-center w-full text-left px-4 py-2 text-sm text-white/90 hover:text-white hover:bg-white/10 transition-all"
                        >
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
                          </svg>
                          Sign out
                        </button>
                      </div>
                    )}
                  </li>
                </>
              ) : (
                <li>
                  <a 
                    href="/auth/login"
                    className="ml-2 bg-gradient-to-r from-[#0070f3] to-[#0050d3] hover:from-[#0060df] hover:to-[#0040c0] text-white px-5 py-2 rounded-full text-sm font-medium shadow-md hover:shadow-lg transition-all duration-300 flex items-center"
                  >
                    <span>Sign in</span>
                    <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path>
                    </svg>
                  </a>
                </li>
              )}
            </ul>
          </nav>
        </div>
        
        {/* Mobile navigation */}
        {isMenuOpen && (
          <nav className="md:hidden py-3 px-2 border-t border-white/10 mt-2 animate-fade-in">
            <ul className="space-y-1 mb-4">
              <li>
                <a 
                  href="/" 
                  className="flex items-center px-4 py-2.5 rounded-xl text-white/90 hover:text-white hover:bg-white/10 transition-all"
                >
                  <svg className="w-5 h-5 mr-3 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1h2a1 1 0 001-1v-7m-6 0a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h1"></path>
                  </svg>
                  Dashboard
                </a>
              </li>
              <li>
                <a 
                  href="/appointments" 
                  className="flex items-center px-4 py-2.5 rounded-xl text-white/90 hover:text-white hover:bg-white/10 transition-all"
                >
                  <svg className="w-5 h-5 mr-3 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                  </svg>
                  Appointments
                </a>
              </li>
              <li>
                <a 
                  href="/customers" 
                  className="flex items-center px-4 py-2.5 rounded-xl text-white/90 hover:text-white hover:bg-white/10 transition-all"
                >
                  <svg className="w-5 h-5 mr-3 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path>
                  </svg>
                  Customers
                </a>
              </li>
              <li>
                <a 
                  href="/invoices" 
                  className="flex items-center px-4 py-2.5 rounded-xl text-white/90 hover:text-white hover:bg-white/10 transition-all"
                >
                  <svg className="w-5 h-5 mr-3 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                  </svg>
                  Invoices
                </a>
              </li>
            </ul>
            
            {isLoggedIn ? (
              <div className="border-t border-white/10 pt-3 space-y-1">
                <div className="flex items-center px-4 py-2">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#0070f3] to-[#7928ca] flex items-center justify-center text-white font-medium shadow-lg">
                    {userInitials}
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-white">{userName}</p>
                    <p className="text-xs text-white/70">Craftsman</p>
                  </div>
                </div>
                <a 
                  href="/profile" 
                  className="flex items-center px-4 py-2.5 rounded-xl text-white/90 hover:text-white hover:bg-white/10 transition-all"
                >
                  <svg className="w-5 h-5 mr-3 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                  </svg>
                  Your Profile
                </a>
                <a 
                  href="/onboarding" 
                  className="flex items-center px-4 py-2.5 rounded-xl text-white/90 hover:text-white hover:bg-white/10 transition-all"
                >
                  <svg className="w-5 h-5 mr-3 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                  </svg>
                  Settings
                </a>
                <button 
                  onClick={handleLogout}
                  className="w-full flex items-center px-4 py-2.5 rounded-xl text-white/90 hover:text-white hover:bg-white/10 transition-all"
                >
                  <svg className="w-5 h-5 mr-3 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
                  </svg>
                  Sign out
                </button>
              </div>
            ) : (
              <div className="mt-6 px-4">
                <a 
                  href="/auth/login"
                  className="w-full flex items-center justify-center bg-gradient-to-r from-[#0070f3] to-[#0050d3] hover:from-[#0060df] hover:to-[#0040c0] text-white px-4 py-2.5 rounded-xl text-sm font-medium shadow-md hover:shadow-lg transition-all duration-300"
                >
                  Sign in
                  <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path>
                  </svg>
                </a>
              </div>
            )}
          </nav>
        )}
      </div>
    </header>
  );
}
