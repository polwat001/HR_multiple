"use client";

import type { AppProps } from "next/app";
import { CompanyProvider } from "@/contexts/CompanyContexts";
import { AuthProvider } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { Toaster } from "@/components/ui/toaster";
import "@/globals.css";
import "@/index.css";
import "@/App.css";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <LanguageProvider>
      <AuthProvider>
        <CompanyProvider>
          <Component {...pageProps} />
          <Toaster />
        </CompanyProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}
