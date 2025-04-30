'use client';

import { useState, useEffect } from 'react';
import { appointmentsAPI, craftsmenAPI, customersAPI, invoicesAPI } from './lib/api';
import Header from './components/Header';
import Footer from './components/Footer';
import Link from 'next/link';
import NextAppointment from './components/NextAppointment';

export default function Home() {
  return (
    <>
      <Header minimal />
      {/* --- LANDING PAGE CONTENT ONLY: No dashboard logic here --- */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 pt-16 pb-8">
        <div className="max-w-2xl text-center mb-8">
          <h1 className="text-3xl md:text-5xl font-bold mb-4 leading-tight">
            One tool to <span className="text-[#e91e63] underline decoration-[#e91e63]/40">manage</span> your business
          </h1>
          <p className="text-lg md:text-xl text-gray-300 mb-8">
            ZIMMR helps craftsmen in Germany work smarter, automate admin, and delight customers—all in one place.
          </p>
          <div className="flex flex-col items-center w-full">
            <div className="flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-4 mb-6">
              <Link 
                href="/auth/login" 
                className="px-8 py-3 bg-gradient-to-r from-[#0070f3] to-[#0050d3] hover:from-[#0060df] hover:to-[#0040c0] text-white font-medium rounded-xl shadow-lg hover:shadow-xl focus:outline-none transition-all duration-300 transform hover:-translate-y-0.5"
              >
                Log In
              </Link>
              <Link 
                href="/auth/register" 
                className="px-8 py-3 border border-white/20 hover:bg-white/5 text-white font-medium rounded-xl focus:outline-none transition-all duration-300 transform hover:-translate-y-0.5"
              >
                Register
              </Link>
            </div>
            <img 
              src="/images/tileman.jpg" 
              alt="Craftsman at work in a tiled room" 
              className="rounded-xl shadow-lg w-full max-w-xs sm:max-w-sm md:max-w-full h-auto object-cover aspect-video"
              width="480"
              height="270"
              loading="lazy"
              decoding="async"
              srcSet="/images/tileman.jpg 480w, /images/tileman.jpg 800w"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 480px"
            />
          </div>
          {/* Trusted by row */}
          <div className="mt-8 mb-12 flex flex-col items-center">
            <span className="uppercase text-xs tracking-widest text-gray-400 mb-2">Trusted by modern craftsmen</span>
            <div className="flex flex-wrap gap-6 justify-center opacity-80">
              <span className="text-gray-400 font-semibold">Meisterbetrieb Müller</span>
              <span className="text-gray-400 font-semibold">Elektro Schmidt</span>
              <span className="text-gray-400 font-semibold">Sanitär König</span>
              <span className="text-gray-400 font-semibold">Fliesenprofi</span>
            </div>
          </div>
          {/* Features Section */}
          <section className="w-full max-w-5xl mx-auto grid md:grid-cols-3 gap-6 mt-4 mb-16 px-2">
            <div className="bg-[#132f4c] rounded-2xl p-6 flex flex-col items-center text-center shadow-lg">
              <div className="bg-[#e91e63]/20 p-3 rounded-full mb-4">
                <svg className="w-8 h-8 text-[#e91e63]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
              </div>
              <h3 className="font-bold text-lg mb-2">Easy Scheduling</h3>
              <p className="text-gray-300">Book, manage, and track appointments with just a few taps—no paperwork needed.</p>
            </div>
            <div className="bg-[#132f4c] rounded-2xl p-6 flex flex-col items-center text-center shadow-lg">
              <div className="bg-[#e91e63]/20 p-3 rounded-full mb-4">
                <svg className="w-8 h-8 text-[#e91e63]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 4v4m0 4h.01"></path></svg>
              </div>
              <h3 className="font-bold text-lg mb-2">Automated Reminders</h3>
              <p className="text-gray-300">Reduce no-shows with SMS/email reminders for your customers—sent automatically.</p>
            </div>
            <div className="bg-[#132f4c] rounded-2xl p-6 flex flex-col items-center text-center shadow-lg">
              <div className="bg-[#e91e63]/20 p-3 rounded-full mb-4">
                <svg className="w-8 h-8 text-[#e91e63]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a5 5 0 00-10 0v2a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2z"></path></svg>
              </div>
              <h3 className="font-bold text-lg mb-2">All-in-One Dashboard</h3>
              <p className="text-gray-300">See customers, appointments, and tasks at a glance—optimized for mobile and desktop.</p>
            </div>
          </section>
          <div className="w-full max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
            <div className="flex items-center justify-center">
              <img 
                src="/images/tile-cutting.jpg" 
                alt="Cutting tile with angle grinder" 
                className="rounded-xl shadow-lg w-full max-w-xs sm:max-w-sm md:max-w-full h-auto object-cover aspect-video"
                width="480"
                height="270"
                loading="lazy"
                decoding="async"
                srcSet="/images/tile-cutting.jpg 480w, /images/tile-cutting.jpg 800w"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 480px"
              />
            </div>
            <div className="flex items-center justify-center">
              <img 
                src="/images/tilemeasuring.jpg" 
                alt="Craftsman measuring tile for installation" 
                className="rounded-xl shadow-lg w-full max-w-xs sm:max-w-sm md:max-w-full h-auto object-cover aspect-video"
                width="480"
                height="270"
                loading="lazy"
                decoding="async"
                srcSet="/images/tilemeasuring.jpg 480w, /images/tilemeasuring.jpg 800w"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 480px"
              />
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}