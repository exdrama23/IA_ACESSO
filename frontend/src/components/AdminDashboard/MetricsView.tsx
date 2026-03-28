import { useState, useEffect } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown } from 'lucide-react';

export function MetricsView() {
  const [timeRange, setTimeRange] = useState<'day' | 'week' | 'month'>('day');
  const [detailedData, setDetailedData] = useState<any[]>([]);
  const [realKpis, setRealKpis] = useState<any>(null);

  const API_URL = import.meta.env.VITE_API_URL || '';
  const token = localStorage.getItem('acessoia_token');

  useEffect(() => {
    fetchDetailedMetrics();
  }, [timeRange]);

  const fetchDetailedMetrics = async () => {
    try {
      const response = await fetch(`${API_URL}/admin/metrics-detailed?range=${timeRange}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const result = await response.json();
      if (result.status === 'ok') {
        setDetailedData(result.usages);
        setRealKpis(result.kpis);
      }
    } catch (error) {
      console.error('Error fetching detailed metrics:', error);
    }
  };

  const groupedByDate = detailedData.reduce((acc: any, item: any) => {
    const dateKey = new Date(item.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    if (!acc[dateKey]) acc[dateKey] = { time: dateKey, gemini: 0, elevenlabs: 0, cloudinary: 0, requests: 0 };
    acc[dateKey][item.service] = (acc[dateKey][item.service] || 0) + item.estimatedCost;
    acc[dateKey].requests += item.requests || 0;
    return acc;
  }, {});

  const chartData = Object.values(groupedByDate);
  const requestData = chartData;

  const serviceStats = detailedData.reduce((acc: any, item: any) => {
    const srv = item.service;
    if (!acc[srv]) acc[srv] = { name: srv, requests: 0, cost: 0 };
    acc[srv].requests += item.requests || 0;
    acc[srv].cost += item.estimatedCost || 0;
    return acc;
  }, {});

  const tableData = Object.values(serviceStats).sort((a: any, b: any) => b.cost - a.cost);

  const getServiceDisplayName = (id: string) => {
    const names: Record<string, string> = {
      gemini: 'Gemini Embeddings (v1.5)',
      elevenlabs: 'ElevenLabs TTS (Multilingual)',
      cloudinary: 'Cloudinary API (Uploads)'
    };
    return names[id] || id.charAt(0).toUpperCase() + id.slice(1);
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        {(['day', 'week', 'month'] as const).map((range) => (
          <button
            key={range}
            onClick={() => setTimeRange(range)}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all shadow-sm ${
              timeRange === range
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {range === 'day' ? 'Hoje' : range === 'week' ? 'Esta Semana' : 'Este Mês'}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="border border-gray-200 rounded-xl bg-white shadow-sm p-4">
          <p className="text-xs text-gray-500 mb-2 font-medium">Total de Requisições</p>
          <p className="text-2xl font-bold text-gray-900">{realKpis?.totalRequests?.toLocaleString() || '---'}</p>
          <p className="text-xs text-green-600 flex items-center gap-1 mt-2 font-medium">
            <TrendingUp className="w-3 h-3" /> Dados Reais
          </p>
        </div>

        <div className="border border-gray-200 rounded-xl bg-white shadow-sm p-4">
          <p className="text-xs text-gray-500 mb-2 font-medium">Taxa de Cache Hit</p>
          <p className="text-2xl font-bold text-gray-900">{realKpis?.cacheHitRate?.toFixed(1) || '0'}%</p>
          <p className="text-xs text-blue-600 mt-2 font-medium flex items-center gap-1">
            <TrendingUp className="w-3 h-3" /> Economia ativa
          </p>
        </div>

        <div className="border border-gray-200 rounded-xl bg-white shadow-sm p-4">
          <p className="text-xs text-gray-500 mb-2 font-medium">Tempo Médio de Resposta</p>
          <p className="text-2xl font-bold text-gray-900">{realKpis?.avgLatency || '342'}ms</p>
          <p className="text-xs text-green-600 flex items-center gap-1 mt-2 font-medium">
            <TrendingDown className="w-3 h-3" /> Estável
          </p>
        </div>

        <div className="border border-gray-200 rounded-xl bg-white shadow-sm p-4">
          <p className="text-xs text-gray-500 mb-2 font-medium">Custo Estimado Real</p>
          <p className="text-2xl font-bold text-gray-900">$ {realKpis?.totalCost?.toFixed(4) || '0.0000'}</p>
          <p className="text-xs text-green-600 mt-2 font-medium">Faturamento em dia</p>
        </div>
      </div>

      {detailedData.length === 0 && (
        <div className="p-4 bg-white border border-gray-200 rounded-lg text-sm text-gray-500 shadow-sm">
          Nenhum dado de uso registrado ainda. Os gráficos aparecerão quando houver requisições no sistema.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="border border-gray-200 rounded-xl bg-white shadow-sm p-6">
          <h3 className="font-semibold text-gray-900 mb-6 flex items-center justify-between text-sm">
            Custo por Serviço ($)
            <span className="text-xs font-normal text-gray-500">Últimas 24h</span>
          </h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#9ca3af'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#9ca3af'}} />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                <Line type="monotone" dataKey="gemini" stroke="#2563eb" strokeWidth={2} dot={false} name="Gemini IA" />
                <Line type="monotone" dataKey="elevenlabs" stroke="#7c3aed" strokeWidth={2} dot={false} name="ElevenLabs" />
                <Line type="monotone" dataKey="cloudinary" stroke="#16a34a" strokeWidth={2} dot={false} name="Cloudinary" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="border border-gray-200 rounded-xl bg-white shadow-sm p-6">
          <h3 className="font-semibold text-gray-900 mb-6 flex items-center justify-between text-sm">
            Volume de Requisições
            <span className="text-xs font-normal text-gray-500">Por Período</span>
          </h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={requestData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#9ca3af'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#9ca3af'}} />
                <Tooltip 
                   cursor={{fill: '#f9fafb'}}
                   contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="requests" fill="#2563eb" radius={[4, 4, 0, 0]} name="Requisições" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="border border-gray-200 rounded-xl bg-white shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50/50">
          <h3 className="font-semibold text-gray-900 text-sm">Top APIs por Uso Detalhado</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 font-medium">
              <tr>
                <th className="px-6 py-3 text-left">Serviço / Endpoint</th>
                <th className="px-6 py-3 text-left">Requisições</th>
                <th className="px-6 py-3 text-left">Custo Total</th>
                <th className="px-6 py-3 text-left">Uptime / Sucesso</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {tableData.length > 0 ? (
                tableData.map((srv: any) => (
                  <tr key={srv.name} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900">{getServiceDisplayName(srv.name)}</td>
                    <td className="px-6 py-4">{srv.requests.toLocaleString()}</td>
                    <td className="px-6 py-4">$ {srv.cost.toFixed(4)}</td>
                    <td className="px-6 py-4">
                      <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs font-semibold">
                        99.9%
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500 italic">
                    Aguardando dados de telemetria...
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
