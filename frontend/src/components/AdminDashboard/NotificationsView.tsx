import { useState, useEffect } from 'react';
import { Bell, Settings, Info, AlertTriangle, CheckCircle } from 'lucide-react';
import { API_URL } from '../../services/api';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success';
  read: boolean;
  timestamp: string;
}

export function NotificationsView() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [showSettings, setShowSettings] = useState(false);
  const [preferences, setPreferences] = useState({
    email: true,
    browser: true,
    critical: true
  });

  const token = localStorage.getItem('acessoia_token');

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const response = await fetch(`${API_URL}/admin/notifications`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const result = await response.json();
      if (result.status === 'ok') {
        setNotifications(result.notifications);
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      const response = await fetch(`${API_URL}/admin/notifications/${id}/read`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        setNotifications(notifications.map(n => n.id === id ? { ...n, read: true } : n));
      }
    } catch (err) {
      console.error('Error marking as read:', err);
    }
  };

  const dismiss = async (id: string) => {
    try {
      const response = await fetch(`${API_URL}/admin/notifications/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        setNotifications(notifications.filter(n => n.id !== id));
      }
    } catch (err) {
      console.error('Error deleting notification:', err);
    }
  };

  const savePreferences = async (newPrefs: any) => {
    setPreferences(newPrefs);
    try {
      await fetch(`${API_URL}/admin/notifications/preferences`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(newPrefs)
      });
    } catch (err) {
      console.error('Error saving preferences:', err);
    }
  };

  const filtered = filter === 'all' ? notifications : notifications.filter(n => n.read === false);

  const getIcon = (type: string) => {
    switch (type) {
      case 'warning': return <AlertTriangle className="w-4 h-4 text-amber-500" />;
      case 'success': return <CheckCircle className="w-4 h-4 text-green-500" />;
      default: return <Info className="w-4 h-4 text-blue-500" />;
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div className="flex gap-2 p-1 bg-gray-100 rounded-lg border border-gray-200">
          <button 
            onClick={() => setFilter('all')}
            className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${filter === 'all' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Todas
          </button>
          <button 
            onClick={() => setFilter('unread')}
            className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${filter === 'unread' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Não lidas ({notifications.filter(n => !n.read).length})
          </button>
        </div>

        <button 
          onClick={() => setShowSettings(!showSettings)}
          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all cursor-pointer"
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>

      {showSettings && (
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6 animate-in slide-in-from-top-2 duration-200">
          <h3 className="text-sm font-bold text-blue-900 mb-4">Preferências de Notificação</h3>
          <div className="space-y-3">
            {[
              { id: 'email', label: 'Receber alertas por e-mail', desc: 'Envia resumo diário de atividade' },
              { id: 'browser', label: 'Notificações no navegador', desc: 'Alertas em tempo real enquanto logado' },
              { id: 'critical', label: 'Apenas alertas críticos', desc: 'Filtra avisos de sistema e menores' },
            ].map((pref) => (
              <label key={pref.id} className="flex items-center justify-between cursor-pointer group">
                <div>
                  <p className="text-sm font-bold text-blue-800">{pref.label}</p>
                  <p className="text-[10px] text-blue-600">{pref.desc}</p>
                </div>
                <input 
                  type="checkbox" 
                  checked={(preferences as any)[pref.id]}
                  onChange={(e) => savePreferences({ ...preferences, [pref.id]: e.target.checked })}
                  className="w-4 h-4 rounded border-blue-300 text-blue-600 focus:ring-blue-500 cursor-pointer" 
                />
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="p-12 text-center border-2 border-dashed border-gray-100 rounded-2xl bg-white">
            <Bell className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-400 italic">Você não tem novas notificações.</p>
          </div>
        ) : (
          filtered.map((n) => (
            <div 
              key={n.id} 
              className={`p-4 border rounded-2xl transition-all flex gap-4 ${n.read ? 'bg-white border-gray-100 opacity-60' : 'bg-white border-blue-100 shadow-sm shadow-blue-50'}`}
            >
              <div className="p-2 bg-gray-50 rounded-xl h-fit">
                {getIcon(n.type)}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between mb-1">
                  <h4 className={`text-sm font-bold truncate ${n.read ? 'text-gray-700' : 'text-gray-900'}`}>{n.title}</h4>
                  <span className="text-[10px] text-gray-400 font-medium shrink-0 ml-2">{new Date(n.timestamp).toLocaleDateString()}</span>
                </div>
                <p className="text-xs text-gray-500 leading-relaxed mb-3">{n.message}</p>
                
                <div className="flex gap-2">
                  {!n.read && (
                    <button 
                      onClick={() => markAsRead(n.id)}
                      className="text-[10px] font-black uppercase tracking-widest text-blue-600 hover:text-blue-800 transition-colors cursor-pointer"
                    >
                      Marcar como lida
                    </button>
                  )}
                  <button 
                    onClick={() => dismiss(n.id)}
                    className="text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-red-500 transition-colors cursor-pointer"
                  >
                    Excluir
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
