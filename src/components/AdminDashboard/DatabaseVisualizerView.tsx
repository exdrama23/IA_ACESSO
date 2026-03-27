import { useState, useEffect, useCallback } from 'react';
import { 
  Search, RefreshCw, ChevronLeft, ChevronRight, LayoutPanelLeft, 
  Grid, Layers, Table2, ChevronsUpDown, Filter, Columns,
  Database
} from 'lucide-react';

export function DatabaseVisualizerView() {
  const [tables, setTables] = useState<string[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>('ChatHistory');
  const [tableData, setTableData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0
  });

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
  const token = localStorage.getItem('acessoia_token');

  const fetchTables = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/admin/database/tables`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await response.json();
      if (result.status === 'ok') {
        setTables(result.tables);
        if (result.tables.length > 0 && !result.tables.includes(selectedTable)) {
          setSelectedTable(result.tables[0]);
        }
      }
    } catch (err) {
      console.error('Erro ao buscar tabelas:', err);
    }
  }, [API_URL, token, selectedTable]);

  const fetchTableData = useCallback(async (tableName: string, page: number = 1) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/admin/database/tables/${tableName}?page=${page}&limit=${pagination.limit}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await response.json();
      if (result.status === 'ok') {
        setTableData(result.data);
        setPagination(result.pagination);
      }
    } catch (err) {
      console.error(`Erro ao buscar dados da tabela ${tableName}:`, err);
    } finally {
      setLoading(false);
    }
  }, [API_URL, token, pagination.limit]);

  useEffect(() => {
    fetchTables();
  }, [fetchTables]);

  useEffect(() => {
    if (selectedTable) {
      fetchTableData(selectedTable, 1);
    }
  }, [selectedTable, fetchTableData]);

  const columns = tableData.length > 0 ? Object.keys(tableData[0]) : [];

  const filteredTables = tables.filter(t => t.toLowerCase().includes(searchTerm.toLowerCase()));

  const handleRefresh = () => {
    fetchTableData(selectedTable, pagination.page);
  };

  const handlePrevPage = () => {
    if (pagination.page > 1) {
      fetchTableData(selectedTable, pagination.page - 1);
    }
  };

  const handleNextPage = () => {
    if (pagination.page < pagination.totalPages) {
      fetchTableData(selectedTable, pagination.page + 1);
    }
  };

  return (
    <div className="flex h-[calc(100vh-140px)] bg-white font-sans text-[13px] text-gray-800 antialiased overflow-hidden border border-gray-200 rounded-2xl shadow-sm">

      <aside className="w-[220px] flex-shrink-0 border-r border-gray-100 flex flex-col bg-gray-50/30">
        <div className="p-4 border-b border-gray-100 bg-white">
          <h1 className="font-black text-xs uppercase tracking-widest text-gray-400 mb-3">Database Explorer</h1>
          <div className="flex items-center text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-md border border-blue-100 inline-flex">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mr-2 animate-pulse"></span>
            NEON_PROD
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          <div className="relative mb-4">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input 
              type="text" 
              placeholder="Filtrar tabelas..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-white border border-gray-200 rounded-lg outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10 transition-all text-xs"
            />
          </div>

          <ul className="space-y-1">
            {filteredTables.map((table) => (
              <li key={table}>
                <button 
                  onClick={() => setSelectedTable(table)}
                  className={`flex items-center gap-2 w-full px-3 py-2 rounded-lg text-left transition-all group ${
                    table === selectedTable 
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-100 font-bold' 
                      : 'hover:bg-white hover:shadow-sm text-gray-500 font-medium'
                  }`}
                >
                  <Table2 className={`w-3.5 h-3.5 ${table === selectedTable ? 'text-blue-100' : 'text-gray-400 group-hover:text-blue-500'}`} />
                  <span className="truncate">{table}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 bg-white">

        <div className="flex items-center justify-between p-3 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="flex border border-gray-100 rounded-lg p-0.5 bg-gray-50/50">
              <button className="p-1.5 hover:bg-white hover:shadow-sm rounded-md text-gray-400 transition-all"><LayoutPanelLeft className="w-4 h-4" /></button>
              <button className="p-1.5 bg-white shadow-sm rounded-md text-blue-600"><Grid className="w-4 h-4" /></button>
              <button className="p-1.5 hover:bg-white hover:shadow-sm rounded-md text-gray-400 transition-all"><Layers className="w-4 h-4" /></button>
            </div>

            <div className="h-6 w-px bg-gray-100 mx-2"></div>

            <button className="flex items-center gap-2 px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 font-bold text-gray-600 transition-all text-xs">
              <Filter className="w-3.5 h-3.5 text-gray-400" /> Filtros
            </button>
            
            <button className="flex items-center gap-2 px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 font-bold text-gray-600 transition-all text-xs">
              <Columns className="w-3.5 h-3.5 text-gray-400" /> Colunas
            </button>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-[11px] font-bold text-gray-400 uppercase tracking-widest">
              {loading ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-500" />
              ) : (
                <>
                  <span className="text-gray-900">{pagination.total}</span> registros
                  <span className="mx-1">•</span>
                  <span>Pág {pagination.page} de {pagination.totalPages}</span>
                </>
              )}
            </div>

            <div className="flex items-center border border-gray-100 rounded-lg bg-gray-50/50 overflow-hidden">
              <button 
                onClick={handlePrevPage}
                disabled={pagination.page <= 1 || loading}
                className="p-1.5 hover:bg-white disabled:opacity-30 text-gray-500 transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="w-px h-4 bg-gray-200"></div>
              <button 
                onClick={handleNextPage}
                disabled={pagination.page >= pagination.totalPages || loading}
                className="p-1.5 hover:bg-white disabled:opacity-30 text-gray-500 transition-all"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <button 
              onClick={handleRefresh}
              className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-500 transition-all"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto bg-gray-50/10">
          {loading && tableData.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-3">
              <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
              <p className="font-bold uppercase tracking-widest text-[10px]">Carregando dados da tabela...</p>
            </div>
          ) : tableData.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <Database className="w-12 h-12 mb-4 opacity-10" />
              <p className="font-bold uppercase tracking-widest text-[10px]">Nenhum dado encontrado nesta tabela</p>
            </div>
          ) : (
            <table className="w-full text-left border-separate border-spacing-0">
              <thead className="sticky top-0 bg-white z-10">
                <tr>
                  <th className="w-10 px-4 py-3 border-b border-r border-gray-100 bg-gray-50/50">
                    <input type="checkbox" className="rounded-md border-gray-300 text-blue-600 focus:ring-blue-500" />
                  </th>
                  {columns.map((col) => (
                    <th key={col} className="px-4 py-3 border-b border-r border-gray-100 font-black text-[10px] uppercase tracking-widest text-gray-400 bg-gray-50/50 group hover:bg-gray-100 cursor-pointer transition-colors">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <span className="text-gray-900">{col}</span>
                        </span>
                        <ChevronsUpDown className="w-3 h-3 opacity-0 group-hover:opacity-100 text-gray-400" />
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              
              <tbody className="bg-white">
                {tableData.map((row, index) => (
                  <tr key={row.id || index} className="group hover:bg-blue-50/30 transition-colors">
                    <td className="px-4 py-2.5 border-b border-r border-gray-50 text-center">
                      <input type="checkbox" className="rounded-md border-gray-300 text-blue-600 focus:ring-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </td>
                    {columns.map((col) => {
                      const val = row[col];
                      let displayVal = val;
                      
                      if (val === null) displayVal = <span className="text-gray-300 italic">null</span>;
                      else if (typeof val === 'object') displayVal = <span className="text-blue-400 font-mono text-[10px]">JSON</span>;
                      else if (typeof val === 'boolean') displayVal = val ? '✅' : '❌';
                      else if (col.toLowerCase().includes('date') || col.toLowerCase().includes('at')) {
                        displayVal = new Date(val).toLocaleString();
                      }

                      return (
                        <td key={col} className="px-4 py-2.5 border-b border-r border-gray-50 truncate max-w-[200px] font-medium text-gray-600 group-hover:text-gray-900 transition-colors">
                          {displayVal}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

      </main>
    </div>
  );
}
