import { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function UserProfileView() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const API_URL = import.meta.env.VITE_API_URL || '';
  const token = localStorage.getItem('acessoia_token');

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const response = await fetch(`${API_URL}/admin/user-profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const result = await response.json();
      if (result.status === 'ok') {
        setUser(result.user);
      } else {
        const localUser = JSON.parse(localStorage.getItem('acessoia_user') || '{}');
        setUser({
          name: localUser.name || 'Admin IA',
          email: localUser.email || 'admin@acessoia.com',
          role: 'Administrador',
          createdAt: new Date().toISOString(),
          configCount: 12,
          lastActivity: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !user) {
    return <div className="p-8 text-center text-gray-500">Carregando perfil...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="border border-gray-200 rounded-xl bg-white shadow-sm p-8 max-w-2xl">
        <div className="flex gap-6 items-start">
          <div className="flex items-center justify-center w-24 h-24 bg-blue-600 rounded-full text-white text-3xl font-bold shrink-0">
            {user.name[0].toUpperCase()}
          </div>

          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900 mb-1">{user.name}</h1>
            <p className="text-gray-500 mb-4">{user.role}</p>
            
            <div className="space-y-2 text-sm">
              <p><span className="text-gray-500">Email:</span> {user.email}</p>
              <p><span className="text-gray-500">Membro desde:</span> {new Date(user.createdAt).toLocaleDateString('pt-BR')}</p>
              <p><span className="text-gray-500">Nível de Acesso:</span> <span className="bg-green-100 text-green-700 px-2 py-1 rounded">Administrador</span></p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="border border-gray-200 rounded-xl bg-white shadow-sm p-4">
          <p className="text-xs text-gray-500 mb-1">Configurações Feitas</p>
          <p className="text-2xl font-bold text-gray-900">{user.configCount}</p>
        </div>
        <div className="border border-gray-200 rounded-xl bg-white shadow-sm p-4">
          <p className="text-xs text-gray-500 mb-1">Última Atividade</p>
          <p className="text-sm font-medium text-gray-700">
            {formatDistanceToNow(new Date(user.lastActivity), { locale: ptBR, addSuffix: true })}
          </p>
        </div>
        <div className="border border-gray-200 rounded-xl bg-white shadow-sm p-4">
          <p className="text-xs text-gray-500 mb-1">Status</p>
          <p className="text-sm font-medium flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full inline-block"></span>Online
          </p>
        </div>
      </div>

      <div className="flex gap-3">
        <button className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">
          Editar Perfil
        </button>
        <button className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">
          Mudar Senha
        </button>
      </div>
    </div>
  );
}
