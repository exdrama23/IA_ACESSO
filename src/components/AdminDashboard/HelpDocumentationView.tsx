import { BookOpen, HelpCircle, Code, BarChart3, Database as DatabaseIcon, User, Calendar, Zap, ChevronDown } from 'lucide-react';
import { useState } from 'react';

export function HelpDocumentationView() {
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const sections = [
    {
      id: 'overview',
      title: 'Dashboard Principal (Overview)',
      icon: BarChart3,
      content: `
        A tela Overview é o centro de controle da plataforma:
        
        - Custo em Tempo Real: Acompanhe gastos com Gemini, ElevenLabs e Cloudinary.
        - Estratégia Semântica: Alterne entre TF-IDF (local) e Embeddings Neurais (remoto).
        - Histórico: Visualize todas as mudanças de configuração feitas pela equipe.
      `
    },
    {
      id: 'user-profile',
      title: 'Gerenciamento de Perfil',
      icon: User,
      content: `
        Gerencie sua identidade administrativa:
        
        - Dados Pessoais: Visualize nome, e-mail e cargo.
        - Auditoria: Veja o número total de configurações que você realizou.
        - Segurança: Atalhos para alteração de senha e edição de perfil.
      `
    },
    {
      id: 'calendar',
      title: 'Calendário e Eventos',
      icon: Calendar,
      content: `
        Organize marcos importantes do projeto:
        
        - Planejamento: Adicione lembretes e eventos com cores customizadas.
        - Persistência: Todos os eventos são salvos no banco PostgreSQL.
        - Navegação: Suporte para planejamento de longo prazo (até 2031).
      `
    },
    {
      id: 'metrics',
      title: 'Análise de Métricas',
      icon: Code,
      content: `
        Entenda a performance do seu sistema:
        
        - Gráficos de Linha: Tendência de custo nas últimas 24 horas.
        - Gráficos de Barra: Volume de requisições por período.
        - KPIs: Taxa de Cache Hit, Latência média e taxa de erro.
      `
    },
    {
      id: 'integrations',
      title: 'Integrações e APIs',
      icon: Zap,
      content: `
        Configure os motores externos de IA:
        
        - Chaves de API: Gerencie credenciais de forma segura.
        - Vozes TTS: Escolha entre os diferentes perfis da ElevenLabs.
        - Fallbacks: Defina sistemas de redundância (ex: se ElevenLabs falhar, use Google).
      `
    },
    {
      id: 'database',
      title: 'Visualizador de Dados',
      icon: DatabaseIcon,
      content: `
        Inspecione a integridade dos dados:
        
        - Schema: Veja tabelas, tipos de campos e chaves (PK/FK).
        - Relacionamentos: Entenda como as entidades se conectam.
        - Estatísticas: Contagem total de registros por tabela.
      `
    },
  ];

  const faqs = [
    {
      q: 'O que acontece se eu mudar a estratégia de embedding?',
      a: 'A mudança é imediata. Novas perguntas usarão o novo motor, mas o custo pode variar dependendo da escolha (Gemini é pago, TF-IDF é gratuito).'
    },
    {
      q: 'Como funcionam os fallbacks?',
      a: 'O sistema tenta primeiro o serviço principal. Se houver erro ou timeout, ele alterna automaticamente para o fallback configurado sem interromper o usuário.'
    },
    {
      q: 'Os dados do dashboard são em tempo real?',
      a: 'Sim, a maioria dos indicadores reflete o estado atual do sistema, com atualização automática a cada carregamento de página.'
    },
  ];

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-blue-600" /> Centro de Ajuda e Documentação
        </h2>
        <p className="text-sm text-gray-500 mt-1">Tudo o que você precisa saber para operar o painel AcessoIA.</p>
      </div>

      {/* Seções Expansíveis */}
      <div className="space-y-3">
        {sections.map((section) => {
          const Icon = section.icon;
          const isExpanded = expandedSection === section.id;

          return (
            <div key={section.id} className="border border-gray-200 rounded-xl bg-white overflow-hidden shadow-sm transition-all">
              <button
                onClick={() => setExpandedSection(isExpanded ? null : section.id)}
                className={`w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors ${isExpanded ? 'bg-blue-50/30' : ''}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${isExpanded ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <h3 className="font-semibold text-gray-900 text-sm">{section.title}</h3>
                </div>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
              </button>

              {isExpanded && (
                <div className="px-14 py-5 bg-white border-t border-gray-100 text-sm text-gray-600 leading-relaxed whitespace-pre-line animate-in fade-in slide-in-from-top-2 duration-200">
                  {section.content}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* FAQ Section */}
      <div className="border border-gray-200 rounded-xl bg-white shadow-sm p-6 mt-8">
        <h3 className="font-bold text-gray-900 mb-6 flex items-center gap-2 text-sm uppercase tracking-widest">
          <HelpCircle className="w-4 h-4 text-blue-500" /> Perguntas Frequentes
        </h3>

        <div className="space-y-6">
          {faqs.map((faq, idx) => (
            <div key={idx} className="group">
              <p className="font-bold text-gray-800 mb-2 flex items-start gap-2">
                 <span className="text-blue-600 font-black">Q.</span>
                 {faq.q}
              </p>
              <p className="text-sm text-gray-600 pl-6 border-l-2 border-gray-100 group-hover:border-blue-200 transition-colors">
                 {faq.a}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Suporte */}
      <div className="bg-indigo-600 rounded-xl p-6 text-white shadow-lg flex items-center justify-between">
         <div>
            <h4 className="font-bold text-lg mb-1">Ainda precisa de ajuda?</h4>
            <p className="text-indigo-100 text-sm">Nosso time de engenharia está disponível para suporte técnico especializado.</p>
         </div>
         <button className="px-6 py-2 bg-white text-indigo-600 rounded-lg font-bold text-sm hover:bg-indigo-50 transition-colors shadow-sm">
            Abrir Ticket
         </button>
      </div>
    </div>
  );
}
