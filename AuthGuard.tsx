import { useRouter } from 'next/router';
import { useEffect, ReactNode } from 'react';
import { useSession } from '../context/SessionContext';

interface AuthGuardProps {
  children: ReactNode;
  /**
   * Rol requerido para acceder a la página. Si no se especifica, solo se requiere autenticación.
   */
  requiredRole?: 'admin';
}

export const AuthGuard = ({ children, requiredRole }: AuthGuardProps) => {
  const { isAuthenticated, isLoading, user } = useSession();
  const router = useRouter();

  useEffect(() => {
    // Si la sesión no está cargando y el usuario no está autenticado, redirigir.
    if (!isLoading && !isAuthenticated) {
      router.replace('/'); // Redirige a la página principal o a una de login.
    }
    // Si se requiere un rol específico y el usuario no lo tiene, redirigir.
    if (!isLoading && isAuthenticated && requiredRole && user?.rol !== requiredRole) {
      router.replace('/'); // Redirige a una página de "acceso no autorizado".
    }
  }, [isLoading, isAuthenticated, user, requiredRole, router]);

  // Mientras se verifica la sesión o si el usuario no cumple los requisitos, muestra un loader.
  if (isLoading || !isAuthenticated || (requiredRole && user?.rol !== requiredRole)) {
    return <div>Verificando acceso...</div>;
  }

  // Si el usuario está autenticado y cumple con el rol, muestra el contenido de la página.
  return <>{children}</>;
};