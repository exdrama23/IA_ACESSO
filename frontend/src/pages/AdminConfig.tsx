import { useState, useEffect } from 'react';
import { 
  Bell, HelpCircle, LayoutDashboard, User, 
  Calendar, BarChart2, Zap, Database, LogOut, 
  RefreshCw, ChevronDown, Mic
} from 'lucide-react';

// Componentes do Dashboard
import { DashboardOverview } from '../components/AdminDashboard/DashboardOverview';
import { UserProfileView } from '../components/AdminDashboard/UserProfileView';
import { CalendarView } from '../components/AdminDashboard/CalendarView';
import { MetricsView } from '../components/AdminDashboard/MetricsView';
import { IntegrationsView } from '../components/AdminDashboard/IntegrationsView';
import { DatabaseVisualizerView } from '../components/AdminDashboard/DatabaseVisualizerView';
import { NotificationsView } from '../components/AdminDashboard/NotificationsView';
import { HelpDocumentationView } from '../components/AdminDashboard/HelpDocumentationView';
import { VoicesAvatarView } from '../components/AdminDashboard/VoicesAvatarView';
import { useAppStore } from '../store/useAppStore';
import { API_URL } from '../services/api';

type ViewType = 'dashboard' | 'user' | 'calendar' | 'metrics' | 'integrations' | 'database' | 'notifications' | 'help' | 'voices';

