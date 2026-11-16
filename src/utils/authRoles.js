// Destino de cada perfil depois do login. Quem não tem perfil válido não entra.
export function homeForSession(session) {
  const metadata = session?.user?.app_metadata || {};
  if (metadata.role === 'admin') return '/admin';
  if (metadata.role === 'staff' && metadata.active !== false && metadata.professional_name) return '/funcionario';
  return null;
}
