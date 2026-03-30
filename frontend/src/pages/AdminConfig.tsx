import { useState, useEffect } from 'react';
import { 
  Bell, HelpCircle, LayoutDashboard, User, 
  Calendar, BarChart2, Zap, Database, LogOut, 
  RefreshCw, Mic, 
  ChevronLeft, ChevronRight, MessageSquare 
} from 'lucide-react';
import Logo from '../assets/LogoAcesso2.png';


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
            onClick={() => { setActiveView('dashboard'); setActiveTab('overview'); }}
            className={`p-2 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer ${activeView === 'dashboard' && activeTab === 'overview' ? 'bg-blue-50 text-blue-600' : ''}`}
          >
            <LayoutDashboard className="w-5 h-5" />
          </button>
          <button 
            onClick={() => setActiveView('user')}
            className={`p-2 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer ${activeView === 'user' ? 'bg-blue-50 text-blue-600' : ''}`}
          >
            <User className="w-5 h-5" />
          </button>
          <button 
            onClick={() => setActiveView('calendar')}
            className={`p-2 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer ${activeView === 'calendar' ? 'bg-blue-50 text-blue-600' : ''}`}
          >
            <Calendar className="w-5 h-5" />
          </button>
          <button 
            onClick={() => setActiveView('metrics')}
            className={`p-2 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer ${activeView === 'metrics' ? 'bg-blue-50 text-blue-600' : ''}`}
          >
            <BarChart2 className="w-5 h-5" />
          </button>
          <button 
            onClick={() => setActiveView('integrations')}
            className={`p-2 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer ${activeView === 'integrations' ? 'bg-blue-50 text-blue-600' : ''}`}
          >
            <Zap className="w-5 h-5" />
          </button>
          <button 
            onClick={() => setActiveView('voices')}
            className={`p-2 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer ${activeView === 'voices' ? 'bg-blue-50 text-blue-600' : ''}`}
          >
            <Mic className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 text-gray-400 border-l border-gray-100 pl-3">
            <button 
              onClick={() => setActiveView('database')}
              className={`p-2 hover:bg-gray-50 rounded-full transition-colors cursor-pointer ${activeView === 'database' ? 'text-blue-600 bg-blue-50' : ''}`}
            >
              <Database className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setActiveView('notifications')}
              className={`p-2 hover:bg-gray-50 rounded-full transition-colors cursor-pointer ${activeView === 'notifications' ? 'text-blue-600 bg-blue-50' : ''}`}
            >
              <Bell className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setActiveView('help')}
              className={`p-2 hover:bg-gray-50 rounded-full transition-colors cursor-pointer ${activeView === 'help' ? 'text-blue-600 bg-blue-50' : ''}`}
            >
              <HelpCircle className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative">

        <aside 
          className={`fixed inset-y-0 left-0 lg:relative py-6 px-4 flex flex-col border-r border-gray-100 shrink-0 bg-white transition-all duration-300 ease-in-out z-40 ${
            sidebarOpen ? 'translate-x-0 w-64' : '-translate-x-full lg:translate-x-0 w-20 lg:items-center lg:w-20'
          } overflow-visible`}
        >
          {sidebarOpen && (
            <div 
              className="lg:hidden fixed inset-0 z-[-1]" 
              onClick={() => setSidebarOpen(false)}
            />
          )}

          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className={`absolute top-12 flex items-center justify-center w-8 h-8 bg-white lg:bg-white border border-gray-900 lg:border-gray-200 rounded-full shadow-lg z-50 transition-all cursor-pointer ${
              sidebarOpen 
                ? '-right-4' 
                : '-right-12 lg:-right-4'
            }`}
          >
            {sidebarOpen ? (
              <ChevronLeft className="w-5 h-5 text-gray-900 lg:text-gray-600" />
            ) : (
              <ChevronRight className="w-5 h-5 text-gray-900 lg:text-gray-600" />
            )}
          </button>

          <div className={`flex items-center w-full mb-10 ${sidebarOpen ? 'gap-3 px-2' : 'justify-center'}`}>
            
              <img src={Logo} alt="Logo" className="w-14 h-14" />

            {sidebarOpen && (
              <div className="flex flex-col overflow-hidden">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest truncate">Administrador</span>
                <span className="text-sm font-bold text-gray-900 truncate">AcessoIA v2.4</span>
              </div>
            )}
          </div>
          
          <div className="flex flex-col flex-1 w-full">
            
            <div className="mb-8 w-full">
              <p className={`text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 ${!sidebarOpen && 'text-center'}`}>
                {sidebarOpen ? 'Main' : 'Main'}
              </p>
              <nav className="flex flex-col gap-2 text-sm w-full">
                
                <button 
                  onClick={() => { setActiveView('dashboard'); setActiveTab('overview'); }}
                  className={`relative flex items-center gap-4 px-3 py-2.5 rounded-xl font-medium transition-all group w-full cursor-pointer ${
                    activeView === 'dashboard' && activeTab === 'overview' 
                      ? 'bg-gray-100 text-gray-900 font-bold' 
                      : 'text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  <LayoutDashboard className="w-5 h-5 shrink-0" />
                  {sidebarOpen && <span className="whitespace-nowrap">Dashboard</span>}
                  
                  {!sidebarOpen && (
                    <div className="absolute left-full ml-4 px-3 py-1.5 bg-gray-900 text-white text-xs font-medium rounded-md opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity">
                      Dashboard
                    </div>
                  )}
                </button>
                
                <button 
                   onClick={() => setActiveView('metrics')}
                   className={`relative flex items-center gap-4 px-3 py-2.5 rounded-xl font-medium transition-all group w-full cursor-pointer ${
                    activeView === 'metrics' 
                      ? 'bg-gray-100 text-gray-900 font-bold' 
                      : 'text-gray-500 hover:bg-gray-50'
                   }`}
                >
                  <BarChart2 className="w-5 h-5 shrink-0" />
                  {sidebarOpen && <span className="whitespace-nowrap">Estatísticas</span>}
                  
                  {!sidebarOpen && (
                    <div className="absolute left-full ml-4 px-3 py-1.5 bg-gray-900 text-white text-xs font-medium rounded-md opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity">
                      Estatísticas
                    </div>
                  )}
                </button>
                
                <a 
                  href="/" 
                  className="relative flex items-center gap-4 px-3 py-2.5 text-gray-500 hover:bg-gray-50 rounded-xl font-medium transition-colors group w-full cursor-pointer"
                >
                  <MessageSquare className="w-5 h-5 shrink-0" />
                  {sidebarOpen && <span className="whitespace-nowrap">Chat Público</span>}
                  
                  {!sidebarOpen && (
                    <div className="absolute left-full ml-4 px-3 py-1.5 bg-gray-900 text-white text-xs font-medium rounded-md opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity">
                      Chat Público
                    </div>
                  )}
                </a>
              </nav>
            </div>

            <div className="mt-auto pt-6 w-full">
              <p className={`text-[10px] font-black text-Black tracking-widest mb-4 ${!sidebarOpen && 'text-center'}`}>
                {sidebarOpen ? 'Settings' : 'Sys'}
              </p>

              {sidebarOpen && (
                <div className="px-3 space-y-4 mb-6">
                  <div>
                    <p className="font-bold text-Black text-xs">{config.metadata.version}</p>
                    <p className="text-[10px] text-Black font-black">Release</p>
                  </div>
                  <div>
                    <p className="text-blue-600 break-all font-medium text-xs">{API_URL}</p>
                    <p className="text-[10px] text-Black font-black">API Endpoint</p>
                  </div>
                </div>
              )}
              
              <button 
                onClick={handleLogout} 
                className="relative flex items-center gap-4 px-3 py-2.5 w-full text-red-500 hover:bg-red-50 rounded-xl font-medium transition-colors text-left group cursor-pointer"
              >
                <LogOut className="w-5 h-5 shrink-0" /> 
                {sidebarOpen && <span className="whitespace-nowrap">Sair</span>}
                
                {!sidebarOpen && (
                    <div className="absolute left-full ml-4 px-3 py-1.5 bg-gray-900 text-white text-xs font-medium rounded-md opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity">
                      Sair da Conta
                    </div>
                )}
              </button>
            </div>
            
          </div>
        </aside>

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
              className={`pb-3 font-bold border-b-2 transition-all cursor-pointer ${
                activeView === 'dashboard' && activeTab === 'overview' ? 'text-blue-600 border-blue-600' : 'text-gray-400 border-transparent hover:text-gray-600'
              }`}
            >
              Visão Geral
            </button>
            <button 
              onClick={() => { setActiveView('dashboard'); setActiveTab('historico'); }}
              className={`pb-3 font-bold border-b-2 transition-all cursor-pointer ${
                activeView === 'dashboard' && activeTab === 'historico' ? 'text-blue-600 border-blue-600' : 'text-gray-400 border-transparent hover:text-gray-600'
              }`}
            >
              Histórico
            </button>
            <button 
              onClick={() => setActiveView('integrations')}
              className={`pb-3 font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
                activeView === 'integrations' ? 'text-blue-600 border-blue-600' : 'text-gray-400 border-transparent hover:text-gray-600'
              }`}
            >
              Integrações <span className="bg-gray-100 text-gray-500 py-0.5 px-1.5 rounded-md text-[10px]">3</span>
            </button>
            <button 
              onClick={() => setActiveView('metrics')}
              className={`pb-3 font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
                activeView === 'metrics' ? 'text-blue-600 border-blue-600' : 'text-gray-400 border-transparent hover:text-gray-600'
              }`}
            >
              Analytics 
            </button>
            <button 
              onClick={() => setActiveView('voices')}
              className={`pb-3 font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
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