export function AdminConfig() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeView, setActiveView] = useState<ViewType>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'historico' | 'config' | 'metricas'>('overview');

  const token = localStorage.getItem('acessoia_token');
  const { setActiveVoiceId } = useAppStore();

  useEffect(() => {
    if (!token) {
      window.location.href = '/login';
      return;
    }
    fetchDashboardData();
  }, [token]);

  useEffect(() => {
    if (data?.config?.tts?.voiceId) {
      setActiveVoiceId(data.config.tts.voiceId);
    }
  }, [data?.config?.tts?.voiceId, setActiveVoiceId]);

  const fetchDashboardData = async () => {
    try {
      const response = await fetch(`${API_URL}/admin/dashboard`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.status === 401 || response.status === 403) {
        localStorage.removeItem('acessoia_token');
        window.location.href = '/login';
        return;
      }

      const result = await response.json();
      if (result.status === 'ok') {
        setData(result);
      }
      setLoading(false);
    } catch (err) {
      console.error('Erro ao carregar dashboard:', err);
      setLoading(false);
    }
  };

  const handleSaveConfig = async (strategy: string) => {
    setSaving(true);
    try {
      const response = await fetch(`${API_URL}/admin/config`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ embedding: { strategy } }),
      });

      const result = await response.json();
      if (result.status === 'ok') {
        setData({ ...data, config: result.config });
        fetchDashboardData();
      } else {
        alert('Erro: ' + (result.error || 'Falha ao salvar'));
      }
    } catch (err) {
      alert('Erro ao conectar com o servidor');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('acessoia_token');
    localStorage.removeItem('acessoia_user');
    window.location.href = '/login';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen font-sans text-sm text-gray-500 bg-white">
        <RefreshCw className="w-5 h-5 mr-2 animate-spin text-blue-600" />
        Carregando workspace administrativo...
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-screen p-10 font-sans text-sm text-center text-red-600 bg-white">
        Erro ao conectar com o servidor. Verifique a API.
      </div>
    );
  }

  const { config, metrics, configHistory, chatHistory } = data;

  return (
    <div className="flex flex-col h-screen font-sans text-gray-800 bg-white selection:bg-blue-100">
      
      {/* HEADER */}
      <header className="flex items-center justify-between px-4 py-2 border-b border-gray-100 bg-white shrink-0 z-30 sticky top-0">
        <div className="flex items-center gap-2 text-gray-500">
          <button 
            onClick={() => { setActiveView('dashboard'); setSidebarOpen(true); setActiveTab('overview'); }}
            className={`p-2 hover:bg-gray-50 rounded-lg transition-colors ${activeView === 'dashboard' && activeTab === 'overview' ? 'bg-blue-50 text-blue-600' : ''}`}
          >
            <LayoutDashboard className="w-5 h-5" />
          </button>
          <button 
            onClick={() => setActiveView('user')}
            className={`p-2 hover:bg-gray-50 rounded-lg transition-colors ${activeView === 'user' ? 'bg-blue-50 text-blue-600' : ''}`}
          >
            <User className="w-5 h-5" />
          </button>
          <button 
            onClick={() => setActiveView('calendar')}
            className={`p-2 hover:bg-gray-50 rounded-lg transition-colors ${activeView === 'calendar' ? 'bg-blue-50 text-blue-600' : ''}`}
          >
            <Calendar className="w-5 h-5" />
          </button>
          <button 
            onClick={() => setActiveView('metrics')}
            className={`p-2 hover:bg-gray-50 rounded-lg transition-colors ${activeView === 'metrics' ? 'bg-blue-50 text-blue-600' : ''}`}
          >
            <BarChart2 className="w-5 h-5" />
          </button>
          <button 
            onClick={() => setActiveView('integrations')}
            className={`p-2 hover:bg-gray-50 rounded-lg transition-colors ${activeView === 'integrations' ? 'bg-blue-50 text-blue-600' : ''}`}
          >
            <Zap className="w-5 h-5" />
          </button>
          <button 
            onClick={() => setActiveView('voices')}
            className={`p-2 hover:bg-gray-50 rounded-lg transition-colors ${activeView === 'voices' ? 'bg-blue-50 text-blue-600' : ''}`}
          >
            <Mic className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 text-gray-400 border-l border-gray-100 pl-3">
            <button 
              onClick={() => setActiveView('database')}
              className={`p-2 hover:bg-gray-50 rounded-full transition-colors ${activeView === 'database' ? 'text-blue-600 bg-blue-50' : ''}`}
            >
              <Database className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setActiveView('notifications')}
              className={`p-2 hover:bg-gray-50 rounded-full transition-colors ${activeView === 'notifications' ? 'text-blue-600 bg-blue-50' : ''}`}
            >
              <Bell className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setActiveView('help')}
              className={`p-2 hover:bg-gray-50 rounded-full transition-colors ${activeView === 'help' ? 'text-blue-600 bg-blue-50' : ''}`}
            >
              <HelpCircle className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center gap-2 ml-2 cursor-pointer hover:opacity-80 group">
            <div className="flex items-center justify-center w-8 h-8 text-xs font-bold text-blue-700 bg-blue-50 border border-blue-100 rounded-lg group-hover:bg-blue-100 transition-colors">
              AD
            </div>
            <div className="hidden text-xs leading-tight md:block">
              <p className="font-bold text-gray-700">Admin IA</p>
              <p className="text-gray-400">Acesso.Net</p>
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">

        {sidebarOpen && (
          <aside className="w-64 p-6 overflow-y-auto border-r border-gray-100 shrink-0 bg-white hidden lg:block animate-in slide-in-from-left duration-300">
            <div className="flex justify-between items-start mb-8">
              <div className="flex items-center justify-center w-12 h-12 bg-blue-600 rounded-2xl shadow-lg shadow-blue-200">
                <img src="/assets/LogoAcesso.png" alt="Logo" className="w-8 h-8 brightness-0 invert" />
              </div>
              <button className="flex items-center gap-1 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-gray-500 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                Workspace <ChevronDown className="w-3 h-3" />
              </button>
            </div>
            
            <h1 className="text-xl font-black text-gray-900 mb-1 tracking-tight">
              AcessoIA
            </h1>
            <p className="text-xs text-gray-400 font-medium mb-6">Painel Administrativo v2.4</p>
            
            <div className="flex gap-2 mb-8 text-[10px] font-bold uppercase tracking-widest">
              <span className="px-2 py-1 bg-green-50 text-green-600 rounded-md border border-green-100">Live</span>
              <span className="px-2 py-1 bg-blue-50 text-blue-600 rounded-md border border-blue-100">Stable</span>
            </div>

            <div className="space-y-5 text-sm">
              <div className="group">
                <p className="text-xs font-black text-gray-300 uppercase tracking-widest mb-2">Sistema</p>
                <div className="space-y-3">
                  <div>
                    <p className="font-bold text-gray-700">{config.metadata.version}</p>
                    <p className="text-[10px] text-gray-400 uppercase font-black">Release</p>
                  </div>
                  <div>
                    <a href={API_URL} className="text-blue-600 hover:underline break-all font-medium text-xs">{API_URL}</a>
                    <p className="text-[10px] text-gray-400 uppercase font-black">API Endpoint</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-8 mt-8 border-t border-gray-100">
              <p className="text-xs font-black text-gray-300 uppercase tracking-widest mb-4">Navegação</p>
              <nav className="flex flex-col gap-1.5 text-sm">
                <button 
                  onClick={() => { setActiveView('dashboard'); setActiveTab('overview'); }}
                  className={`w-full text-left px-3 py-2 rounded-lg font-bold transition-all ${activeView === 'dashboard' && activeTab === 'overview' ? 'bg-blue-600 text-white shadow-md shadow-blue-100' : 'text-gray-500 hover:bg-gray-50'}`}
                >
                  Dashboard
                </button>
                <button 
                   onClick={() => setActiveView('metrics')}
                   className={`w-full text-left px-3 py-2 rounded-lg font-bold transition-all ${activeView === 'metrics' ? 'bg-blue-600 text-white shadow-md shadow-blue-100' : 'text-gray-500 hover:bg-gray-50'}`}
                >
                  Estatísticas
                </button>
                <a href="/" className="px-3 py-2 text-gray-500 hover:bg-gray-50 rounded-lg font-bold transition-colors">Chat Público</a>
                
                <button 
                  onClick={handleLogout} 
                  className="flex items-center gap-2 px-3 py-2 mt-4 text-red-500 hover:bg-red-50 rounded-lg font-bold transition-colors text-left"
                >
                  <LogOut className="w-4 h-4" /> Sair
                </button>
              </nav>
            </div>
          </aside>
        )}

        <main className="flex-1 overflow-y-scroll bg-gray-50/30 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
          
          <div className="p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="flex items-center gap-4 px-5 py-4 border border-gray-100 rounded-2xl shadow-sm bg-white hover:shadow-md transition-shadow cursor-default">
              <div className="p-2.5 bg-blue-50 rounded-xl border border-blue-100"><Calendar className="w-5 h-5 text-blue-500" /></div>
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Gasto Hoje</p>
                <p className="font-bold text-gray-900 text-lg">$ {metrics.today.total.toFixed(4)}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 px-5 py-4 border border-gray-100 rounded-2xl shadow-sm bg-white hover:shadow-md transition-shadow cursor-default">
              <div className="p-2.5 bg-purple-50 rounded-xl border border-purple-100"><Zap className="w-5 h-5 text-purple-500" /></div>
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Gemini IA</p>
                <p className="font-bold text-gray-900 text-lg">$ {metrics.today.gemini.toFixed(4)}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 px-5 py-4 border border-gray-100 rounded-2xl shadow-sm bg-white hover:shadow-md transition-shadow cursor-default">
              <div className="p-2.5 bg-orange-50 rounded-xl border border-orange-100"><BarChart2 className="w-5 h-5 text-orange-500" /></div>
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">ElevenLabs</p>
                <p className="font-bold text-gray-900 text-lg">$ {metrics.today.elevenlabs.toFixed(4)}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 px-5 py-4 border border-gray-100 rounded-2xl shadow-sm bg-white hover:shadow-md transition-shadow cursor-default">
              <div className="p-2.5 bg-green-50 rounded-xl border border-green-100"><Database className="w-5 h-5 text-green-500" /></div>
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Cloudinary</p>
                <p className="font-bold text-gray-900 text-lg">$ {metrics.today.cloudinary.toFixed(4)}</p>
              </div>
            </div>
          </div>

          <div className="flex gap-6 mb-8 text-sm border-b border-gray-200">
            <button 
              onClick={() => { setActiveView('dashboard'); setActiveTab('overview'); }}
              className={`pb-3 font-bold border-b-2 transition-all ${
                activeView === 'dashboard' && activeTab === 'overview' ? 'text-blue-600 border-blue-600' : 'text-gray-400 border-transparent hover:text-gray-600'
              }`}
            >
              Visão Geral
            </button>
            <button 
              onClick={() => { setActiveView('dashboard'); setActiveTab('historico'); }}
              className={`pb-3 font-bold border-b-2 transition-all ${
                activeView === 'dashboard' && activeTab === 'historico' ? 'text-blue-600 border-blue-600' : 'text-gray-400 border-transparent hover:text-gray-600'
              }`}
            >
              Histórico
            </button>
            <button 
              onClick={() => setActiveView('integrations')}
              className={`pb-3 font-bold border-b-2 transition-all flex items-center gap-2 ${
                activeView === 'integrations' ? 'text-blue-600 border-blue-600' : 'text-gray-400 border-transparent hover:text-gray-600'
              }`}
            >
              Integrações <span className="bg-gray-100 text-gray-500 py-0.5 px-1.5 rounded-md text-[10px]">3</span>
            </button>
            <button 
              onClick={() => setActiveView('metrics')}
              className={`pb-3 font-bold border-b-2 transition-all flex items-center gap-2 ${
                activeView === 'metrics' ? 'text-blue-600 border-blue-600' : 'text-gray-400 border-transparent hover:text-gray-600'
              }`}
            >
              Analytics 
            </button>
            <button 
              onClick={() => setActiveView('voices')}
              className={`pb-3 font-bold border-b-2 transition-all flex items-center gap-2 ${
                activeView === 'voices' ? 'text-blue-600 border-blue-600' : 'text-gray-400 border-transparent hover:text-gray-600'
              }`}
            >
              Vozes e Avatar
            </button>
          </div>

          <div className="animate-in fade-in duration-500">
            {activeView === 'dashboard' && (
              <DashboardOverview 
                config={config} 
                configHistory={configHistory}
                chatHistory={chatHistory}
                onSaveConfig={handleSaveConfig}
                saving={saving}
                activeTab={activeTab}
              />
            )}
            {activeView === 'user' && <UserProfileView />}
            {activeView === 'calendar' && <CalendarView />}
            {activeView === 'metrics' && <MetricsView />}
            {activeView === 'integrations' && <IntegrationsView />}
            {activeView === 'database' && <DatabaseVisualizerView />}
            {activeView === 'notifications' && <NotificationsView />}
            {activeView === 'help' && <HelpDocumentationView />}
            {activeView === 'voices' && (
              <VoicesAvatarView 
                config={config} 
                onUpdateConfig={async (updates) => {
                  setSaving(true);
                  try {
                    const response = await fetch(`${API_URL}/admin/config`, {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                      },
                      body: JSON.stringify(updates),
                    });
                    const result = await response.json();
                    if (result.status === 'ok') {
                      setData({ ...data, config: result.config });
                    }
                  } catch (e) {
                    alert('Erro ao salvar');
                  } finally {
                    setSaving(false);
                  }
                }}
                saving={saving}
              />
            )}
          </div>
          </div>
        </main>
      </div>
    </div>
  );
}
