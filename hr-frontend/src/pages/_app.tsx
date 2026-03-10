"use client";

import type { AppProps } from "next/app";
import { CompanyProvider } from "@/contexts/CompanyContexts";
import { AuthProvider } from "@/contexts/AuthContext";
import "@/globals.css";
import "@/index.css";
import "@/App.css";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <AuthProvider>
      <CompanyProvider>
        <Component {...pageProps} />
      </CompanyProvider>
    </AuthProvider>
  );
}
