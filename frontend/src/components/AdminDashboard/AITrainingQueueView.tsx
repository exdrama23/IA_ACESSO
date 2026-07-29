import React, { useState, useEffect } from 'react';
import { Brain, Check, X, MessageSquare, ShieldCheck, Search } from 'lucide-react';
import { api } from '../../services/api';

interface ChatRecord {
  id: string;
  question: string;
  answer: string;
  source: string;
  confidence: number;
  isVerified: boolean;
  createdAt: string;
}

const AITrainingQueueView: React.FC = () => {
  const [records, setRecords] = useState<ChatRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchPending = async () => {
    try {
      // Endpoint para listar registros não verificados
      const response = await api.get('/admin/maintenance/pending-curation');
      setRecords(response.data);
    } catch (err) {
      console.error('Falha ao carregar fila de curadoria');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPending();
  }, []);

  const handleVerify = async (id: string, status: boolean) => {
    try {
      await api.post(`/admin/maintenance/verify-record/${id}`, { status });
      setRecords(prev => prev.filter(r => r.id !== id));
    } catch (err) {
      alert('Erro ao atualizar status do registro.');
    }
  };

  const filteredRecords = records.filter(r => 
    r.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.answer.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2 text-glow">
            <Brain className="text-pink-400" /> Curadoria de Inteligência
          </h2>
          <p className="text-slate-400 text-sm mt-1">Valide as respostas geradas automaticamente pela IA</p>
        </div>
        
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-pink-400 transition-colors" size={18} />
          <input 
            type="text" 
            placeholder="Filtrar perguntas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-slate-900/80 border border-white/10 rounded-full pl-10 pr-4 py-2 text-sm text-white focus:border-pink-500/50 outline-none w-full md:w-64 transition-all"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin text-pink-400"><Brain size={40} /></div>
        </div>
      ) : filteredRecords.length === 0 ? (
        <div className="text-center py-20 bg-slate-900/30 rounded-3xl border border-dashed border-white/10">
          <ShieldCheck size={48} className="mx-auto text-slate-700 mb-4" />
          <p className="text-slate-500">Nenhum registro pendente de curadoria no momento.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredRecords.map((record) => (
            <div key={record.id} className="bg-slate-900/50 border border-white/10 p-5 rounded-2xl hover:bg-slate-800/50 transition-all group">
              <div className="flex flex-col md:flex-row gap-6">
                <div className="flex-1 space-y-4">
                  <div className="space-y-1">
                    <div className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1">
                      <MessageSquare size={12} /> Pergunta do Usuário
                    </div>
                    <p className="text-white font-medium">{record.question}</p>
                  </div>
                  <div className="space-y-1">
                    <div className="text-[10px] uppercase font-bold text-pink-400/70 flex items-center gap-1">
                      <Brain size={12} /> Resposta da IA ({record.source})
                    </div>
                    <p className="text-slate-300 text-sm leading-relaxed bg-black/20 p-3 rounded-xl border border-white/5 italic">
                      "{record.answer}"
                    </p>
                  </div>
                </div>

                <div className="flex md:flex-col justify-end gap-2 shrink-0 border-t md:border-t-0 md:border-l border-white/10 pt-4 md:pt-0 md:pl-6">
                  <button 
                    onClick={() => handleVerify(record.id, true)}
                    className="flex-1 md:flex-none p-3 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-xl border border-green-500/30 transition-all flex items-center justify-center gap-2"
                    title="Aprovar Resposta"
                  >
                    <Check size={20} /> <span className="md:hidden">Aprovar</span>
                  </button>
                  <button 
                    onClick={() => handleVerify(record.id, false)}
                    className="flex-1 md:flex-none p-3 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-xl border border-red-500/30 transition-all flex items-center justify-center gap-2"
                    title="Descartar Resposta"
                  >
                    <X size={20} /> <span className="md:hidden">Descartar</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AITrainingQueueView;
