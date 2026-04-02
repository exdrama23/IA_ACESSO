import { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, AreaChart, Area
} from 'recharts';
import { TrendingUp, Users, Zap, Clock, ChevronRight } from 'lucide-react';
import { API_URL } from '../../services/api';

export function MetricsView() {
  const [timeRange, setTimeRange] = useState('7d');
  const [detailedData, setDetailedData] = useState<any[]>([]);
  const [realKpis, setRealKpis] = useState<any>(null);
  const [recentLogs, setRecentLogs] = useState<any[]>([]);

  const token = localStorage.getItem('acessoia_token');

  const fetchDetailedMetrics = async () => {
    try {
      const response = await fetch(`${API_URL}/admin/metrics-detailed?range=${timeRange}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const result = await response.json();
      if (result.status === 'ok') {
        setDetailedData(result.usages);
        setRealKpis(result.kpis);
        setRecentLogs(result.recentLogs || []);
      }
    } catch (error) {
      console.error('Error fetching detailed metrics:', error);
    }
  };

  useEffect(() => {
    fetchDetailedMetrics();
    
    const interval = setInterval(() => {
      fetchDetailedMetrics();
    }, 300000); 

    return () => clearInterval(interval);
  }, [timeRange]);

  return (
    <div className="space-y-8 pb-10">
      
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Analytics em Tempo Real</h2>
          <p className="text-xs text-gray-500 mt-1">Dados de performance e custo atualizados a cada 5 min.</p>
        </div>
        
        <div className="flex bg-gray-100 p-1 rounded-xl border border-gray-200">
          {['24h', '7d', '30d'].map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                timeRange === range ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {range.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Usuários Ativos', value: realKpis?.activeUsers || 0, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Precisão da IA', value: `${(realKpis?.accuracy || 0).toFixed(1)}%`, icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Total de Requisições', value: realKpis?.totalRequests || 0, icon: Zap, color: 'text-yellow-600', bg: 'bg-yellow-50' },
          { label: 'Tempo de Resposta', value: `${realKpis?.avgResponseTime || 0}ms`, icon: Clock, color: 'text-purple-600', bg: 'bg-purple-50' },
        ].map((kpi, i) => (
          <div key={i} className="bg-white border border-gray-200 p-5 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className={`p-2 rounded-xl ${kpi.bg} ${kpi.color}`}>
                <kpi.icon className="w-5 h-5" />
              </div>
            </div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{kpi.label}</p>
            <p className="text-2xl font-black text-gray-900 mt-1">{kpi.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <h3 className="text-sm font-bold text-gray-900 mb-6 flex items-center justify-between">
            Volume de Requisições
            <span className="text-[10px] text-gray-400 font-normal uppercase tracking-tighter">Acumulado por Período</span>
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={detailedData}>
                <defs>
                  <linearGradient id="colorUsage" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8'}} />
                <Tooltip 
                  contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                />
                <Area type="monotone" dataKey="requests" stroke="#2563eb" strokeWidth={3} fillOpacity={1} fill="url(#colorUsage)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <h3 className="text-sm font-bold text-gray-900 mb-6 flex items-center justify-between">
            Distribuição de Custos (USD)
            <span className="text-[10px] text-gray-400 font-normal uppercase tracking-tighter">Projeção por Serviço</span>
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={detailedData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8'}} />
                <Tooltip 
                  contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                />
                <Bar dataKey="cost" fill="#7c3aed" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <h3 className="text-sm font-bold text-gray-900">Logs de Uso Recentes</h3>
          <button className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1 cursor-pointer">
            Exportar CSV <ChevronRight className="w-3 h-3" />
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {['Horário', 'Operação', 'Origem', 'Tokens', 'Custo', 'Status'].map((h) => (
                  <th key={h} className="px-6 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {recentLogs.length > 0 ? recentLogs.map((log, i) => (
                <tr key={i} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-xs text-gray-600 font-mono">
                    {new Date(log.createdAt).toLocaleDateString()} {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="px-6 py-4 text-xs font-bold text-gray-900 uppercase">{log.endpoint}</td>
                  <td className="px-6 py-4 text-xs text-gray-500">{log.method}</td>
                  <td className="px-6 py-4 text-xs text-gray-600">
                    {log.requestBody?.tokens || log.requestBody?.characters || '-'}
                  </td>
                  <td className="px-6 py-4 text-xs text-gray-900 font-bold">
                    ${log.responseBody?.cost?.toFixed(4) || '0.0000'}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded border ${
                      log.status < 400 ? 'bg-green-50 text-green-600 border-green-100' : 'bg-red-50 text-red-600 border-red-100'
                    }`}>
                      {log.status} {log.status === 200 ? 'OK' : 'ERR'}
                    </span>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-gray-400 italic text-xs">
                    Nenhum log de atividade recente encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
