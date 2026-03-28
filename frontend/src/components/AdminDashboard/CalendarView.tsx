import { useState, useEffect } from 'react';
import { Trash2 } from 'lucide-react';

const COLORS = [
  { name: 'Vermelho', value: '#dc2626' },
  { name: 'Azul', value: '#2563eb' },
  { name: 'Verde', value: '#16a34a' },
  { name: 'Roxo', value: '#7c3aed' },
  { name: 'Amarelo', value: '#eab308' },
  { name: 'Rosa', value: '#ec4899' },
];

export function CalendarView() {
  const [currentYear, setCurrentYear] = useState(2026);
  const [currentMonth, setCurrentMonth] = useState(2); 
  const [events, setEvents] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [formData, setFormData] = useState({ title: '', description: '', color: '#2563eb' });
  const [editingEvent, setEditingEvent] = useState<any>(null);

  const API_URL = import.meta.env.VITE_API_URL || '';
  const token = localStorage.getItem('acessoia_token');

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const response = await fetch(`${API_URL}/admin/calendar-events`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const result = await response.json();
      if (result.status === 'ok') {
        setEvents(result.events);
      }
    } catch (error) {
      console.error('Error fetching events:', error);
    }
  };

  const handleSave = async () => {
    if (!selectedDate && !editingEvent) return;
    
    try {
      const method = editingEvent ? 'PUT' : 'POST';
      const url = editingEvent 
        ? `${API_URL}/admin/calendar-events/${editingEvent.id}`
        : `${API_URL}/admin/calendar-events`;

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          date: editingEvent ? editingEvent.date : selectedDate?.toISOString(),
          ...formData
        })
      });
      
      if (response.ok) {
        await fetchEvents();
        setShowModal(false);
        setEditingEvent(null);
        setFormData({ title: '', description: '', color: '#2563eb' });
      }
    } catch (error) {
      console.error('Error saving event:', error);
    }
  };

  const handleEditClick = (event: any) => {
    setEditingEvent(event);
    setFormData({
      title: event.title,
      description: event.description || '',
      color: event.color
    });
    setShowModal(true);
  };

  const deleteEvent = async (id: string) => {
    try {
      const response = await fetch(`${API_URL}/admin/calendar-events/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        await fetchEvents();
      }
    } catch (error) {
      console.error('Error deleting event:', error);
    }
  };

  const daysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const firstDay = (year: number, month: number) => {
    const day = new Date(year, month, 1).getDay();
    return day;
  };

  const handleDayClick = (day: number) => {
    setSelectedDate(new Date(currentYear, currentMonth, day));
    setShowModal(true);
  };

  const monthName = new Date(currentYear, currentMonth).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  return (
    <div className="space-y-6">
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
          
          <h2 className="text-lg font-semibold text-gray-900 min-w-[200px] text-center capitalize">
            {monthName}
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
            className="w-24 px-3 py-1.5 border border-gray-300 rounded-md text-sm outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="border border-gray-200 rounded-xl bg-white shadow-sm overflow-hidden">
        <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-200">
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'].map((day) => (
            <div key={day} className="p-3 text-center font-semibold text-gray-700 text-sm">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {Array.from({ length: firstDay(currentYear, currentMonth) }).map((_, i) => (
            <div key={`empty-${i}`} className="p-4 bg-gray-50 h-24 border-b border-r border-gray-100"></div>
          ))}
          
          {Array.from({ length: daysInMonth(currentYear, currentMonth) }).map((_, i) => {
            const day = i + 1;
            const date = new Date(currentYear, currentMonth, day);
            const dateStr = date.toISOString().split('T')[0];
            const dayEvents = events.filter((e) => e.date.startsWith(dateStr));

            return (
              <div 
                key={day}
                onClick={() => handleDayClick(day)}
                className="p-3 min-h-24 border-b border-r border-gray-100 hover:bg-blue-50 cursor-pointer transition-colors"
              >
                <div className="font-semibold text-gray-900 mb-2">{day}</div>
                <div className="space-y-1">
                  {dayEvents.slice(0, 2).map((event, idx) => (
                    <div 
                      key={idx}
                      className="text-[10px] p-1 rounded truncate text-white font-medium"
                      style={{ backgroundColor: event.color }}
                    >
                      {event.title}
                    </div>
                  ))}
                  {dayEvents.length > 2 && (
                    <div className="text-[10px] text-gray-500">+{dayEvents.length - 2} mais</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              {editingEvent ? 'Editar Evento' : `Novo Evento - ${selectedDate?.toLocaleDateString('pt-BR')}`}
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
                <div className="flex gap-2 flex-wrap">
                  {COLORS.map((color) => (
                    <button
                      key={color.value}
                      onClick={() => setFormData({ ...formData, color: color.value })}
                      className={`w-8 h-8 rounded-full border-2 transition-all ${formData.color === color.value ? 'border-gray-900 scale-110 shadow-md' : 'border-transparent'}`}
                      style={{ backgroundColor: color.value }}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button 
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button 
                onClick={handleSave}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 shadow-sm"
              >
                {editingEvent ? 'Atualizar Evento' : 'Salvar Evento'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <h3 className="font-bold text-gray-900 sticky top-0 bg-white py-2">Próximos Eventos</h3>
        {events.length === 0 ? (
          <p className="text-sm text-gray-500 italic">Nenhum evento agendado.</p>
        ) : (
          events.slice(0, 5).map((event, idx) => (
            <div key={idx} className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1" onClick={() => handleEditClick(event)}>
                  <div className="flex items-center gap-2 mb-1 cursor-pointer">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: event.color }}></div>
                    <h4 className="font-semibold text-gray-900">{event.title}</h4>
                    <span className="text-xs text-gray-500">{new Date(event.date).toLocaleDateString('pt-BR')}</span>
                  </div>
                  <p className="text-sm text-gray-600">{event.description}</p>
                </div>
                <button 
                  onClick={() => deleteEvent(event.id)}
                  className="p-2 hover:bg-red-50 rounded-md transition-colors"
                >
                  <Trash2 className="w-4 h-4 text-red-400 hover:text-red-600" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
