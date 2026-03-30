import { ShieldCheck, Lock } from 'lucide-react';
import { useState } from 'react';
import { API_URL } from '../../services/api';

export function IntegrationsView() {
  const [verifyModal, setVerifyModal] = useState<{service: string, step: 'code' | 'edit'} | null>(null);
  const [verificationCode, setCode] = useState('');
  const [authToken, setAuthToken] = useState('');
  const [newKey, setNewKey] = useState('');

  const [fallbacks] = useState([
    { service: 'TTS (Text-to-Speech)', primary: 'ElevenLabs', fallback: 'Google Translate', status: 'ready' },
    { service: 'Embeddings', primary: 'Gemini', fallback: 'TF-IDF Local', status: 'ready' },
  ]);

  const token = localStorage.getItem('acessoia_token');

  const requestVerification = async (service: string) => {
    try {
      const response = await fetch(`${API_URL}/admin/integrations/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ service })
      });
      if (response.ok) {
        setVerifyModal({ service, step: 'code' });
      } else {
        alert('Erro ao solicitar verificação');
      }
    } catch (err) {
      alert('Falha na conexão');
    }
  };

  const verifyCode = async () => {
    try {
      const response = await fetch(`${API_URL}/admin/integrations/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ service: verifyModal?.service, code: verificationCode })
      });
      const result = await response.json();
      if (result.status === 'ok') {
        setAuthToken(result.authToken);
        setVerifyModal({ ...verifyModal!, step: 'edit' });
      } else {
        alert('Código inválido');
      }
    } catch (err) {
      alert('Falha na verificação');
    }
  };

  const saveNewKey = async () => {
    try {
      const response = await fetch(`${API_URL}/admin/integrations/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ service: verifyModal?.service, key: newKey, authToken })
      });
      if (response.ok) {
        alert('Chave atualizada com sucesso!');
        setVerifyModal(null);
        setNewKey('');
        setAuthToken('');
        setCode('');
      } else {
        alert('Erro ao salvar chave');
      }
    } catch (err) {
      alert('Erro de conexão');
    }
  };

  return (
    <div className="space-y-6">
      <div className="border border-gray-200 rounded-xl bg-white shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-200 bg-gray-50/50">
          <h3 className="font-semibold text-gray-900 text-sm">Chaves de API e Credenciais</h3>
        </div>

        <div className="divide-y divide-gray-200">
          {['gemini', 'elevenlabs', 'cloudinary'].map((service) => (
            <div key={service} className="p-6 hover:bg-gray-50/30 transition-colors">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h4 className="font-semibold text-gray-900 text-sm capitalize">{service} Service</h4>
                  <p className="text-xs text-gray-500 mt-1">Configuração de credenciais para {service}.</p>
                </div>
                <span className="px-2 py-1 rounded text-[10px] font-bold bg-green-100 text-green-700 uppercase tracking-wider border border-green-200">
                  Conectado
                </span>
              </div>

              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <input 
                    type="password"
                    disabled
                    className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm bg-gray-50 text-gray-400"
                    value="••••••••••••••••••••••••••••••"
                  />
                  <Lock className="w-3 h-3 absolute right-3 top-3 text-gray-300" />
                </div>
                <button 
                  onClick={() => requestVerification(service)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium shadow-sm transition-colors flex items-center gap-2"
                >
                  <ShieldCheck className="w-4 h-4" /> Atualizar
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="border border-gray-200 rounded-xl bg-white shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-200 bg-gray-50/50">
          <h3 className="font-semibold text-gray-900 text-sm">Alta Disponibilidade (Fallbacks)</h3>
        </div>
        <div className="p-6 space-y-4">
          {fallbacks.map((fb, i) => (
            <div key={i} className="flex items-center justify-between p-4 border border-gray-100 rounded-lg bg-white">
              <div>
                <p className="font-semibold text-gray-900 text-sm">{fb.service}</p>
                <p className="text-xs text-gray-500">{fb.primary} → {fb.fallback}</p>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-600 border border-blue-100 uppercase">Ready</span>
            </div>
          ))}
        </div>
      </div>

      <div className="border border-gray-200 rounded-xl bg-white shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50/50 flex justify-between items-center">
          <h3 className="font-semibold text-gray-900 text-sm">Gerenciamento de Redundância (Camadas de Fallback)</h3>
          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-black rounded uppercase tracking-wider border border-blue-200">Max 3 Chaves/Srv</span>
        </div>
        <div className="p-6 space-y-8">
          <p className="text-xs text-gray-500 leading-relaxed max-w-2xl">
            Configure até <strong>duas chaves de reserva</strong> para cada serviço. O sistema utiliza uma hierarquia de 3 níveis: 
            <span className="text-blue-600 font-bold ml-1">Principal → Backup 1 → Backup 2</span>. 
            A alternância ocorre automaticamente em milissegundos se houver falha na camada anterior.
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {[
              { id: 'gemini', label: 'Gemini AI' },
              { id: 'elevenlabs', label: 'ElevenLabs TTS' },
              { id: 'cloudinary', label: 'Cloudinary CDN' }
            ].map((srv) => (
              <div key={srv.id} className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-1.5 h-4 bg-blue-600 rounded-full"></div>
                  <h4 className="text-xs font-black text-gray-900 uppercase tracking-tighter">{srv.label}</h4>
                </div>
                
                <div className="p-4 border border-gray-100 rounded-xl bg-gray-50/30 flex flex-col gap-3 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 px-2 py-0.5 bg-gray-200 text-[8px] font-bold text-gray-500 uppercase rounded-bl-lg">Nível 2</div>
                  <div>
                    <h5 className="text-[10px] font-bold text-gray-600 uppercase">Backup Primário</h5>
                    <p className="text-[9px] text-gray-400">Ativado após erro na conta principal</p>
                  </div>
                  <button 
                    onClick={() => requestVerification(`${srv.id}_backup_1`)}
                    className="w-full py-2 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-600 hover:bg-blue-600 hover:text-white transition-all shadow-sm flex items-center justify-center gap-2"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" /> Configurar B1
                  </button>
                </div>

                <div className="p-4 border border-gray-100 rounded-xl bg-gray-50/30 flex flex-col gap-3 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 px-2 py-0.5 bg-gray-200 text-[8px] font-bold text-gray-500 uppercase rounded-bl-lg">Nível 3</div>
                  <div>
                    <h5 className="text-[10px] font-bold text-gray-600 uppercase">Backup de Emergência</h5>
                    <p className="text-[9px] text-gray-400">Última camada de segurança</p>
                  </div>
                  <button 
                    onClick={() => requestVerification(`${srv.id}_backup_2`)}
                    className="w-full py-2 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-600 hover:bg-blue-600 hover:text-white transition-all shadow-sm flex items-center justify-center gap-2"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" /> Configurar B2
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-xl flex gap-3">
            <div className="p-2 bg-white rounded-lg text-indigo-600 h-fit shadow-sm">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-indigo-900 mb-1">Rodízio Inteligente de Cotas</p>
              <p className="text-[10px] text-indigo-700 leading-relaxed">
                Ao preencher os 3 níveis, seu assistente ganha uma resiliência de 300%. Ideal para eventos de grande escala onde o limite de uma única conta gratuita ou trial pode ser atingido rapidamente.
              </p>
            </div>
          </div>
        </div>
      </div>

      {verifyModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 animate-in zoom-in-95 duration-200">
            <div className="text-center mb-6">
              <ShieldCheck className="w-12 h-12 text-blue-600 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-900">Verificação de Segurança</h3>
              <p className="text-sm text-gray-500 mt-2">
                {verifyModal.service.includes('redundant') ? 'Configurando Chave de Backup para ' : 'Atualizando chave principal para '}
                <span className="font-bold text-gray-700 capitalize">{verifyModal.service.replace('_redundant', '')}</span>
              </p>
            </div>

            {verifyModal.step === 'code' ? (
              <div className="space-y-4">
                <p className="text-xs text-center text-gray-400">Digite o código de 6 dígitos enviado para seu e-mail.</p>
                <input 
                  type="text"
                  maxLength={6}
                  value={verificationCode}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="000000"
                  className="w-full text-center text-2xl font-mono py-3 border-2 rounded-xl focus:border-blue-500 outline-none transition-colors"
                />
                <button onClick={verifyCode} className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all">Verificar Código</button>
              </div>
            ) : (
              <div className="space-y-4">
                <textarea 
                  value={newKey}
                  onChange={(e) => setNewKey(e.target.value)}
                  placeholder="Cole aqui a nova chave de API (Backup)..."
                  className="w-full p-3 border-2 rounded-xl focus:border-blue-500 outline-none min-h-[100px] text-sm font-mono"
                />
                <button onClick={saveNewKey} className="w-full py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 shadow-lg shadow-green-100 transition-all">Salvar Chave de Backup</button>
              </div>
            )}
            <button onClick={() => setVerifyModal(null)} className="w-full mt-4 text-sm text-gray-400 hover:text-gray-600 transition-colors">Cancelar</button>
          </div>
        </div>
      )}
    </div>
  );
}
