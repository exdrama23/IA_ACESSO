import { AlertCircle, CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { API_URL } from '../../services/api';

type NotificationType = 'error' | 'warning' | 'success' | 'info';

const NOTIFICATION_TYPES: Record<NotificationType, { icon: any; color: string; bg: string; border: string }> = {
  error: { icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' },
  warning: { icon: AlertTriangle, color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-200' },
  success: { icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' },
  info: { icon: Info, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
};

export function NotificationsView() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [preferences, setPreferences] = useState({
    infrastructureErrors: true,
    performanceWarnings: true,
    backupLogs: true,
    weeklyCostReports: false
  });
  const [filter, setFilter] = useState<'all' | 'error' | 'warning' | 'success' | 'info'>('all');

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

  const filtered = filter === 'all' ? notifications : notifications.filter(n => n.type === filter);
  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Central de Notificações</h2>
          {unreadCount > 0 && (
            <p className="text-sm text-gray-500 mt-1">Você possui <span className="font-bold text-blue-600">{unreadCount} mensagens</span> não lidas.</p>
          )}
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {(['all', 'error', 'warning', 'success', 'info'] as const).map((type) => (
          <button
            key={type}
            onClick={() => setFilter(type)}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all shadow-sm ${
              filter === type
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {type === 'all' ? 'Todas' : type === 'error' ? 'Erros' : type === 'warning' ? 'Avisos' : type === 'success' ? 'Sucesso' : 'Informativos'}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-20 border-2 border-dashed border-gray-100 rounded-xl bg-gray-50/50">
            <p className="text-gray-400 font-medium italic">Nenhuma notificação encontrada para este filtro.</p>
          </div>
        ) : (
          filtered.map((notif) => {
            const config = NOTIFICATION_TYPES[notif.type as NotificationType];
            const TypeIcon = config.icon;
            return (
              <div
                key={notif.id}
                className={`border rounded-xl p-4 flex items-start gap-4 transition-all shadow-sm ${config.bg} ${config.border} ${notif.read ? 'opacity-60 saturate-50' : ''}`}
              >
                <div className={`p-2 rounded-lg bg-white ${config.color} shadow-sm shrink-0`}>
                   <TypeIcon className="w-5 h-5" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-bold text-gray-900 text-sm">{notif.title}</h4>
                    <span className="text-[10px] text-gray-500 font-medium">
                      {formatDistanceToNow(notif.timestamp, { locale: ptBR, addSuffix: true })}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed">{notif.message}</p>
                </div>

                <div className="flex items-center gap-2">
                  {!notif.read && (
                    <button
                      onClick={() => markAsRead(notif.id)}
                      className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded bg-white hover:bg-blue-50 text-blue-600 border border-blue-100 shadow-sm"
                    >
                      Ler
                    </button>
                  )}
                  <button
                    onClick={() => dismiss(notif.id)}
                    className="p-1.5 hover:bg-gray-200 rounded-full transition-colors text-gray-400"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="border border-gray-200 rounded-xl bg-white shadow-sm p-6 mt-10">
        <h3 className="font-bold text-gray-900 mb-4 text-sm uppercase tracking-widest flex items-center gap-2">
          <Info className="w-4 h-4 text-blue-500" /> Preferências de Entrega
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="flex items-center gap-3 p-3 border border-gray-100 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
            <input 
              type="checkbox" 
              checked={preferences.infrastructureErrors}
              onChange={(e) => savePreferences({ ...preferences, infrastructureErrors: e.target.checked })}
              className="w-4 h-4 rounded text-blue-600 border-gray-300 focus:ring-blue-500" 
            />
            <span className="text-sm text-gray-700 font-medium">Erros críticos de infraestrutura</span>
          </label>
          <label className="flex items-center gap-3 p-3 border border-gray-100 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
            <input 
              type="checkbox" 
              checked={preferences.performanceWarnings}
              onChange={(e) => savePreferences({ ...preferences, performanceWarnings: e.target.checked })}
              className="w-4 h-4 rounded text-blue-600 border-gray-300 focus:ring-blue-500" 
            />
            <span className="text-sm text-gray-700 font-medium">Avisos de performance e latência</span>
          </label>
          <label className="flex items-center gap-3 p-3 border border-gray-100 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
            <input 
              type="checkbox" 
              checked={preferences.backupLogs}
              onChange={(e) => savePreferences({ ...preferences, backupLogs: e.target.checked })}
              className="w-4 h-4 rounded text-blue-600 border-gray-300 focus:ring-blue-500" 
            />
            <span className="text-sm text-gray-700 font-medium">Logs de backup e sincronização</span>
          </label>
          <label className="flex items-center gap-3 p-3 border border-gray-100 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
            <input 
              type="checkbox" 
              checked={preferences.weeklyCostReports}
              onChange={(e) => savePreferences({ ...preferences, weeklyCostReports: e.target.checked })}
              className="w-4 h-4 rounded text-blue-600 border-gray-300 focus:ring-blue-500" 
            />
            <span className="text-sm text-gray-700 font-medium">Relatórios semanais de custos</span>
          </label>
        </div>
      </div>
    </div>
  );
}
