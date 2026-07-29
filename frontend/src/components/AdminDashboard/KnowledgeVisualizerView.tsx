import React from 'react';
import { Book, Cpu, Wifi, Phone, Building2, Info, BadgeCheck } from 'lucide-react';
import { lpgKnowledge, KNOWLEDGE_VERSION } from '../../data/lpgKnowledge';

const KnowledgeVisualizerView: React.FC = () => {
  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2 text-glow">
            <Book className="text-blue-400" /> Núcleo de Conhecimento
          </h2>
          <p className="text-slate-400 text-sm mt-1">Fonte da verdade para as decisões da IA</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/30 rounded-full">
          <BadgeCheck size={18} className="text-blue-400" />
          <span className="text-blue-400 text-xs font-mono font-bold uppercase tracking-tighter">Versão: {KNOWLEDGE_VERSION}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* SOBRE E HISTÓRIA */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-slate-900/50 border border-white/10 p-6 rounded-2xl backdrop-blur-md">
            <div className="flex items-center gap-3 mb-4 text-white font-bold border-b border-white/5 pb-4">
              <Info className="text-blue-400" size={20} /> Institucional
            </div>
            <p className="text-slate-300 leading-relaxed italic border-l-4 border-blue-500/50 pl-4 py-2 bg-blue-500/5 rounded-r-lg">
              "{lpgKnowledge.about}"
            </p>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
              <div className="p-4 bg-black/30 rounded-xl border border-white/5">
                <div className="text-[10px] text-slate-500 uppercase font-bold mb-1">Fundação</div>
                <div className="text-white font-bold">{lpgKnowledge.metadata.yearsInMarket} Anos</div>
              </div>
              <div className="p-4 bg-black/30 rounded-xl border border-white/5">
                <div className="text-[10px] text-slate-500 uppercase font-bold mb-1">Sede</div>
                <div className="text-white font-bold">{lpgKnowledge.metadata.headquarters}</div>
              </div>
              <div className="p-4 bg-black/30 rounded-xl border border-white/5">
                <div className="text-[10px] text-slate-500 uppercase font-bold mb-1">Cultura</div>
                <div className="text-white font-bold text-xs">{lpgKnowledge.metadata.culturalContext}</div>
              </div>
            </div>
          </div>

          <div className="bg-slate-900/50 border border-white/10 p-6 rounded-2xl backdrop-blur-md">
            <div className="flex items-center gap-3 mb-4 text-white font-bold border-b border-white/5 pb-4">
              <Wifi className="text-cyan-400" size={20} /> Portfólio de Planos
            </div>
            <div className="space-y-4">
              {lpgKnowledge.plans.map((plan, idx) => (
                <div key={idx} className="flex items-center justify-between p-4 bg-black/20 rounded-xl border border-white/5 hover:border-cyan-500/30 transition-all">
                  <div>
                    <div className="text-white font-bold">{plan.name}</div>
                    <div className="text-xs text-slate-500">{plan.profile}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-cyan-400 font-black text-lg">R$ {plan.price.toFixed(2)}</div>
                    <div className="text-[10px] text-slate-500 font-bold uppercase">{plan.wifi}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* COLUNA LATERAL - DADOS TÉCNICOS */}
        <div className="space-y-6">
          <div className="bg-slate-900/50 border border-white/10 p-6 rounded-2xl backdrop-blur-md">
            <div className="flex items-center gap-3 mb-4 text-white font-bold">
              <Cpu className="text-purple-400" size={20} /> Tecnologia
            </div>
            <div className="space-y-3">
              <div className="p-3 bg-purple-500/5 rounded-lg border border-purple-500/20">
                <div className="text-xs text-white font-bold mb-1">Infraestrutura</div>
                <p className="text-xs text-slate-400 leading-tight">{lpgKnowledge.technology.infrastructure}</p>
              </div>
              <div className="p-3 bg-purple-500/5 rounded-lg border border-purple-500/20">
                <div className="text-xs text-white font-bold mb-1">Equipamentos</div>
                <p className="text-xs text-slate-400 leading-tight">{lpgKnowledge.technology.equipment}</p>
              </div>
            </div>
          </div>

          <div className="bg-slate-900/50 border border-white/10 p-6 rounded-2xl backdrop-blur-md">
            <div className="flex items-center gap-3 mb-4 text-white font-bold">
              <Phone className="text-green-400" size={20} /> Suporte
            </div>
            <div className="text-sm font-mono text-green-400 font-bold mb-2">{lpgKnowledge.support.phone}</div>
            <ul className="space-y-2">
              {lpgKnowledge.benefits.slice(0, 3).map((b, i) => (
                <li key={i} className="text-[11px] text-slate-400 flex items-center gap-2">
                  <div className="w-1 h-1 bg-green-400 rounded-full" /> {b}
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-slate-900/50 border border-white/10 p-6 rounded-2xl backdrop-blur-md">
            <div className="flex items-center gap-3 mb-4 text-white font-bold">
              <Building2 className="text-orange-400" size={20} /> Corporativo
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              {lpgKnowledge.b2b_b2g.solutions}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KnowledgeVisualizerView;
