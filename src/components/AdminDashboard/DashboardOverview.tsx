import { Menu, RefreshCw, Search, Filter, Tag } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';

const FAQ_CATEGORIES = [
  "Internet Fibra", "Acesso Saúde", "Celular e Telefone", "Serviços Extras", 
  "Sobre a Empresa", "Suporte e Atendimento", "Tecnologia e Velocidade", 
  "Aplicativo e Segunda Via", "Localização e Cobertura", "Internet Empresarial", 
  "Dados Oficiais", "Saudações"
];

interface DashboardOverviewProps {
  config: any;
  configHistory: any[];
  chatHistory: any[];
  onSaveConfig: (strategy: string) => Promise<void>;
  saving: boolean;
  activeTab: 'overview' | 'historico' | 'config' | 'metricas';
}

export function DashboardOverview({ config, configHistory, chatHistory, onSaveConfig, saving, activeTab }: DashboardOverviewProps) {
  const [strategy, setStrategy] = useState(config.embedding.strategy);
  const [showDoc, setShowDoc] = useState(false);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSource, setFilterSource] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  useEffect(() => {
    if (config?.embedding?.strategy) {
      setStrategy(config.embedding.strategy);
    }
  }, [config]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterSource, filterCategory]);

  const detectCategory = (question: string) => {
    const q = question.toLowerCase();
    if (q.includes('internet') || q.includes('fibra') || q.includes('plano') || q.includes('mega')) return 'Internet Fibra';
    if (q.includes('saude') || q.includes('medico') || q.includes('clinica') || q.includes('consulta')) return 'Acesso Saúde';
    if (q.includes('celular') || q.includes('telefone') || q.includes('chip') || q.includes('movel')) return 'Celular e Telefone';
    if (q.includes('suporte') || q.includes('ajuda') || q.includes('atendimento') || q.includes('tecnico')) return 'Suporte e Atendimento';
    if (q.includes('boleto') || q.includes('fatura') || q.includes('pagar') || q.includes('pix') || q.includes('app')) return 'Aplicativo e Segunda Via';
    if (q.includes('onde fica') || q.includes('endereco') || q.includes('loja') || q.includes('cidade') || q.includes('cobertura')) return 'Localização e Cobertura';
    if (q.includes('empresa') || q.includes('historia') || q.includes('quem e')) return 'Sobre a Empresa';
    if (q.includes('oi') || q.includes('ola') || q.includes('bom dia') || q.includes('boa tarde')) return 'Saudações';
    if (q.includes('cnpj') || q.includes('razao social')) return 'Dados Oficiais';
    if (q.includes('velocidade') || q.includes('lenta') || q.includes('caindo') || q.includes('estabilidade')) return 'Tecnologia e Velocidade';
    if (q.includes('empresarial') || q.includes('cnpj') || q.includes('link dedicado')) return 'Internet Empresarial';
    if (q.includes('globoplay') || q.includes('streaming') || q.includes('extra')) return 'Serviços Extras';
    return 'Geral';
  };

  const filteredHistory = useMemo(() => {
    return chatHistory.filter(item => {
      const matchesSearch = item.question.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesSource = filterSource === 'all' || 
                           (filterSource === 'IA' && item.source === 'IA_GEMINI') ||
                           (filterSource === 'BC' && (item.source.includes('FAQ') || item.source.includes('SEMANTICA'))) ||
                           (filterSource === 'RD' && item.source.includes('CACHE'));
      
      const category = detectCategory(item.question);
      const matchesCategory = filterCategory === 'all' || category === filterCategory;

      return matchesSearch && matchesSource && matchesCategory;
    });
  }, [chatHistory, searchTerm, filterSource, filterCategory]);

  const totalPages = Math.ceil(filteredHistory.length / itemsPerPage);
  const paginatedHistory = filteredHistory.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleSave = () => {
    onSaveConfig(strategy);
  };

  if (activeTab === 'historico') {
    const getSourceLabel = (source: string) => {
      const mappings: Record<string, string> = {
        'IA_GEMINI': 'IA (Gemini)',
        'FAQ_DIRETO': 'BC (Busca Local)',
        'IA_SEMANTICA': 'BC (Busca Local)',
        'FALLBACK_FAQ_LOCAL': 'BC (Busca Local)',
        'CACHE_REDIS': 'RD (Redis Cache)',
        'CACHE_AUDIO_HASH': 'RD (Cache de Áudio)',
        'ERRO_SISTEMA': 'ER (Erro)',
      };
      const type = mappings[source] || 'UN (Desconhecido)';
      return `Processado via ${source} - ${type}`;
    };

    const getSourceColor = (source: string) => {
      if (source.includes('GEMINI')) return 'text-purple-600';
      if (source.includes('ERRO')) return 'text-red-600';
      return 'text-blue-600';
    };

    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500 pb-10">
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm space-y-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input 
                type="text" 
                placeholder="Pesquisar no histórico de perguntas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>

            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1">
              <Filter className="w-3.5 h-3.5 text-gray-400" />
              <select 
                value={filterSource}
                onChange={(e) => setFilterSource(e.target.value)}
                className="bg-transparent text-xs font-bold text-gray-600 outline-none pr-4"
              >
                <option value="all">Todas as Origens</option>
                <option value="IA">IA (Gemini)</option>
                <option value="BC">BC (Busca Local)</option>
                <option value="RD">RD (Redis/Cache)</option>
              </select>
            </div>

            {/* Filtro de Categoria */}
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1">
              <Tag className="w-3.5 h-3.5 text-gray-400" />
              <select 
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="bg-transparent text-xs font-bold text-gray-600 outline-none pr-4"
              >
                <option value="all">Todas Categorias</option>
                {FAQ_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                <option value="Geral">Outros/Geral</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between border-b border-gray-100 pb-2">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">
            Página {currentPage} de {totalPages || 1} ({filteredHistory.length} resultados)
          </h3>
          <span className="text-[10px] font-bold text-green-600 uppercase tracking-widest bg-green-50 px-2 py-1 rounded border border-green-100 flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span> Telemetria Live
          </span>
        </div>
        
        {paginatedHistory.length > 0 ? (
          <div className="space-y-3">
            {paginatedHistory.map((item: any, i: number) => {
               const category = detectCategory(item.question);

               return (
                <div key={i} className="group border-l-2 border-gray-100 pl-4 py-0.5 transition-all">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h3 className="text-sm font-medium text-gray-900 italic leading-tight">"{item.question}"</h3>
                      <span className="px-1.5 py-0.5 rounded bg-gray-100 text-[8px] font-black text-gray-500 uppercase">{category}</span>
                      <span className="text-[10px] text-gray-400 ml-auto font-mono">{new Date(item.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <p className={`text-[9px] font-bold uppercase tracking-wider ${getSourceColor(item.source)}`}>
                      {getSourceLabel(item.source)}
                    </p>
                  </div>
                </div>
               );
            })}

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8 pt-4 border-t border-gray-50">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 text-xs font-bold text-gray-500 bg-white border border-gray-200 rounded-md hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  Anterior
                </button>
                <div className="flex gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`w-7 h-7 text-[10px] font-black rounded-md transition-all ${
                        currentPage === page 
                        ? 'bg-blue-600 text-white shadow-sm' 
                        : 'text-gray-400 hover:bg-gray-100'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 text-xs font-bold text-gray-500 bg-white border border-gray-200 rounded-md hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  Próxima
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="p-12 text-center border-2 border-dashed border-gray-100 rounded-2xl bg-white">
            <p className="text-sm text-gray-400 italic">Nenhum resultado encontrado para os filtros aplicados.</p>
            <button 
              onClick={() => { setSearchTerm(''); setFilterSource('all'); setFilterCategory('all'); }}
              className="mt-4 text-blue-600 text-xs font-bold hover:underline"
            >
              Limpar todos os filtros
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {showDoc && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-blue-600 text-white">
              <h3 className="text-xl font-bold">Guia do Motor Semântico</h3>
              <button onClick={() => setShowDoc(false)} className="p-1 hover:bg-white/20 rounded-lg transition-colors text-white">
                 X
              </button>
            </div>
            
            <div className="p-8 overflow-y-auto space-y-8">
              <section>
                <h4 className="flex items-center gap-2 font-bold text-gray-900 mb-3">
                  <span className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs">01</span>
                  TF-IDF Local (Velocidade Máxima)
                </h4>
                <p className="text-sm text-gray-600 leading-relaxed ml-10">
                  Funciona como um buscador clássico de palavras. Se o usuário perguntar por "Preço", ele procura exatamente a palavra "Preço" no seu FAQ. 
                  <br /><br />
                  <strong className="text-gray-800">Vantagem:</strong> É instantâneo e não custa nada. <br />
                  <strong className="text-gray-800">Ideal para:</strong> FAQs simples e perguntas diretas.
                </p>
              </section>

              <section>
                <h4 className="flex items-center gap-2 font-bold text-gray-900 mb-3">
                  <span className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-xs">02</span>
                  Gemini Embeddings (Inteligência Profunda)
                </h4>
                <p className="text-sm text-gray-600 leading-relaxed ml-10">
                  Usa Redes Neurais para entender o "sentido" da frase. Se o usuário perguntar "Quanto custa?", ele entende que é o mesmo que "Qual o valor?". 
                  <br /><br />
                  <strong className="text-gray-800">Vantagem:</strong> Entende sinônimos e gírias com alta precisão. <br />
                  <strong className="text-gray-800">Ideal para:</strong> Conversas naturais e humanas. (Consome créditos da API).
                </p>
              </section>

              <section>
                <h4 className="flex items-center gap-2 font-bold text-gray-900 mb-3">
                  <span className="w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-xs">03</span>
                  Híbrido (O Equilíbrio Perfeito)
                </h4>
                <p className="text-sm text-gray-600 leading-relaxed ml-10">
                  O assistente tenta primeiro o modo gratuito e rápido. Se ele ficar na dúvida, ele ativa automaticamente o Gemini para garantir a melhor resposta. 
                  <br /><br />
                  <strong className="text-gray-800">Vantagem:</strong> Inteligência de ponta com o menor custo possível. <br />
                  <strong className="text-gray-800">Ideal para:</strong> A maioria das aplicações profissionais em produção.
                </p>
              </section>

              <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 text-xs text-gray-500 italic">
                Nota: Todas as alterações levam cerca de 2 segundos para serem propagadas para todos os usuários ativos no Chat.
              </div>
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-100 text-right">
              <button 
                onClick={() => setShowDoc(false)}
                className="px-6 py-2 bg-gray-900 text-white rounded-xl font-bold hover:bg-gray-800 transition-colors"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="border border-gray-200 rounded-xl bg-white shadow-sm overflow-hidden">
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
            <button 
              onClick={() => setShowDoc(true)}
              className="text-blue-600 hover:underline font-medium"
            >
              Ver documentação
            </button>
          </div>
        </div>

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
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 shadow-sm disabled:opacity-70 transition-colors"
            >
              {saving ? 'Atualizando...' : 'Salvar Alteração'}
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <h3 className="text-sm font-semibold text-gray-900">Histórico de Alterações de Configuração</h3>
        {configHistory.length > 0 ? (
          configHistory.map((item: any, i: number) => (
            <div key={i} className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className="flex justify-center items-center w-8 h-8 rounded-full bg-gray-100 text-gray-700 text-[10px] font-bold shrink-0">
                  {item.modified_by.substring(0, 2).toUpperCase()}
                </div>
                {i !== configHistory.length - 1 && <div className="w-px h-full bg-gray-200 my-1"></div>}
              </div>
              <div className="flex-1 pb-6">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-sm font-medium text-gray-900">Atualização v{item.version}</h3>
                  <span className="text-xs text-gray-500">{new Date(item.timestamp || Date.now()).toLocaleDateString()}</span>
                </div>
                <p className="text-xs text-gray-600">
                  Estratégia alterada para <strong className="uppercase">{item.strategy}</strong> por {item.modified_by}.
                </p>
              </div>
            </div>
          ))
        ) : (
           <p className="text-sm text-gray-500 italic">Nenhuma alteração de sistema registrada.</p>
        )}
      </div>
    </div>
  );
}
