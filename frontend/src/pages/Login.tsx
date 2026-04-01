import { useState } from 'react';
import { Mail, Lock, EyeOff, Eye, ChevronLeft, ArrowRight, CheckCircle } from 'lucide-react';
import BackgroundImage from '../assets/BackgroundLogin.png';
import LogoAcesso from '../assets/LogoAcesso.png';
import { API_URL } from '../services/api';

type AuthView = 'login' | 'forgot' | 'code' | 'reset' | 'success';

export function Login() {

  const [view, setView] = useState<AuthView>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');

  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleLogin = async (e: React.FormEvent) => {    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await response.json();
      if (response.ok && data.token) {
        localStorage.setItem('acessoia_token', data.token);
        localStorage.setItem('acessoia_user', JSON.stringify({ email, role: 'admin' }));
        window.location.href = '/admin';
      } else {
        setError(data.error || 'Credenciais inválidas');
      }
    } catch (err) { setError('Erro ao conectar com o servidor'); }
    finally { setLoading(false); }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      
      let data;
      try {
        data = await response.json();
      } catch (jsonErr) {
        throw new Error('Resposta inválida do servidor');
      }

      if (response.ok) {
        setView('code');
      } else {
        setError(data.error || data.details || 'Erro ao enviar código');
      }
    } catch (err: any) { 
      setError(err.message === 'Failed to fetch' ? 'Erro de conexão com o servidor' : (err.message || 'Erro no servidor')); 
    } finally { 
      setLoading(false); 
    }
  };

  const handleVerifyCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (resetCode.length === 6) setView('reset');
    else setError('Digite o código de 6 dígitos');
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError('As senhas não coincidem');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: resetCode, newPassword })
      });
      const data = await response.json();
      if (response.ok) setView('success');
      else setError(data.error || 'Erro ao redefinir senha');
    } catch (err) { setError('Erro no servidor'); }
    finally { setLoading(false); }
  };

  return (
    <div 
      className="relative min-h-screen flex flex-col items-center justify-center p-5 overflow-hidden bg-cover bg-center bg-no-repeat font-sans"
      style={{ backgroundImage: `url(${BackgroundImage})` }}
    >
      <div className="absolute inset-0 bg-black/20 z-0"></div>
      
      {}
      <div className="absolute top-8 z-10 flex flex-col items-center">
        <img src={LogoAcesso} alt="Logo Acesso" className="h-96 w-auto drop-shadow-2xl" />
      </div>
      
      {}
      <div className="relative z-10 w-full flex flex-col items-center justify-center pt-40">

        {}
        <div className="relative z-10 w-full max-w-[400px]">
        <div className="bg-white/40 backdrop-blur-xl rounded-2xl shadow-2xl p-8 border border-white/50 transition-all duration-500">
          
          {}
          {view === 'login' && (
            <>
              <h2 className="text-center text-xl text-white font-semibold mb-6">Seja bem-vindo!</h2>
              <form onSubmit={handleLogin} className="space-y-4">
                {error && <div className="bg-red-50/90 text-red-600 p-3 rounded-lg text-xs text-center animate-shake">{error}</div>}
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="E-mail" className="w-full pl-10 pr-4 py-3 bg-white rounded-lg text-sm text-gray-800 outline-none focus:ring-2 focus:ring-[#ce0a53]/50" />
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="Senha" className="w-full pl-10 pr-10 py-3 bg-white rounded-lg text-sm text-gray-800 outline-none focus:ring-2 focus:ring-[#ce0a53]/50" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">{showPassword ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}</button>
                </div>
                <button type="submit" disabled={loading} className="w-full bg-[#cc0d55] hover:bg-[#a60a44] text-white rounded-lg py-3 text-sm font-bold transition-all disabled:opacity-70 disabled:cursor-not-allowed flex justify-center cursor-pointer">
                  {loading ? <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div> : "Entrar"}
                </button>
              </form>
              {/* Temporariamente desabilitado: Esqueceu a senha?
              <div className="mt-5 text-center">
                <button onClick={() => {setView('forgot'); setError('');}} className="text-sm text-white hover:text-red-100 underline underline-offset-4">Esqueceu a senha?</button>
              </div>
              */}
            </>
          )}

          {}
          {view === 'forgot' && (
            <>
              <button onClick={() => setView('login')} className="flex items-center text-white hover:text-red-100 mb-4 text-sm font-medium cursor-pointer">
                <ChevronLeft className="w-4 h-4 mr-1" /> Voltar
              </button>
              <h2 className="text-xl text-white font-bold mb-2">Recuperar Senha</h2>
              <p className="text-white text-xs mb-6 leading-relaxed">Digite seu e-mail abaixo. Enviaremos um código de verificação para que você possa redefinir sua senha com segurança.</p>
              <form onSubmit={handleForgotPassword} className="space-y-4">
                {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-xs text-center">{error}</div>}
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="Seu e-mail cadastrado" className="w-full pl-10 pr-4 py-3 bg-white rounded-lg text-sm text-gray-800 outline-none focus:ring-2 focus:ring-[#ce0a53]/50" />
                </div>
                <button type="submit" disabled={loading} className="w-full bg-[#cc0d55] hover:bg-[#a60a44] text-white rounded-lg py-3 text-sm font-bold flex justify-center items-center gap-2 transition-all cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed">
                  {loading ? <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div> : <>Enviar Código <ArrowRight className="w-4 h-4" /></>}
                </button>
              </form>
            </>
          )}

          {}
          {view === 'code' && (
            <>
              <button onClick={() => setView('forgot')} className="flex items-center text-white hover:text-red-100 mb-4 text-sm font-medium cursor-pointer">
                <ChevronLeft className="w-4 h-4 mr-1" /> Alterar e-mail
              </button>
              <h2 className="text-xl text-white font-bold mb-2">Verifique seu E-mail</h2>
              <p className="text-white text-xs mb-6">Enviamos um código de 6 dígitos para <strong>{email}</strong>. O código expira em 15 minutos.</p>
              <form onSubmit={handleVerifyCode} className="space-y-4">
                {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-xs text-center">{error}</div>}
                <input 
                  type="text" 
                  maxLength={6} 
                  value={resetCode} 
                  onChange={(e) => setResetCode(e.target.value.replace(/\D/g, ''))} 
                  required 
                  placeholder="000000" 
                  className="w-full tracking-[1em] text-center py-4 bg-white rounded-lg text-xl font-bold text-gray-800 outline-none border-2 border-transparent focus:border-[#ce0a53]/30 transition-all"
                />
                <button type="submit" className="w-full bg-[#cc0d55] hover:bg-[#a60a44] text-white rounded-lg py-3 text-sm font-bold cursor-pointer">Verificar Código</button>
              </form>
              <p className="mt-6 text-center text-[10px] text-white uppercase tracking-wider">Não recebeu? Verifique a caixa de spam ou click em reenviar codigo.</p>
            </>
          )}

          {}
          {view === 'reset' && (
            <>
              <h2 className="text-xl text-white font-bold mb-2">Nova Senha</h2>
              <p className="text-white text-xs mb-6">Crie uma senha forte e segura que você não tenha usado antes.</p>
              <form onSubmit={handleResetPassword} className="space-y-4">
                {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-xs text-center">{error}</div>}
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required placeholder="Nova senha" className="w-full pl-10 pr-4 py-3 bg-white rounded-lg text-sm text-gray-800 outline-none focus:ring-2 focus:ring-[#ce0a53]/50" />
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required placeholder="Confirme a nova senha" className="w-full pl-10 pr-4 py-3 bg-white rounded-lg text-sm text-gray-800 outline-none focus:ring-2 focus:ring-[#ce0a53]/50" />
                </div>
                <button type="submit" disabled={loading} className="w-full bg-[#cc0d55] hover:bg-[#a60a44] text-white rounded-lg py-3 text-sm font-bold flex justify-center transition-all cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed">
                  {loading ? <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div> : "Atualizar Senha"}
                </button>
              </form>
            </>
          )}

          {}
          {view === 'success' && (
            <div className="text-center py-4">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-xl text-white font-bold mb-2">Tudo pronto!</h2>
              <p className="text-white text-sm mb-8 font-medium">Sua senha foi redefinida com sucesso. Agora você já pode entrar na sua conta.</p>
              <button onClick={() => setView('login')} className="w-full bg-[#cc0d55] hover:bg-[#a60a44] text-white rounded-lg py-3 text-sm font-bold shadow-lg shadow-[#cc0d55]/20 cursor-pointer">Fazer Login</button>
            </div>
          )}

          </div>
        </div>
      </div>

      <style>{`
        @keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-5px); } 75% { transform: translateX(5px); } }
        .animate-shake { animation: shake 0.3s ease-in-out; }
      `}</style>
    </div>
  );
}
