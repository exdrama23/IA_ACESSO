# Guia Completo de Implementação - Dashboard AdminConfig

## 1. Visão Geral da Arquitetura

### Estrutura de Componentes

```
AdminConfig.tsx (Componente Principal)
├── Estado Global (activeTab, sidebarOpen)
├── Header (Navigation Icons)
├── Sidebar (Navigation + Profile)
├── Main Content Area
│   ├── Stats Pills (Métricas do dia)
│   ├── Tabs Navigation
│   └── Current Tab Content (dinâmico baseado em activeTab)
└── Right Sidebar (Integrações/Notas)
```

### Fluxo de Navegação

```
Click on Icon → Update activeTab State → Render corresponding component in <main>
                                              ↓
                                        (All components show Overview tab as default)
                                              ↓
                                        Switch between sub-tabs within component
```

---

## 2. Setup Inicial - Preparação do Arquivo

### Passo 1: Adicionar State Necessário

Adicione ao topo de `AdminConfig.tsx`:

```typescript
const [activeTab, setActiveTab] = useState<'overview' | 'historico' | 'config' | 'metricas'>('overview');
const [sidebarOpen, setSidebarOpen] = useState(true);
const [activeView, setActiveView] = useState<'dashboard' | 'user' | 'calendar' | 'metrics' | 'integrations' | 'database' | 'notifications' | 'help'>('dashboard');
```

### Passo 2: Estrutura do Main Content

Remova o conteúdo fixo current `<main>` e substitua por renderização condicional:

```typescript
<main className="flex-1 p-8 overflow-y-auto">
  {/* Stats Pills - SEMPRE VISÍVEL */}
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
    {/* código dos stats pills */}
  </div>

  {/* Tabs Navigation - SEMPRE VISÍVEL */}
  <div className="flex gap-6 mb-6 text-sm border-b border-gray-200">
    {/* código das abas */}
  </div>

  {/* Conteúdo Dinâmico baseado em activeView */}
  {activeView === 'dashboard' && <DashboardOverview config={config} metrics={metrics} history={history} />}
  {activeView === 'user' && <UserProfileView />}
  {activeView === 'calendar' && <CalendarView />}
  {activeView === 'metrics' && <MetricsView metrics={metrics} />}
  {activeView === 'integrations' && <IntegrationsView />}
  {activeView === 'database' && <DatabaseVisualizerView />}
  {activeView === 'notifications' && <NotificationsView />}
  {activeView === 'help' && <HelpDocumentationView />}
</main>
```

---

## 3. Componentes a Implementar

### Arquivo: `src/components/AdminDashboard/DashboardOverview.tsx`

**Função:** Tela principal com configuração do motor semântico

```typescript
export function DashboardOverview({ config, metrics, history }: any) {
  const [strategy, setStrategy] = useState(config.embedding.strategy);
  const [saving, setSaving] = useState(false);

  // O código já existe em AdminConfig.tsx - extrair para este componente
  // Inclui: Strategy Card, History Timeline
}
```

---

### Arquivo: `src/components/AdminDashboard/UserProfileView.tsx`

**Ícone:** User  
**Estado:** Novo componente

**Funcionalidades:**
1. Buscar dados do usuário autenticado via `/admin/user-profile` (endpoint a criar)
2. Exibir:
   - Avatar (letra inicial ou foto)
   - Nome completo
   - Email
   - Cargo/Role
   - Data de criação da conta
   - Número de configurações feitas
   - Última atividade
   - Nível de permissão

**Estrutura HTML:**

```typescript
<div className="space-y-6">
  {/* Card de Perfil Principal */}
  <div className="border border-gray-200 rounded-xl bg-white shadow-sm p-8 max-w-2xl">
    <div className="flex gap-6 items-start">
      {/* Avatar Grande */}
      <div className="flex items-center justify-center w-24 h-24 bg-blue-600 rounded-full text-white text-3xl font-bold">
        {user.name[0].toUpperCase()}
      </div>

      {/* Info Básica */}
      <div className="flex-1">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">{user.name}</h1>
        <p className="text-gray-500 mb-4">{user.role}</p>
        
        <div className="space-y-2 text-sm">
          <p><span className="text-gray-500">Email:</span> {user.email}</p>
          <p><span className="text-gray-500">Membro desde:</span> {new Date(user.createdAt).toLocaleDateString('pt-BR')}</p>
          <p><span className="text-gray-500">Nível de Acesso:</span> <span className="bg-green-100 text-green-700 px-2 py-1 rounded">Administrador</span></p>
        </div>
      </div>
    </div>
  </div>

  {/* Estatísticas de Atividade */}
  <div className="grid grid-cols-3 gap-4">
    <div className="border border-gray-200 rounded-xl bg-white shadow-sm p-4">
      <p className="text-xs text-gray-500 mb-1">Configurações Feitas</p>
      <p className="text-2xl font-bold text-gray-900">{user.configCount}</p>
    </div>
    <div className="border border-gray-200 rounded-xl bg-white shadow-sm p-4">
      <p className="text-xs text-gray-500 mb-1">Última Atividade</p>
      <p className="text-xs text-gray-700">{formatDistanceToNow(user.lastActivity, { locale: ptBR, addSuffix: true })}</p>
    </div>
    <div className="border border-gray-200 rounded-xl bg-white shadow-sm p-4">
      <p className="text-xs text-gray-500 mb-1">Status</p>
      <p className="text-xs"><span className="w-2 h-2 bg-green-500 rounded-full inline-block mr-1"></span>Online</p>
    </div>
  </div>

  {/* Botões de Ação */}
  <div className="flex gap-3">
    <button className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">
      Editar Perfil
    </button>
    <button className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">
      Mudar Senha
    </button>
  </div>
</div>
```

**Endpoint Backend Necessário:**
```typescript
// backend/src/controllers/admin.ts

export async function getUserProfile(req: Request, res: Response) {
  try {
    const userId = (req as any).user?.id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      }
    });

    // Contar configurações feitas
    const configCount = await redis.get(`admin:${userId}:config-count`) || 0;

    res.json({
      status: 'ok',
      user: {
        ...user,
        configCount,
        lastActivity: user.updatedAt
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao obter perfil' });
  }
}
```

**Rota a Adicionar em `backend/src/app.ts`:**
```typescript
app.get("/admin/user-profile", verifyToken, requireAdmin, getUserProfile);
```

---

### Arquivo: `src/components/AdminDashboard/CalendarView.tsx`

**Ícone:** Calendar  
**Estado:** Novo componente

