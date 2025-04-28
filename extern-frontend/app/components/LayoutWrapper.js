"use client";
import { usePathname } from "next/navigation";
import Navbar from "./layout/Navbar";
import BottomNav from "../components/BottomNav";
import { OnboardingMiddleware } from "../middleware";

export default function LayoutWrapper({ children }) {
  const pathname = usePathname();
  const hideNav = pathname === "/auth/login" || pathname === "/auth/register";

  return (
    <OnboardingMiddleware>
      {!hideNav && <Navbar />}
      {children}
      {!hideNav && <BottomNav />}
    </OnboardingMiddleware>
  );
}
