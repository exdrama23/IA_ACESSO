import { useState, useEffect } from 'react';
import { 
  Search, Bell, HelpCircle, LayoutDashboard, User, 
  Calendar, BarChart2, Menu, Zap, MapPin, CheckCircle2, 
  Clock, Database, LogOut, ExternalLink, RefreshCw
} from 'lucide-react';

export function AdminConfig() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [strategy, setStrategy] = useState('tfidf');
  const [saving, setSaving] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
  const token = localStorage.getItem('acessoia_token');

  useEffect(() => {
    if (!token) {
      window.location.href = '/login';
      return;
    }
    fetchDashboardData();
  }, [token]);

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
        setStrategy(result.config.embedding.strategy);
      }
      setLoading(false);
    } catch (err) {
      console.error('Erro ao carregar dashboard:', err);
      setLoading(false);
    }
  };

  const handleSaveConfig = async () => {
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
        Carregando workspace...
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

  const { config, metrics, history } = data;

  return (
    <div className="flex flex-col min-h-screen font-sans text-gray-800 bg-white">
      
      {}
      <header className="flex items-center justify-between px-4 py-2 border-b border-gray-200 bg-white shrink-0">
        <div className="flex items-center gap-4 text-gray-500">
          <button className="p-1.5 hover:bg-gray-100 rounded-md"><LayoutDashboard className="w-5 h-5 text-gray-700" /></button>
          <button className="p-1.5 hover:bg-gray-100 rounded-md"><User className="w-5 h-5" /></button>
          <button className="p-1.5 hover:bg-gray-100 rounded-md"><Calendar className="w-5 h-5" /></button>
          <button className="p-1.5 hover:bg-gray-100 rounded-md"><BarChart2 className="w-5 h-5" /></button>
          {}
          <button className="p-1.5 hover:bg-gray-100 rounded-md"><Zap className="w-5 h-5" /></button>
        </div>

        <div className="flex-1 max-w-xl px-4">
          <div className="relative flex items-center w-full h-9 bg-gray-100 border border-transparent rounded-md focus-within:bg-white focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 transition-all">
            <Search className="w-4 h-4 ml-3 text-gray-400" />
            <input 
              type="text" 
              placeholder="Type / for search and recent items..." 
              className="w-full h-full pl-2 pr-3 text-sm bg-transparent outline-none placeholder:text-gray-400"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          {}
          <div className="flex items-center gap-1 text-gray-500 border-l border-gray-200 pl-3">
            <button className="p-1.5 hover:bg-gray-100 rounded-full"><Database className="w-4 h-4" /></button>
            <button className="p-1.5 hover:bg-gray-100 rounded-full"><Bell className="w-4 h-4" /></button>
            <button className="p-1.5 hover:bg-gray-100 rounded-full"><HelpCircle className="w-4 h-4" /></button>
          </div>
          <div className="flex items-center gap-2 ml-2 cursor-pointer hover:opacity-80">
            <div className="flex items-center justify-center w-8 h-8 text-xs font-bold text-indigo-700 bg-indigo-100 rounded-full">
              AD
            </div>
            <div className="hidden text-xs leading-tight md:block">
              <p className="font-semibold text-gray-700">Admin IA</p>
              <p className="text-gray-400">Acesso.Net</p>
            </div>
          </div>
        </div>
      </header>

      {}
      <div className="flex flex-1 overflow-hidden">
        
        {}
        <aside className="w-64 p-6 overflow-y-auto border-r border-gray-200 shrink-0">
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center justify-center w-12 h-12 bg-blue-600 rounded-full shadow-sm">
              <img src="/assets/LogoAcesso.png" alt="Logo" className="w-8 h-8 brightness-0 invert" />
            </div>
            <button className="px-3 py-1 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-md hover:bg-gray-50">
              Edit ⌄
            </button>
          </div>
          
          <h1 className="flex items-center gap-2 text-xl font-semibold text-gray-900 mb-4">
            AcessoIA Admin 
          </h1>
          
          <div className="flex gap-2 mb-6 text-xs">
            <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-md font-medium">Production</span>
            <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-md font-medium">Engine</span>
          </div>

          <div className="space-y-4 text-sm">
            <div>
              <p className="text-gray-800">{config.metadata.version}</p>
              <p className="text-xs text-gray-400">Versão Atual</p>
            </div>
            <div>
              <a href="mailto:admin@acessoia.com" className="text-blue-600 hover:underline">admin@acessoia.com</a>
              <p className="text-xs text-gray-400">Suporte</p>
            </div>
            <div>
              <a href={API_URL} className="text-blue-600 hover:underline break-all">{API_URL}</a>
              <p className="text-xs text-gray-400">Endpoint API</p>
            </div>
            <div className="flex items-start gap-2 pt-2">
              <MapPin className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
              <p className="text-gray-700">Servidor Principal,<br/>São Paulo, Brasil</p>
            </div>
          </div>

          <div className="pt-6 mt-6 border-t border-gray-200">
            <h2 className="mb-3 text-sm font-semibold text-gray-900">Navegação</h2>
            <nav className="flex flex-col gap-1 text-sm text-gray-600">
              <a href="/admin" className="px-2 py-1.5 bg-blue-50 text-blue-700 rounded-md font-medium">Painel de Controle</a>
              <a href="/" className="px-2 py-1.5 hover:bg-gray-50 rounded-md transition-colors">Chat Público</a>
              <button onClick={handleLogout} className="flex items-center gap-2 px-2 py-1.5 mt-2 text-red-600 hover:bg-red-50 rounded-md transition-colors text-left">
                <LogOut className="w-4 h-4" /> Sair do Sistema
              </button>
            </nav>
          </div>
        </aside>

        {}
        <main className="flex-1 p-8 overflow-y-auto">
          
          {}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="flex items-center gap-4 px-5 py-4 border border-gray-200 rounded-2xl shadow-sm bg-white">
              <div className="p-2 bg-gray-50 rounded-lg border border-gray-100"><Calendar className="w-5 h-5 text-gray-400" /></div>
              <div>
                <p className="text-xs text-gray-500">Total Gasto (Hoje)</p>
                <p className="font-semibold text-gray-900">$ {metrics.today.total.toFixed(4)}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 px-5 py-4 border border-gray-200 rounded-2xl shadow-sm bg-white">
              <div className="p-2 bg-gray-50 rounded-lg border border-gray-100"><Menu className="w-5 h-5 text-gray-400" /></div>
              <div>
                <p className="text-xs text-gray-500">Gemini IA</p>
                <p className="font-semibold text-gray-900">$ {metrics.today.gemini.toFixed(4)}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 px-5 py-4 border border-gray-200 rounded-2xl shadow-sm bg-white">
              <div className="p-2 bg-gray-50 rounded-lg border border-gray-100"><BarChart2 className="w-5 h-5 text-gray-400" /></div>
              <div>
                <p className="text-xs text-gray-500">ElevenLabs</p>
                <p className="font-semibold text-gray-900">$ {metrics.today.elevenlabs.toFixed(4)}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 px-5 py-4 border border-gray-200 rounded-2xl shadow-sm bg-white">
              <div className="p-2 bg-gray-50 rounded-lg border border-gray-100"><Database className="w-5 h-5 text-gray-400" /></div>
              <div>
                <p className="text-xs text-gray-500">Cloudinary</p>
                <p className="font-semibold text-gray-900">$ {metrics.today.cloudinary.toFixed(4)}</p>
              </div>
            </div>
          </div>

          {}
          <div className="flex gap-6 mb-6 text-sm border-b border-gray-200">
            <button className="pb-3 font-medium text-blue-600 border-b-2 border-blue-600">Overview</button>
            <button className="pb-3 text-gray-500 hover:text-gray-700">Histórico</button>
            <button className="pb-3 text-gray-500 hover:text-gray-700 flex items-center gap-1">Configurações <span className="bg-gray-100 text-gray-600 py-0.5 px-1.5 rounded-full text-[10px]">1</span></button>
            <button className="pb-3 text-gray-500 hover:text-gray-700 flex items-center gap-1">Métricas <span className="bg-gray-100 text-gray-600 py-0.5 px-1.5 rounded-full text-[10px]">3</span></button>
          </div>

          {}
          <div className="mb-8 border border-gray-200 rounded-xl bg-white shadow-sm overflow-hidden">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                  <Menu className="w-4 h-4 text-gray-400" /> Configuração do Motor Semântico
                  <span className="px-2 py-0.5 text-[10px] font-semibold text-purple-700 bg-purple-100 border border-purple-200 rounded-md">Ativo</span>
                </h2>
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  Limiar de Reuso: {(config.embedding.tfidf_threshold * 100).toFixed(0)}% <RefreshCw className="w-3 h-3 cursor-pointer" />
                </div>
              </div>
              
              <ul className="pl-5 space-y-2 text-sm text-gray-700 list-disc marker:text-gray-300">
                <li>O sistema atualmente utiliza a estratégia <strong className="uppercase">{config.embedding.strategy}</strong> para processamento.</li>
                <li>Modificar a estratégia afeta diretamente o custo por token e a precisão da recuperação de contexto do banco de dados.</li>
                <li>Opções híbridas e locais diminuem a chamada externa, otimizando o faturamento do painel acima.</li>
              </ul>
              
              <div className="flex items-center justify-between mt-6 text-xs text-gray-400">
                <span>Modificado em {new Date(config.metadata.last_updated).toLocaleDateString()} • ID: {config.metadata.version}</span>
                <a href="#" className="text-blue-600 hover:underline">Ver documentação</a>
              </div>
            </div>
            
            {}
            <div className="flex items-center justify-between gap-4 p-4 bg-gray-50 border-t border-gray-100">
              <div className="relative flex-1 max-w-sm">
                <select 
                  value={strategy}
                  onChange={(e) => setStrategy(e.target.value)}
                  className="w-full pl-3 pr-8 py-2 text-sm bg-white border border-gray-300 rounded-md outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 appearance-none shadow-sm"
                >
                  <option value="tfidf">TF-IDF Local (Gratuito, Rápido)</option>
                  <option value="gemini">Gemini Embeddings (Preciso, Pago)</option>
                  <option value="hybrid">Híbrido (Otimizado)</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                   <span className="text-gray-400 text-xs">▼</span>
                </div>
              </div>
              
              <div className="flex gap-2">
                <button className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 shadow-sm">
                  Cancelar
                </button>
                <button 
                  onClick={handleSaveConfig}
                  disabled={saving}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 shadow-sm disabled:opacity-70 transition-colors"
                >
                  {saving ? 'Atualizando...' : 'Salvar Alteração'}
                </button>
              </div>
            </div>
          </div>

          {}
          <div className="space-y-6">
            {history.slice(0, 3).map((item: any, i: number) => (
              <div key={i} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="flex justify-center items-center w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold shrink-0">
                    {item.modified_by.substring(0, 2).toUpperCase()}
                  </div>
                  {i !== history.length - 1 && <div className="w-px h-full bg-gray-200 my-1"></div>}
                </div>
                <div className="flex-1 pb-6">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-medium text-gray-900">Atualização de Sistema v{item.version}</h3>
                    <span className="text-xs text-gray-500">Hoje</span>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">
                    A estratégia de Embedding foi alterada para <strong className="uppercase">{item.strategy}</strong> pelo usuário {item.modified_by}.
                    As novas requisições já estão operando sob este novo regime de processamento.
                  </p>
                </div>
              </div>
            ))}
          </div>
        </main>

        {}
        <aside className="w-80 border-l border-gray-200 bg-gray-50/30 overflow-y-auto shrink-0 p-6">
          
          {}
          <div className="p-5 mb-6 bg-white border border-gray-200 rounded-xl shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 text-sm">Integrações</h3>
              <a href="https://cloudinary.com/console" target="_blank" rel="noreferrer" className="px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors">
                Console CDN
              </a>
            </div>
            <div className="flex items-start gap-3">
              <div className="mt-0.5"><CheckCircle2 className="w-4 h-4 text-gray-300" /></div>
              <div>
                <p className="text-sm font-medium text-gray-800"><span className="px-1.5 py-0.5 text-[10px] bg-blue-100 text-blue-700 rounded mr-2">Cloudinary</span> Monitorar Storage</p>
                <p className="mt-1 text-xs text-gray-500">Os áudios gerados estão na pasta "acessoia/audio". Limpe o cache regularmente.</p>
              </div>
            </div>
          </div>

          {}
          <div className="p-5 bg-white border border-gray-200 rounded-xl shadow-sm">
            <h3 className="mb-4 text-sm font-semibold text-gray-900">Últimas Notas do Sistema</h3>
            <div className="mb-3">
              <div className="flex items-center gap-2 mb-2 text-xs text-gray-500">
                <Clock className="w-3 h-3" /> Atualizado Automaticamente
              </div>
              <p className="text-sm text-gray-700 leading-relaxed">
                As requisições para a API da ElevenLabs e Gemini estão estabilizadas. O modo de <i>fallback</i> via Google Translate TTS está configurado e pronto para assumir em caso de limite de tokens atingido.
              </p>
            </div>
            <div className="flex items-center gap-2 pt-3 mt-4 text-xs font-medium text-blue-600 border-t border-gray-100">
              <div className="flex justify-center items-center w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-[10px]">IA</div>
              <span className="text-gray-500 font-normal">0 alertas</span> • Sistema 100% Operacional
            </div>
            <button className="flex items-center justify-between w-full mt-4 text-xs font-medium text-gray-600 hover:text-gray-900">
              Ver logs detalhados <ExternalLink className="w-3 h-3" />
            </button>
          </div>

        </aside>
      </div>
    </div>
  );
}