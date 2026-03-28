import { useState, useEffect } from 'react';
import { Mic, User as UserIcon, Plus, Check, ShieldCheck, Trash2 } from 'lucide-react';
import { Avatar3DPreview } from '../Avatar3D/Preview';
import { useAppStore } from '../../store/useAppStore';

interface VoicesAvatarViewProps {
  config: any;
  onUpdateConfig: (updates: any) => Promise<void>;
  saving: boolean;
}

export function VoicesAvatarView({ config, onUpdateConfig, saving }: VoicesAvatarViewProps) {
  const defaultVoice = { id: 'hpp4J3VqNfWAUOO0d1Us', name: 'Eduarda (Oficial)' };

  const [pendingVoiceId, setPendingVoiceId] = useState<string | null>(null);
  const [voices, setVoices] = useState<any[]>([]);

  const [newVoiceId, setNewVoiceId] = useState('');
  const [newVoiceName, setNewVoiceName] = useState('');
  
  const { setActiveVoiceId } = useAppStore();
  
  const currentVoiceId = config.tts?.voiceId || defaultVoice.id;
  
  const selectedVoiceId = pendingVoiceId || currentVoiceId;
  
  useEffect(() => {
    const configVoices = config.tts?.availableVoices || [];
    if (configVoices.length === 0) {
      setVoices([defaultVoice]);
    } else {
      setVoices(configVoices);
    }
    setPendingVoiceId(null);
  }, [config]);

  useEffect(() => {
    setActiveVoiceId(selectedVoiceId);
  }, [selectedVoiceId, setActiveVoiceId]);

  const handleAddVoice = () => {
    if (!newVoiceId || !newVoiceName) {
      alert('Preencha o ID e o Nome da voz');
      return;
    }

    if (voices.some((v: any) => v.id === newVoiceId)) {
      alert('Este ID de voz já existe na lista');
      return;
    }

    const updatedVoices = [...voices, { id: newVoiceId, name: newVoiceName }];
    setVoices(updatedVoices);
    setNewVoiceId('');
    setNewVoiceName('');

    onUpdateConfig({ tts: { ...config.tts, availableVoices: updatedVoices } });
  };

  const handleRemoveVoice = (id: string) => {
    if (id === currentVoiceId) {
      alert('Não é possível remover a voz que está em uso no momento');
      return;
    }
    const updatedVoices = voices.filter((v: any) => v.id !== id);
    setVoices(updatedVoices);
    onUpdateConfig({ tts: { ...config.tts, availableVoices: updatedVoices } });
  };

  const handleConfirmChange = () => {
    onUpdateConfig({ tts: { ...config.tts, voiceId: selectedVoiceId } });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      <div className="border border-gray-200 rounded-2xl bg-white shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
          <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
            <Mic className="w-4 h-4 text-blue-600" /> Gerenciamento de Vozes (ElevenLabs)
          </h3>
          <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-black rounded uppercase">Premium TTS</span>
        </div>

        <div className="p-6 space-y-8">

          <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-5">
            <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-4">Adicionar Nova Identidade de Voz</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">Voice ID (ElevenLabs)</label>
                <input 
                  type="text" 
                  value={newVoiceId}
                  onChange={(e) => setNewVoiceId(e.target.value)}
                  placeholder="Ex: 21m00Tcm4Tlv..."
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 outline-none"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">Nome de Exibição</label>
                <input 
                  type="text" 
                  value={newVoiceName}
                  onChange={(e) => setNewVoiceName(e.target.value)}
                  placeholder="Ex: Eduarda (Oficial)"
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 outline-none"
                />
              </div>
              <div className="flex items-end">
                <button 
                  onClick={handleAddVoice}
                  className="w-full h-9.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition-all flex items-center justify-center gap-2 shadow-md shadow-blue-100"
                >
                  <Plus className="w-4 h-4" /> Adicionar à Lista
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Definir Voz Ativa do Assistente</h4>
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <select 
                  value={selectedVoiceId}
                  onChange={(e) => setPendingVoiceId(e.target.value)}
                  className="w-full pl-4 pr-10 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 outline-none appearance-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                >
                  {voices.map((voice: any) => (
                    <option key={voice.id} value={voice.id}>{voice.name} ({voice.id})</option>
                  ))}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">▼</div>
              </div>
              <button 
                onClick={handleConfirmChange}
                disabled={saving || selectedVoiceId === currentVoiceId}
                className="px-8 bg-gray-900 text-white rounded-xl text-sm font-bold hover:bg-black disabled:opacity-50 disabled:grayscale transition-all flex items-center gap-2 shadow-lg"
              >
                {saving ? 'Salvando...' : selectedVoiceId === currentVoiceId ? <><Check className="w-4 h-4" /> Voz Atual</> : 'Confirmar Alteração'}
              </button>
            </div>
          </div>

          <div className="space-y-3">
             <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Biblioteca de Vozes</h4>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {voices.map((voice: any) => (
                  <div key={voice.id} className={`flex items-center justify-between p-3 border rounded-xl transition-all ${currentVoiceId === voice.id ? 'border-blue-200 bg-blue-50/30' : selectedVoiceId === voice.id ? 'border-yellow-200 bg-yellow-50/30' : 'border-gray-100 bg-white'}`}>
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${currentVoiceId === voice.id ? 'bg-blue-600 text-white' : selectedVoiceId === voice.id ? 'bg-yellow-500 text-white' : 'bg-gray-100 text-gray-400'}`}>
                        <Mic className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-gray-800">{voice.name}</p>
                        <p className="text-[9px] text-gray-400 font-mono">{voice.id}</p>
                      </div>
                    </div>
                    {voice.id !== '21m00Tcm4TlvDq8ikWAM' && (
                      <button 
                        onClick={() => handleRemoveVoice(voice.id)}
                        className="p-2 text-gray-300 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
             </div>
          </div>
        </div>
      </div>

      <div className="border border-gray-200 rounded-2xl bg-white shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
          <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
            <UserIcon className="w-4 h-4 text-purple-600" /> Configuração do Avatar 3D
          </h3>
          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-black rounded uppercase">Modelo Ativo</span>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="relative group border-2 border-blue-500 rounded-2xl overflow-hidden bg-black flex flex-col h-96 shadow-xl shadow-blue-100">
              <Avatar3DPreview />

              <div className="absolute top-3 left-3 px-3 py-1 bg-blue-600 text-white text-[10px] font-black rounded-full flex items-center gap-1.5 shadow-lg border border-blue-400 z-10">
                <Check className="w-3 h-3" /> PADRÃO ATIVO
              </div>
            </div>

            <div className="border-2 border-dashed border-gray-100 rounded-2xl flex flex-col items-center justify-center p-8 bg-gray-50/50 group hover:bg-gray-50 hover:border-gray-200 transition-all cursor-not-allowed">
              <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-gray-300 mb-3 shadow-sm group-hover:scale-110 transition-transform">
                <Plus className="w-6 h-6" />
              </div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-tight">Novo Modelo 3D</p>
              <p className="text-[9px] text-gray-300 mt-1 uppercase">Disponível em breve</p>
            </div>
          </div>

          <div className="mt-6 p-4 bg-purple-50 border border-purple-100 rounded-xl">
            <p className="text-[10px] text-purple-700 leading-relaxed font-medium">
              O modelo <strong>Acesso Neural V1</strong> utiliza tecnologia de Shaders GLSL para reagir à voz e ao movimento da mão em tempo real. A troca por modelos GLB/FBX (Humanoides) está em fase de homologação.
            </p>
          </div>
        </div>
      </div>

      <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl flex gap-3">
        <div className="p-2 bg-white rounded-lg text-amber-600 h-fit shadow-sm"><ShieldCheck className="w-4 h-4" /></div>
        <div>
          <p className="text-xs font-bold text-amber-900 mb-1">Informação Técnica</p>
          <p className="text-[10px] text-amber-700 leading-relaxed">
            As vozes são consumidas diretamente da sua conta ElevenLabs. Certifique-se de que o Voice ID cadastrado existe na sua biblioteca de vozes para evitar falhas no sintetizador de áudio.
          </p>
        </div>
      </div>
    </div>
  );
}
