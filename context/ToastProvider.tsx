"use client";

import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useTheme } from "@/context/ThemeContext";

export default function ToastProvider({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();
  return (
    <>
      {children}
      <ToastContainer position="bottom-right" theme={theme} />
    </>
  );
}
