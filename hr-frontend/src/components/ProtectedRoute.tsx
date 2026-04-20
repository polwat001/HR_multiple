import { useRouter } from "next/router";
import { useAuth } from "@/contexts/AuthContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const GOD_MODE = true;

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  if (GOD_MODE) {
    return <>{children}</>;
  }

  const router = useRouter();
  const { isAuthenticated, loading } = useAuth();

  if (loading) return <div>Loading...</div>;

  if (!isAuthenticated) {
    router.push("/login");
    return null;
  }

  return <>{children}</>;
};

export default ProtectedRoute;