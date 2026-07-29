import React, { useState } from 'react';
import { Shield, RefreshCw, Trash2, CheckCircle, AlertTriangle, Zap } from 'lucide-react';
import { api } from '../../services/api';

const MaintenanceToolsView: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [pattern, setPattern] = useState('');
  const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  const handleInvalidateVersion = async () => {
    if (!window.confirm('Isso marcará todos os registros antigos para revalidação. Continuar?')) return;
    
    setLoading(true);
    try {
      // Endpoint que criaremos a seguir
      await api.post('/admin/maintenance/invalidate-version');
      setStatus({ type: 'success', message: 'Versão do conhecimento atualizada com sucesso!' });
    } catch (err) {
      setStatus({ type: 'error', message: 'Falha ao atualizar versão.' });
    } finally {
      setLoading(false);
    }
  };

  const handleInvalidatePattern = async () => {
    if (!pattern) return;
    setLoading(true);
    try {
      const response = await api.post('/admin/maintenance/invalidate-pattern', { pattern });
      setStatus({ 
        type: 'success', 
        message: `Sucesso! ${response.data.affectedChat} registros afetados e ${response.data.audiosDeleted} áudios removidos.` 
      });
      setPattern('');
    } catch (err) {
      setStatus({ type: 'error', message: 'Falha na invalidação cirúrgica.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2 text-glow">
          <Shield className="text-cyan-400" /> Central de Manutenção Neural
        </h2>
      </div>

      {status && (
        <div className={`p-4 rounded-lg flex items-center gap-3 border ${
          status.type === 'success' ? 'bg-green-500/10 border-green-500/50 text-green-400' : 'bg-red-500/10 border-red-500/50 text-red-400'
        }`}>
          {status.type === 'success' ? <CheckCircle size={20} /> : <AlertTriangle size={20} />}
          {status.message}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* OPÇÃO A: ATUALIZAÇÃO GERAL */}
        <div className="bg-slate-900/50 border border-white/10 p-6 rounded-2xl backdrop-blur-xl hover:border-cyan-500/50 transition-all group">
          <div className="flex items-start justify-between mb-4">
            <div className="p-3 bg-cyan-500/20 rounded-xl text-cyan-400 group-hover:scale-110 transition-transform">
              <RefreshCw size={24} />
            </div>
            <span className="text-[10px] uppercase tracking-widest text-cyan-400 font-bold px-2 py-1 bg-cyan-500/10 rounded-full border border-cyan-500/20">
              Opção A
            </span>
          </div>
          <h3 className="text-lg font-bold text-white mb-2">Sincronização de Versão</h3>
          <p className="text-slate-400 text-sm mb-6 leading-relaxed">
            Invalida em massa todos os registros que utilizam uma versão obsoleta do conhecimento. 
            Útil após grandes mudanças estruturais na empresa.
          </p>
          <button
            onClick={handleInvalidateVersion}
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? <RefreshCw className="animate-spin" size={18} /> : <Zap size={18} />}
            Executar Sincronização Global
          </button>
        </div>

        {/* OPÇÃO C: LIMPEZA CIRÚRGICA */}
        <div className="bg-slate-900/50 border border-white/10 p-6 rounded-2xl backdrop-blur-xl hover:border-red-500/50 transition-all group">
          <div className="flex items-start justify-between mb-4">
            <div className="p-3 bg-red-500/20 rounded-xl text-red-400 group-hover:scale-110 transition-transform">
              <Trash2 size={24} />
            </div>
            <span className="text-[10px] uppercase tracking-widest text-red-400 font-bold px-2 py-1 bg-red-500/10 rounded-full border border-red-500/20">
              Opção C
            </span>
          </div>
          <h3 className="text-lg font-bold text-white mb-2">Invalidação Cirúrgica</h3>
          <p className="text-slate-400 text-sm mb-4 leading-relaxed">
            Localiza um termo específico (ex: "R$ 99,90") e apaga todos os áudios e registros que o citam.
          </p>
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Digite o termo ou valor a invalidar..."
              value={pattern}
              onChange={(e) => setPattern(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-red-500/50 outline-none transition-all placeholder:text-slate-600"
            />
            <button
              onClick={handleInvalidatePattern}
              disabled={loading || !pattern}
              className="w-full py-3 bg-red-500/20 hover:bg-red-500/30 text-red-400 font-bold rounded-xl border border-red-500/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? <RefreshCw className="animate-spin" size={18} /> : <Trash2 size={18} />}
              Executar Purga Cirúrgica
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MaintenanceToolsView;
