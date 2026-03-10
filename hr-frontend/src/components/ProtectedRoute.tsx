import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useAuth } from "@/contexts/AuthContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * Protected Route Wrapper - บังคับให้เข้าสู่ระบบก่อน
 * ถ้าไม่มี token จะ redirect ไปหน้า login
 */
export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const router = useRouter();
  const { isAuthenticated, loading } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || loading) return;

    if (!isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, loading, mounted, router]);

  if (!mounted || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin mx-auto"></div>
          <p className="text-sm text-muted-foreground">กำลังตรวจสอบสิทธิ์...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
};

export default ProtectedRoute;