**Funcionalidades:**
1. Calendário interativo (2026-2031)
2. Criar eventos com:
   - Data inicial
   - Descrição/Título
   - Cor customizável (6 opções)
3. Salvar em PostgreSQL via endpoint
4. Recuperar eventos salvos ao montar

**Dependências:**
```json
{
  "react-big-calendar": "^1.8.0",
  "date-fns": "^2.30.0"
}
```

**Estrutura:**

```typescript
import { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Plus, Trash2, Edit2 } from 'lucide-react';

const COLORS = [
  { name: 'Vermelho', value: '#dc2626', bg: 'bg-red-100', text: 'text-red-700' },
  { name: 'Azul', value: '#2563eb', bg: 'bg-blue-100', text: 'text-blue-700' },
  { name: 'Verde', value: '#16a34a', bg: 'bg-green-100', text: 'text-green-700' },
  { name: 'Roxo', value: '#7c3aed', bg: 'bg-purple-100', text: 'text-purple-700' },
  { name: 'Amarelo', value: '#eab308', bg: 'bg-yellow-100', text: 'text-yellow-700' },
  { name: 'Rosa', value: '#ec4899', bg: 'bg-pink-100', text: 'text-pink-700' },
];

export function CalendarView() {
  const [currentYear, setCurrentYear] = useState(2026);
  const [currentMonth, setCurrentMonth] = useState(0);
  const [events, setEvents] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [formData, setFormData] = useState({ title: '', description: '', color: '#2563eb' });

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    const response = await fetch(`${API_URL}/admin/calendar-events`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const result = await response.json();
    if (result.status === 'ok') {
      setEvents(result.events);
    }
  };

  const saveEvent = async () => {
    const response = await fetch(`${API_URL}/admin/calendar-events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        date: selectedDate,
        ...formData
      })
    });
    
    if (response.ok) {
      await fetchEvents();
      setShowModal(false);
      setFormData({ title: '', description: '', color: '#2563eb' });
    }
  };

  const daysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const firstDay = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  const handleDayClick = (day: number) => {
    setSelectedDate(new Date(currentYear, currentMonth, day));
    setShowModal(true);
  };

  return (
    <div className="space-y-6">
      {/* Header com Navegação */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => {
              if (currentMonth === 0) {
                setCurrentMonth(11);
                setCurrentYear(currentYear - 1);
              } else {
                setCurrentMonth(currentMonth - 1);
              }
            }}
            className="px-3 py-1.5 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Anterior
          </button>
          
          <h2 className="text-lg font-semibold text-gray-900 min-w-[200px] text-center">
            {new Date(currentYear, currentMonth).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).charAt(0).toUpperCase() + new Date(currentYear, currentMonth).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).slice(1)}
          </h2>

          <button 
            onClick={() => {
              if (currentMonth === 11) {
                setCurrentMonth(0);
                setCurrentYear(currentYear + 1);
              } else {
                setCurrentMonth(currentMonth + 1);
              }
            }}
            className="px-3 py-1.5 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Próximo
          </button>
        </div>

        <div className="flex items-center gap-2">
          <input 
            type="number" 
            value={currentYear}
            onChange={(e) => setCurrentYear(parseInt(e.target.value))}
            min="2026"
            max="2031"
            className="w-20 px-2 py-1.5 border border-gray-300 rounded-md text-sm"
          />
        </div>
      </div>

      {/* Grid do Calendário */}
      <div className="border border-gray-200 rounded-xl bg-white shadow-sm overflow-hidden">
        {/* Dias da Semana */}
        <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-200">
          {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab', 'Dom'].map((day) => (
            <div key={day} className="p-3 text-center font-semibold text-gray-700 text-sm">
              {day}
            </div>
          ))}
        </div>

        {/* Dias do Mês */}
        <div className="grid grid-cols-7">
          {Array.from({ length: firstDay(currentYear, currentMonth) }).map((_, i) => (
            <div key={`empty-${i}`} className="p-4 bg-gray-50 h-24"></div>
          ))}
          
          {Array.from({ length: daysInMonth(currentYear, currentMonth) }).map((_, i) => {
            const day = i + 1;
            const dateStr = new Date(currentYear, currentMonth, day).toISOString().split('T')[0];
            const dayEvents = events.filter((e) => e.date.startsWith(dateStr));

            return (
              <div 
                key={day}
                onClick={() => handleDayClick(day)}
                className="p-3 min-h-24 border border-gray-100 hover:bg-blue-50 cursor-pointer"
              >
                <div className="font-semibold text-gray-900 mb-2">{day}</div>
                <div className="space-y-1">
                  {dayEvents.slice(0, 2).map((event, idx) => (
                    <div 
                      key={idx}
                      className={`text-xs p-1 rounded truncate text-white`}
                      style={{ backgroundColor: event.color }}
                    >
                      {event.title}
                    </div>
                  ))}
                  {dayEvents.length > 2 && (
                    <div className="text-xs text-gray-500">+{dayEvents.length - 2} mais</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal de Novo Evento */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Novo Evento - {selectedDate?.toLocaleDateString('pt-BR')}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Título do Evento</label>
                <input 
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Ex: Reunião importante"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                <textarea 
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Detalhes adicionais"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Cor</label>
                <div className="flex gap-2">
                  {COLORS.map((color) => (
                    <button
                      key={color.value}
                      onClick={() => setFormData({ ...formData, color: color.value })}
                      className={`w-8 h-8 rounded-full border-2 ${formData.color === color.value ? 'border-gray-900' : 'border-gray-300'}`}
                      style={{ backgroundColor: color.value }}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button 
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button 
                onClick={saveEvent}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                Salvar Evento
              </button>
            </div>
          </div>
        </div>
      )}

      {/* List de Eventos */}
      <div className="space-y-2">
        <h3 className="font-semibold text-gray-900">Próximos Eventos</h3>
        {events.slice(0, 5).map((event, idx) => (
          <div key={idx} className="border border-gray-200 rounded-lg p-4 bg-white">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: event.color }}></div>
                  <h4 className="font-medium text-gray-900">{event.title}</h4>
                  <span className="text-xs text-gray-500">{new Date(event.date).toLocaleDateString('pt-BR')}</span>
                </div>
                <p className="text-sm text-gray-600">{event.description}</p>
              </div>
              <button className="p-1 hover:bg-gray-100 rounded">
                <Trash2 className="w-4 h-4 text-gray-400" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

**Schema Prisma a Adicionar:**
```prisma
model CalendarEvent {
  id        String    @id @default(cuid())
  adminId   String
  admin     User      @relation(fields: [adminId], references: [id], onDelete: Cascade)
  date      DateTime
  title     String
  description String?
  color     String    // Hex color code
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt

  @@index([adminId, date])
}
```

**Endpoints Backend:**
```typescript
// GET /admin/calendar-events
export async function getCalendarEvents(req: Request, res: Response) {
  const adminId = (req as any).user?.id;
  const events = await prisma.calendarEvent.findMany({
    where: { adminId },
    orderBy: { date: 'asc' }
  });
  res.json({ status: 'ok', events });
}

// POST /admin/calendar-events
export async function createCalendarEvent(req: Request, res: Response) {
  const adminId = (req as any).user?.id;
  const { date, title, description, color } = req.body;
  
  const event = await prisma.calendarEvent.create({
    data: { adminId, date: new Date(date), title, description, color }
  });

  res.json({ status: 'ok', event });
}

// DELETE /admin/calendar-events/:id
export async function deleteCalendarEvent(req: Request, res: Response) {
  await prisma.calendarEvent.delete({ where: { id: req.params.id } });
  res.json({ status: 'ok' });
}
```

---

### Arquivo: `src/components/AdminDashboard/MetricsView.tsx`

**Ícone:** BarChart2  
**Estado:** Novo componente

**Funcionalidades:**
1. Gráficos de métricas (gastos, requisições, performance)
2. Tabelas com dados numéricos
3. Filtros por data

**Dependências:**
```json
{
  "recharts": "^2.10.0"
}
```

**Estrutura:**

```typescript
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown } from 'lucide-react';

export function MetricsView({ metrics }: any) {
  const [timeRange, setTimeRange] = useState<'day' | 'week' | 'month'>('day');

  // Dados simulados - em produção viriam da API
  const chartData = [
    { time: '00:00', gemini: 2.50, elevenlabs: 1.20, cloudinary: 0.30 },
    { time: '06:00', gemini: 3.80, elevenlabs: 1.90, cloudinary: 0.45 },
    { time: '12:00', gemini: 5.20, elevenlabs: 2.40, cloudinary: 0.60 },
    { time: '18:00', gemini: 4.10, elevenlabs: 2.10, cloudinary: 0.50 },
  ];

  return (
    <div className="space-y-6">
      {/* Filtro de Período */}
      <div className="flex gap-2">
        {(['day', 'week', 'month'] as const).map((range) => (
          <button
            key={range}
            onClick={() => setTimeRange(range)}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              timeRange === range
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {range === 'day' ? 'Hoje' : range === 'week' ? 'Esta Semana' : 'Este Mês'}
          </button>
        ))}
      </div>

      {/* Cards de KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="border border-gray-200 rounded-xl bg-white shadow-sm p-4">
          <p className="text-xs text-gray-500 mb-2">Total de Requisições</p>
          <p className="text-2xl font-bold text-gray-900">12,543</p>
          <p className="text-xs text-green-600 flex items-center gap-1 mt-2">
            <TrendingUp className="w-3 h-3" /> +12% vs período anterior
          </p>
        </div>

        <div className="border border-gray-200 rounded-xl bg-white shadow-sm p-4">
          <p className="text-xs text-gray-500 mb-2">Taxa de Cache Hit</p>
          <p className="text-2xl font-bold text-gray-900">68%</p>
          <p className="text-xs text-blue-600 mt-2">Economia de custo</p>
        </div>

        <div className="border border-gray-200 rounded-xl bg-white shadow-sm p-4">
          <p className="text-xs text-gray-500 mb-2">Tempo Médio de Resposta</p>
          <p className="text-2xl font-bold text-gray-900">342ms</p>
          <p className="text-xs text-green-600 flex items-center gap-1 mt-2">
            <TrendingDown className="w-3 h-3" /> -5% vs período anterior
          </p>
        </div>

        <div className="border border-gray-200 rounded-xl bg-white shadow-sm p-4">
          <p className="text-xs text-gray-500 mb-2">Taxa de Erro</p>
          <p className="text-2xl font-bold text-gray-900">0.12%</p>
          <p className="text-xs text-green-600 mt-2">Sistema estável</p>
        </div>
      </div>

      {/* Gráfico de Custo */}
      <div className="border border-gray-200 rounded-xl bg-white shadow-sm p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Custo por Serviço (Últimas 24h)</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="gemini" stroke="#2563eb" name="Gemini IA" />
            <Line type="monotone" dataKey="elevenlabs" stroke="#7c3aed" name="ElevenLabs" />
            <Line type="monotone" dataKey="cloudinary" stroke="#16a34a" name="Cloudinary" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Gráfico de Requisições */}
      <div className="border border-gray-200 rounded-xl bg-white shadow-sm p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Volume de Requisições por Hora</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="gemini" fill="#2563eb" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Tabela de Detalhes */}
      <div className="border border-gray-200 rounded-xl bg-white shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900">Top APIs por Uso</h3>
        </div>
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">API</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Requisições</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Custo</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Taxa de Sucesso</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-gray-200 hover:bg-gray-50">
              <td className="px-6 py-3 text-sm text-gray-900">Gemini Embeddings</td>
              <td className="px-6 py-3 text-sm text-gray-900">8,234</td>
              <td className="px-6 py-3 text-sm text-gray-900">$12.35</td>
              <td className="px-6 py-3 text-sm"><span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs">99.8%</span></td>
            </tr>
            {/* Mais linhas */}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

---

### Arquivo: `src/components/AdminDashboard/IntegrationsView.tsx`

**Ícone:** Zap  
**Estado:** Novo componente

**Funcionalidades:**
1. Gerenciar chaves de API (Gemini, ElevenLabs, etc)
2. Visualizar fallbacks ativos
3. Adicionar/remover fallbacks
4. Mudar voice code ElevenLabs
5. Status de cada serviço

**Estrutura:**

```typescript
import { Eye, EyeOff, Plus, Trash2, Copy, Check } from 'lucide-react';
import { useState } from 'react';

const VOICE_OPTIONS = [
  { id: '1', name: 'Rachel', code: '21m00Tp-uaZD02t8APy2' },
  { id: '2', name: 'Clyde', code: '2EiwWnXFnvU5JabPnv94' },
  { id: '3', name: 'Benjamin', code: 'TxGEqnHWrfWFTfGW9XjX' },
  { id: '4', name: 'Domi', code: 'AZnzlk1uvNAVhTVWOt5d' },
];

export function IntegrationsView() {
  const [apis, setApis] = useState({
    gemini: { key: '', visible: false, status: 'ok' },
    elevenlabs: { key: '', visible: false, status: 'ok', voiceId: '1' },
    cloudinary: { key: '', visible: false, status: 'ok' },
  });

  const [fallbacks, setFallbacks] = useState([
    { service: 'TTS', primary: 'ElevenLabs', fallback: 'Google Translate', status: 'ready' },
  ]);

  const [newFallback, setNewFallback] = useState({ service: '', primary: '', fallback: '' });
  const [copied, setCopied] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      {/* Gerenciador de APIs */}
      <div className="border border-gray-200 rounded-xl bg-white shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900">Chaves de API</h3>
        </div>

        <div className="divide-y divide-gray-200">
          {/* Gemini */}
          <div className="p-6">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h4 className="font-medium text-gray-900">Google Gemini</h4>
                <p className="text-xs text-gray-500 mt-1">API para embeddings e processamento semântico</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  apis.gemini.status === 'ok' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}>
                  {apis.gemini.status === 'ok' ? 'Conectado' : 'Erro'}
                </span>
              </div>
            </div>

            <div className="flex gap-2">
              <div className="flex-1 relative">
                <input 
                  type={apis.gemini.visible ? 'text' : 'password'}
                  placeholder="Insira sua chave de API"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  defaultValue={apis.gemini.key}
                />
              </div>
              <button 
                onClick={() => setApis({ ...apis, gemini: { ...apis.gemini, visible: !apis.gemini.visible } })}
                className="px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                {apis.gemini.visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
              <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium">
                Salvar
              </button>
            </div>
          </div>

          {/* ElevenLabs */}
          <div className="p-6">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h4 className="font-medium text-gray-900">ElevenLabs TTS</h4>
                <p className="text-xs text-gray-500 mt-1">Síntese de voz com qualidade profissional</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-700">
                  Conectado
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <input 
                    type={apis.elevenlabs.visible ? 'text' : 'password'}
                    placeholder="Insira sua chave de API"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  />
                </div>
                <button 
                  onClick={() => setApis({ ...apis, elevenlabs: { ...apis.elevenlabs, visible: !apis.elevenlabs.visible } })}
                  className="px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  {apis.elevenlabs.visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Voice Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Voz Padrão</label>
                <select 
                  value={apis.elevenlabs.voiceId}
                  onChange={(e) => setApis({ ...apis, elevenlabs: { ...apis.elevenlabs, voiceId: e.target.value } })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                >
                  {VOICE_OPTIONS.map((voice) => (
                    <option key={voice.id} value={voice.id}>{voice.name}</option>
                  ))}
                </select>
              </div>

              <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium">
                Salvar
              </button>
            </div>
          </div>

          {/* Cloudinary */}
          <div className="p-6">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h4 className="font-medium text-gray-900">Cloudinary</h4>
                <p className="text-xs text-gray-500 mt-1">Armazenamento e entrega de áudio</p>
              </div>
              <span className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-700">
                Conectado
              </span>
            </div>

            <div className="flex gap-2">
              <div className="flex-1 relative">
                <input 
                  type={apis.cloudinary.visible ? 'text' : 'password'}
                  placeholder="URL de Configuração"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </div>
              <button 
                onClick={() => setApis({ ...apis, cloudinary: { ...apis.cloudinary, visible: !apis.cloudinary.visible } })}
                className="px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                {apis.cloudinary.visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
              <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium">
                Salvar
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Fallback Configuration */}
      <div className="border border-gray-200 rounded-xl bg-white shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900">Configuração de Fallbacks</h3>
        </div>

        <div className="p-6 space-y-4">
          {fallbacks.map((fallback, idx) => (
            <div key={idx} className="border border-gray-200 rounded-lg p-4 flex items-center justify-between">
              <div className="flex-1">
                <p className="font-medium text-gray-900">{fallback.service}</p>
                <p className="text-sm text-gray-600">{fallback.primary} (Principal) → {fallback.fallback} (Fallback)</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-700">
                  Pronto
                </span>
                <button className="p-1 hover:bg-gray-100 rounded">
                  <Trash2 className="w-4 h-4 text-gray-400" />
                </button>
              </div>
            </div>
          ))}

          {/* Adicionar novo fallback */}
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 mt-4">
            <div className="grid grid-cols-3 gap-3 mb-3">
              <input 
                type="text"
                placeholder="Tipo de Serviço (ex: TTS)"
                value={newFallback.service}
                onChange={(e) => setNewFallback({ ...newFallback, service: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
              <input 
                type="text"
                placeholder="Principal"
                value={newFallback.primary}
                onChange={(e) => setNewFallback({ ...newFallback, primary: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
              <input 
                type="text"
                placeholder="Fallback"
                value={newFallback.fallback}
                onChange={(e) => setNewFallback({ ...newFallback, fallback: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>
            <button className="w-full px-4 py-2 border border-gray-300 rounded-md text-blue-600 hover:bg-blue-50 text-sm font-medium flex items-center justify-center gap-2">
              <Plus className="w-4 h-4" /> Adicionar Fallback
            </button>
          </div>
        </div>
      </div>

      {/* Status de Serviços */}
      <div className="border border-gray-200 rounded-xl bg-white shadow-sm p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Status de Serviços</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
            <div>
              <p className="font-medium text-green-900">Google Gemini API</p>
              <p className="text-xs text-green-700">Respondendo normalmente</p>
            </div>
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          </div>
          <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
            <div>
              <p className="font-medium text-green-900">ElevenLabs TTS</p>
              <p className="text-xs text-green-700">99.98% uptime</p>
            </div>
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          </div>
          <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
            <div>
              <p className="font-medium text-green-900">Cloudinary CDN</p>
              <p className="text-xs text-green-700">Todos os servidores operacionais</p>
            </div>
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

**Endpoint Backend:**
```typescript
// POST /admin/api-keys
export async function updateApiKeys(req: Request, res: Response) {
  const { gemini, elevenlabs, cloudinary } = req.body;
  // Validar e criptografar antes de salvar no Redis
  // Usar process.env para valores sensíveis em produção
  res.json({ status: 'ok' });
}
```

---

### Arquivo: `src/components/AdminDashboard/DatabaseVisualizerView.tsx`

**Ícone:** Database  
**Estado:** Novo componente

**Funcionalidades:**
1. Visualizar estrutura do banco de dados (tabelas e campos)
2. Mostrar relacionamentos
3. Botão para voltar ao overview
4. Estatísticas de cada tabela

**Estrutura:**

```typescript
import { Database as DatabaseIcon, ArrowRight } from 'lucide-react';

const DATABASE_SCHEMA = [
  {
    name: 'users',
    icon: DatabaseIcon,
    fields: [
      { name: 'id', type: 'String', isPrimary: true },
      { name: 'email', type: 'String', isUnique: true },
      { name: 'name', type: 'String' },
      { name: 'password', type: 'String' },
      { name: 'role', type: 'String' },
      { name: 'createdAt', type: 'DateTime' },
      { name: 'updatedAt', type: 'DateTime' },
    ],
    recordCount: 45,
    relationsTo: ['calendarEvents', 'sessions']
  },
  {
    name: 'messages',
    icon: DatabaseIcon,
    fields: [
      { name: 'id', type: 'String', isPrimary: true },
      { name: 'content', type: 'String' },
      { name: 'audioUrl', type: 'String' },
      { name: 'audioHash', type: 'String' },
      { name: 'createdAt', type: 'DateTime' },
    ],
    recordCount: 12340,
    relationsTo: ['sessions']
  },
  {
    name: 'calendarEvents',
    icon: DatabaseIcon,
    fields: [
      { name: 'id', type: 'String', isPrimary: true },
      { name: 'adminId', type: 'String', isForeignKey: true },
      { name: 'date', type: 'DateTime' },
      { name: 'title', type: 'String' },
      { name: 'description', type: 'String' },
      { name: 'color', type: 'String' },
      { name: 'createdAt', type: 'DateTime' },
    ],
    recordCount: 127,
    relationsTo: ['users']
  },
];

export function DatabaseVisualizerView() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <DatabaseIcon className="w-5 h-5" /> Estrutura do Banco de Dados
        </h2>
      </div>

      {/* Grid de Tabelas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {DATABASE_SCHEMA.map((table) => (
          <div key={table.name} className="border border-gray-200 rounded-xl bg-white shadow-sm overflow-hidden">
            {/* Header da Tabela */}
            <div className="p-4 bg-blue-50 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <DatabaseIcon className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{table.name}</h3>
                  <p className="text-xs text-gray-500">{table.recordCount} registros</p>
                </div>
              </div>
            </div>

            {/* Lista de Campos */}
            <div className="divide-y divide-gray-200">
              {table.fields.map((field) => (
                <div key={field.name} className="px-4 py-3 flex items-center justify-between hover:bg-gray-50">
                  <div className="flex items-center gap-3">
                    <code className="text-sm font-mono text-gray-900">{field.name}</code>
                    {field.isPrimary && <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-[10px] font-bold rounded">PK</span>}
                    {field.isForeignKey && <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-[10px] font-bold rounded">FK</span>}
                    {field.isUnique && <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold rounded">UNIQUE</span>}
                  </div>
                  <code className="text-xs text-gray-500 font-mono">{field.type}</code>
                </div>
              ))}
            </div>

            {/* Relações */}
            {table.relationsTo.length > 0 && (
              <div className="p-4 bg-gray-50 border-t border-gray-200">
                <p className="text-xs font-semibold text-gray-700 mb-2">Relacionamentos:</p>
                <div className="space-y-1">
                  {table.relationsTo.map((rel) => (
                    <div key={rel} className="flex items-center gap-2 text-xs text-gray-600">
                      <ArrowRight className="w-3 h-3" />
                      <code className="font-mono">{rel}</code>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Diagrama de Relações (Opcional) */}
      <div className="border border-gray-200 rounded-xl bg-white shadow-sm p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Mapa de Relacionamentos</h3>
        <div className="bg-gray-50 p-6 rounded-lg overflow-x-auto">
          <div className="inline-flex gap-8 items-center whitespace-nowrap">
            <div className="text-center">
              <div className="bg-blue-100 border-2 border-blue-600 rounded-lg px-4 py-2 font-medium text-gray-900">users</div>
            </div>
            <div className="text-gray-400">1</div>
            <div className="border-2 border-gray-400 flex-1 h-0 min-w-[40px]"></div>
            <div className="text-gray-400">N</div>
            <div className="text-center">
              <div className="bg-blue-100 border-2 border-blue-600 rounded-lg px-4 py-2 font-medium text-gray-900">calendarEvents</div>
            </div>
          </div>
        </div>
      </div>

      {/* Estatísticas Globais */}
      <div className="grid grid-cols-3 gap-4">
        <div className="border border-gray-200 rounded-xl bg-white shadow-sm p-4">
          <p className="text-xs text-gray-500 mb-1">Total de Tabelas</p>
          <p className="text-2xl font-bold text-gray-900">{DATABASE_SCHEMA.length}</p>
        </div>
        <div className="border border-gray-200 rounded-xl bg-white shadow-sm p-4">
          <p className="text-xs text-gray-500 mb-1">Total de Registros</p>
          <p className="text-2xl font-bold text-gray-900">{DATABASE_SCHEMA.reduce((sum, t) => sum + t.recordCount, 0).toLocaleString()}</p>
        </div>
        <div className="border border-gray-200 rounded-xl bg-white shadow-sm p-4">
          <p className="text-xs text-gray-500 mb-1">Banco de Dados</p>
          <p className="text-2xl font-bold text-gray-900">PostgreSQL</p>
        </div>
      </div>
    </div>
  );
}
```

---

### Arquivo: `src/components/AdminDashboard/NotificationsView.tsx`

**Ícone:** Bell  
**Estado:** Novo componente

**Funcionalidades:**
1. Mostrar notificações de erros/alertas
2. Filtrar por tipo
3. Marcar como lida
4. Histórico de notificações

**Estrutura:**

```typescript
import { AlertCircle, CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';
import { useState } from 'react';

const NOTIFICATION_TYPES = {
  error: { icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' },
  warning: { icon: AlertTriangle, color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-200' },
  success: { icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' },
  info: { icon: Info, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
};

export function NotificationsView() {
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      type: 'error',
      title: 'Falha na API Gemini',
      message: 'A conexão com Google Gemini foi perdida por 15 segundos. Sistema acionou fallback.',
      timestamp: new Date(Date.now() - 300000),
      read: false
    },
    {
      id: 2,
      type: 'warning',
      title: 'Cache próximo do limite',
      message: 'Cache está em 95% de utilização. Considere executar limpeza manual.',
      timestamp: new Date(Date.now() - 600000),
      read: false
    },
    {
      id: 3,
      type: 'success',
      title: 'Backup concluído',
      message: 'Backup automático do banco de dados foi executado com sucesso.',
      timestamp: new Date(Date.now() - 3600000),
      read: true
    },
  ]);

  const [filter, setFilter] = useState<'all' | 'error' | 'warning' | 'success' | 'info'>('all');

  const filtered = filter === 'all' ? notifications : notifications.filter(n => n.type === filter);
  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = (id: number) => {
    setNotifications(notifications.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const dismiss = (id: number) => {
    setNotifications(notifications.filter(n => n.id !== id));
  };

  return (
    <div className="space-y-6">
      {/* Header com Contador */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Notificações</h2>
          {unreadCount > 0 && (
            <p className="text-sm text-gray-500">{unreadCount} novaseads</p>
          )}
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 flex-wrap">
        {(['all', 'error', 'warning', 'success', 'info'] as const).map((type) => (
          <button
            key={type}
            onClick={() => setFilter(type)}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              filter === type
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {type === 'all' ? 'Todas' : type === 'error' ? 'Erros' : type === 'warning' ? 'Avisos' : type === 'success' ? 'Sucesso' : 'Info'}
          </button>
        ))}
      </div>

      {/* Lista de Notificações */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Nenhuma notificação</p>
          </div>
        ) : (
          filtered.map((notif) => {
            const TypeIcon = NOTIFICATION_TYPES[notif.type].icon;
            return (
              <div
                key={notif.id}
                className={`border rounded-lg p-4 flex items-start gap-4 ${NOTIFICATION_TYPES[notif.type].bg} ${NOTIFICATION_TYPES[notif.type].border} transition-opacity ${notif.read ? 'opacity-60' : ''}`}
              >
                <TypeIcon className={`w-5 h-5 ${NOTIFICATION_TYPES[notif.type].color} shrink-0 mt-0.5`} />
                
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-gray-900">{notif.title}</h4>
                  <p className="text-sm text-gray-700 mt-1">{notif.message}</p>
                  <p className="text-xs text-gray-500 mt-2">
                    {formatDistanceToNow(notif.timestamp, { locale: ptBR, addSuffix: true })}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {!notif.read && (
                    <button
                      onClick={() => markAsRead(notif.id)}
                      className="px-2 py-1 text-xs font-medium rounded bg-white hover:bg-gray-200 text-gray-700 border border-gray-300"
                    >
                      Ler
                    </button>
                  )}
                  <button
                    onClick={() => dismiss(notif.id)}
                    className="p-1 hover:bg-gray-300 rounded"
                  >
                    <X className="w-4 h-4 text-gray-500" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Configurações de Notificação */}
      <div className="border border-gray-200 rounded-xl bg-white shadow-sm p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Preferências de Notificação</h3>
        <div className="space-y-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" defaultChecked className="w-4 h-4 rounded border-gray-300" />
            <span className="text-sm text-gray-700">Notificar sobre erros de API</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" defaultChecked className="w-4 h-4 rounded border-gray-300" />
            <span className="text-sm text-gray-700">Notificar sobre avisos de performance</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" className="w-4 h-4 rounded border-gray-300" />
            <span className="text-sm text-gray-700">Notificar sobre backups completados</span>
          </label>
        </div>
      </div>
    </div>
  );
}
```

---

### Arquivo: `src/components/AdminDashboard/HelpDocumentationView.tsx`

**Ícone:** HelpCircle  
**Estado:** Novo componente

**Funcionalidades:**
1. Documentação completa da dashboard
2. Guias de uso
3. FAQ
4. Links para recursos

**Estrutura:**

```typescript
import { BookOpen, HelpCircle, Code, BarChart3, Database as DatabaseIcon } from 'lucide-react';
import { useState } from 'react';

export function HelpDocumentationView() {
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const sections = [
    {
      id: 'overview',
      title: 'Overview - Dashboard Principal',
      icon: BarChart3,
      content: `
        A tela Overview é o centro de controle da plataforma ACESSO.NET:
        
        - Stats Pills: Mostra custo em tempo real dos serviços (Gemini, ElevenLabs, Cloudinary)
        - Strategy Card: Permite alternar entre estratégias de embedding (TF-IDF, Gemini, Híbrido)
        - Timeline: Histórico de todas as mudanças de configuração feitas
        
        Todas as alterações são registradas e versionadas automaticamente.
      `
    },
    {
      id: 'user-profile',
      title: 'Perfil do Usuário (User)',
      icon: User,
      content: `
        Acesse suas informações de perfil e gerenciamento de conta:
        
        - Ver nome, email e cargo
        - Data de criação da conta
        - Número de configurações realizadas
        - Última atividade no sistema
        - Editar dados do perfil
        - Alterar senha de acesso
        
        Todas as mudanças de perfil são salvas automaticamente no banco de dados.
      `
    },
    {
      id: 'calendar',
      title: 'Calendário de Eventos (Calendar)',
      icon: Calendar,
      content: `
        Gerencie eventos e marcos importantes com calendário customizável:
        
        - Navegue entre 2026 e 2031
        - Adicione eventos com data, descrição e cor
        - Escolha entre 6 cores diferentes para melhor visualização
        - Ver próximos eventos na lista
        - Deletar eventos quando necessário
        
        Todos os eventos ficam salvos no PostgreSQL e sincronizados em tempo real.
      `
    },
    {
      id: 'metrics',
      title: 'Métricas e Gráficos (BarChart2)',
      icon: BarChart3,
      content: `
        Visualize a performance e custos em tempo real:
        
        - Gráficos de custo por serviço (últimas 24 horas)
        - Volume de requisições
        - Taxa de cache hit (economia de custo)
        - Tempo médio de resposta
        - Taxa de erro do sistema
        - Tabela com top APIs por uso
        
        Dados são atualizados a cada minuto automaticamente.
      `
    },
    {
      id: 'integrations',
      title: 'Integrações e APIs (Zap)',
      icon: Zap,
      content: `
        Gerencie credenciais de API e configurações de fallback:
        
        - Adicionar/alterar chaves de API (Gemini, ElevenLabs, Cloudinary)
        - Visualizar status de cada serviço
        - Configurar fallbacks (ex: ElevenLabs → Google TTS)
        - Escolher voz padrão ElevenLabs (6 opções disponíveis)
        - Ver status de uptime de cada serviço
        
        Chaves são criptografadas e nunca aparecem em logs.
      `
    },
    {
      id: 'database',
      title: 'Estrutura do Banco de Dados (Database)',
      icon: DatabaseIcon,
      content: `
        Visualize a estrutura completa do banco PostgreSQL:
        
        - Ver todas as tabelas e seus campos
        - Identificar chaves primárias (PK) e chaves estrangeiras (FK)
        - Ver campos unique e relacionamentos
        - Número de registros por tabela
        - Diagrama de relacionamentos
        
        Somente leitura - não permite edições diretas.
      `
    },
  ];

  const faqs = [
    {
      q: 'Como alterar a estratégia de embedding?',
      a: 'Vá para Overview, encontre o card "Configuração do Motor Semântico", selecione a nova estratégia no dropdown e clique "Salvar Alteração".'
    },
    {
      q: 'Onde vejo meus gastos totais?',
      a: 'Os gastos são mostrados em tempo real nos Stats Pills no topo de cada página. Clique em "Métricas" para ver gráficos detalhados.'
    },
    {
      q: 'Como adicionar um novo fallback?',
      a: 'Vá para a seção "Integrações" (ícone Zap), role até "Configuração de Fallbacks" e preencha os campos do novo fallback.'
    },
    {
      q: 'Os eventos do calendário são sincronizados?',
      a: 'Sim, todos os eventos são salvos no PostgreSQL e sincronizados em tempo real entre múltiplos usuários.'
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <BookOpen className="w-5 h-5" /> Documentação Completa
        </h2>
        <p className="text-gray-600 mt-2">Guias detalhados sobre como usar cada seção da dashboard</p>
      </div>

      {/* Seções Expansíveis */}
      <div className="space-y-3">
        {sections.map((section) => {
          const Icon = section.icon;
          const isExpanded = expandedSection === section.id;

          return (
            <div key={section.id} className="border border-gray-200 rounded-lg bg-white overflow-hidden">
              <button
                onClick={() => setExpandedSection(isExpanded ? null : section.id)}
                className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-5 h-5 text-blue-600" />
                  <h3 className="font-semibold text-gray-900 text-left">{section.title}</h3>
                </div>
                <div className={`text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                </div>
              </button>

              {isExpanded && (
                <div className="px-5 py-4 bg-gray-50 border-t border-gray-200 text-sm text-gray-700 whitespace-pre-line">
                  {section.content}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* FAQ Section */}
      <div className="border border-gray-200 rounded-xl bg-white shadow-sm p-6">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <HelpCircle className="w-5 h-5" /> Perguntas Frequentes
        </h3>

        <div className="space-y-4">
          {faqs.map((faq, idx) => (
            <div key={idx} className="pb-4 border-b border-gray-200 last:border-0">
              <p className="font-medium text-gray-900 mb-2">{faq.q}</p>
              <p className="text-sm text-gray-600">{faq.a}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Recursos Externos */}
      <div className="border border-gray-200 rounded-xl bg-white shadow-sm p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Recursos Úteis</h3>
        <div className="space-y-3">
          <a href="#" className="block p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <p className="font-medium text-blue-600">Documentação Técnica da API</p>
            <p className="text-xs text-gray-500 mt-1">Referência completa de endpoints e parâmetros</p>
          </a>
          <a href="#" className="block p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <p className="font-medium text-blue-600">Guia de Integração com Gemini</p>
            <p className="text-xs text-gray-500 mt-1">Como integrar a IA Google na sua aplicação</p>
          </a>
          <a href="#" className="block p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <p className="font-medium text-blue-600">Suporte e Contato</p>
            <p className="text-xs text-gray-500 mt-1">Entre em contato com o time de suporte</p>
          </a>
        </div>
      </div>
    </div>
  );
}
```

---

## 4. Modificações no AdminConfig.tsx

### Passo 1: Adicionar Imports

```typescript
import { useState, useEffect } from 'react';
import { 
  Search, Plus, Bell, HelpCircle, LayoutDashboard, User, 
  Calendar, BarChart2, Menu, Zap, Database, Settings, LogOut, 
  ExternalLink, RefreshCw, ChevronDown
} from 'lucide-react';

// Importar componentes
import { DashboardOverview } from '../AdminDashboard/DashboardOverview';
import { UserProfileView } from '../AdminDashboard/UserProfileView';
import { CalendarView } from '../AdminDashboard/CalendarView';
import { MetricsView } from '../AdminDashboard/MetricsView';
import { IntegrationsView } from '../AdminDashboard/IntegrationsView';
import { DatabaseVisualizerView } from '../AdminDashboard/DatabaseVisualizerView';
import { NotificationsView } from '../AdminDashboard/NotificationsView';
import { HelpDocumentationView } from '../AdminDashboard/HelpDocumentationView';
```

### Passo 2: Adicionar State

No início da função `AdminConfig()`:

```typescript
const [activeView, setActiveView] = useState<'dashboard' | 'user' | 'calendar' | 'metrics' | 'integrations' | 'database' | 'notifications' | 'help'>('dashboard');
const [sidebarOpen, setSidebarOpen] = useState(true);
const [activeTab, setActiveTab] = useState<'overview' | 'historico' | 'config' | 'metricas'>('overview');
```

### Passo 3: Atualizar Header Icons

```typescript
<div className="flex items-center gap-4 text-gray-500">
  <button 
    onClick={() => setSidebarOpen(!sidebarOpen)}
    className="p-1.5 hover:bg-gray-100 rounded-md transition-colors"
  >
    <LayoutDashboard className="w-5 h-5 text-gray-700" />
  </button>
  <button 
    onClick={() => setActiveView('user')}
    className={`p-1.5 hover:bg-gray-100 rounded-md transition-colors ${activeView === 'user' ? 'bg-blue-50' : ''}`}
  >
    <User className="w-5 h-5" />
  </button>
  <button 
    onClick={() => setActiveView('calendar')}
    className={`p-1.5 hover:bg-gray-100 rounded-md transition-colors ${activeView === 'calendar' ? 'bg-blue-50' : ''}`}
  >
    <Calendar className="w-5 h-5" />
  </button>
  <button 
    onClick={() => setActiveView('metrics')}
    className={`p-1.5 hover:bg-gray-100 rounded-md transition-colors ${activeView === 'metrics' ? 'bg-blue-50' : ''}`}
  >
    <BarChart2 className="w-5 h-5" />
  </button>
  <button 
    onClick={() => setActiveView('integrations')}
    className={`p-1.5 hover:bg-gray-100 rounded-md transition-colors ${activeView === 'integrations' ? 'bg-blue-50' : ''}`}
  >
    <Zap className="w-5 h-5" />
  </button>
</div>

{/* Right Icons */}
<div className="flex items-center gap-1 text-gray-500 border-l border-gray-200 pl-3">
  <button 
    onClick={() => setActiveView('database')}
    className={`p-1.5 hover:bg-gray-100 rounded-full transition-colors ${activeView === 'database' ? 'bg-blue-50' : ''}`}
  >
    <Database className="w-4 h-4" />
  </button>
  <button 
    onClick={() => setActiveView('notifications')}
    className={`p-1.5 hover:bg-gray-100 rounded-full transition-colors ${activeView === 'notifications' ? 'bg-blue-50' : ''}`}
  >
    <Bell className="w-4 h-4" />
  </button>
  <button 
    onClick={() => setActiveView('help')}
    className={`p-1.5 hover:bg-gray-100 rounded-full transition-colors ${activeView === 'help' ? 'bg-blue-50' : ''}`}
  >
    <HelpCircle className="w-4 h-4" />
  </button>
</div>
```

### Passo 4: Atualizar Sidebar (Condicional)

```typescript
{sidebarOpen && (
  <aside className="w-64 p-6 overflow-y-auto border-r border-gray-200 shrink-0">
    {/* Conteúdo original preservado */}
  </aside>
)}
```

### Passo 5: Replace Main Content

```typescript
<main className="flex-1 p-8 overflow-y-auto">
  {/* STATS PILLS - sempre visível */}
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
    {/* Código original preservado */}
  </div>

  {/* TABS - sempre visível */}
  <div className="flex gap-6 mb-6 text-sm border-b border-gray-200">
    <button 
      onClick={() => setActiveTab('overview')}
      className={`pb-3 font-medium border-b-2 transition-colors ${
        activeTab === 'overview' ? 'text-blue-600 border-blue-600' : 'text-gray-500 border-transparent hover:text-gray-700'
      }`}
    >
      Overview
    </button>
    <button 
      onClick={() => setActiveTab('historico')}
      className={`pb-3 font-medium border-b-2 transition-colors ${
        activeTab === 'historico' ? 'text-blue-600 border-blue-600' : 'text-gray-500 border-transparent hover:text-gray-700'
      }`}
    >
      Histórico
    </button>
    <button 
      onClick={() => setActiveTab('config')}
      className={`pb-3 font-medium border-b-2 transition-colors flex items-center gap-1 ${
        activeTab === 'config' ? 'text-blue-600 border-blue-600' : 'text-gray-500 border-transparent hover:text-gray-700'
      }`}
    >
      Configurações
      <span className="bg-gray-100 text-gray-600 py-0.5 px-1.5 rounded-full text-[10px]">1</span>
    </button>
    <button 
      onClick={() => setActiveTab('metricas')}
      className={`pb-3 font-medium border-b-2 transition-colors flex items-center gap-1 ${
        activeTab === 'metricas' ? 'text-blue-600 border-blue-600' : 'text-gray-500 border-transparent hover:text-gray-700'
      }`}
    >
      Métricas
      <span className="bg-gray-100 text-gray-600 py-0.5 px-1.5 rounded-full text-[10px]">3</span>
    </button>
  </div>

  {/* CONTEÚDO DINÂMICO */}
  {activeView === 'dashboard' && <DashboardOverview config={config} metrics={metrics} history={history} />}
  {activeView === 'user' && <UserProfileView />}
  {activeView === 'calendar' && <CalendarView />}
  {activeView === 'metrics' && <MetricsView metrics={metrics} />}
  {activeView === 'integrations' && <IntegrationsView />}
  {activeView === 'database' && <DatabaseVisualizerView />}
  {activeView === 'notifications' && <NotificationsView />}
  {activeView === 'help' && <HelpDocumentationView />}
</main>
```

---

## 5. Endpoints Backend a Criar

### `backend/src/controllers/admin.ts` - Adicionar

```typescript
// GET /admin/user-profile
// GET /admin/calendar-events
// POST /admin/calendar-events
// DELETE /admin/calendar-events/:id
// GET /admin/metrics-detailed
// POST /admin/api-keys
// GET /admin/notifications
// PATCH /admin/notifications/:id/read
```

### `backend/src/app.ts` - Adicionar Rotas

```typescript
app.get("/admin/user-profile", verifyToken, requireAdmin, getUserProfile);
app.get("/admin/calendar-events", verifyToken, requireAdmin, getCalendarEvents);
app.post("/admin/calendar-events", verifyToken, requireAdmin, createCalendarEvent);
app.delete("/admin/calendar-events/:id", verifyToken, requireAdmin, deleteCalendarEvent);
```

---

## 6. Estrutura de Pastas Recomendada

```
src/
├── components/
│   └── AdminDashboard/
│       ├── DashboardOverview.tsx
│       ├── UserProfileView.tsx
│       ├── CalendarView.tsx
│       ├── MetricsView.tsx
│       ├── IntegrationsView.tsx
│       ├── DatabaseVisualizerView.tsx
│       ├── NotificationsView.tsx
│       └── HelpDocumentationView.tsx
└── pages/
    └── AdminConfig.tsx
```

---

## 7. Checklist de Implementação

- [ ] Criar arquivo `src/components/AdminDashboard/DashboardOverview.tsx`
- [ ] Criar arquivo `src/components/AdminDashboard/UserProfileView.tsx`
- [ ] Criar arquivo `src/components/AdminDashboard/CalendarView.tsx`
- [ ] Criar arquivo `src/components/AdminDashboard/MetricsView.tsx`
- [ ] Criar arquivo `src/components/AdminDashboard/IntegrationsView.tsx`
- [ ] Criar arquivo `src/components/AdminDashboard/DatabaseVisualizerView.tsx`
- [ ] Criar arquivo `src/components/AdminDashboard/NotificationsView.tsx`
- [ ] Criar arquivo `src/components/AdminDashboard/HelpDocumentationView.tsx`
- [ ] Atualizar `src/pages/AdminConfig.tsx` com novo estado e lógica
- [ ] Adicionar schema Prisma para `CalendarEvent`
- [ ] Implementar endpoints backend para calendar, user-profile, etc
- [ ] Instalar dependências: `recharts`, `react-big-calendar`, `date-fns`
- [ ] Testar navegação entre todas as views
- [ ] Validar sincronização de dados em tempo real
- [ ] Testar responsividade em mobile

---

## 8. Notas de Implementação

1. **Estado Compartilhado**: Use context ou prop drilling para passar `activeView` e funções de mudança
2. **API URL**: Garanta que `VITE_API_URL` está configurado em `.env`
3. **Autenticação**: Todos os endpoints requerem `verifyToken` e `requireAdmin`
4. **Dados em Tempo Real**: Use `useEffect` com polling ou WebSockets para dados críticos
5. **Error Handling**: Implemente try-catch e feedback visual ao usuário
6. **Performance**: Lazy load componentes pesados (gráficos) quando visíveis

