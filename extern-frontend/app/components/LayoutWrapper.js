"use client";
import { usePathname } from "next/navigation";
import Navbar from "./layout/Navbar";
import BottomNav from "../components/BottomNav";

export default function LayoutWrapper({ children }) {
  const pathname = usePathname();
  const hideNav = pathname === "/auth/login" || pathname === "/auth/register";

  return (
    <>
      {!hideNav && <Navbar />}
      {children}
      {!hideNav && <BottomNav />}
    </>
  );
}
