import React, { useState, useEffect, useReducer, createContext, useContext } from 'react';
import { 
  MapPin, Navigation, Car, Bike, Wallet, User, Shield, 
  Settings, CheckCircle, XCircle, Clock, Menu, X, 
  ChevronRight, DollarSign, AlertTriangle, Play,
  Plus, Search, LogOut, Activity, Bell, Send,
  MessageSquare, PlusCircle, Check, Share2, Trash2, FileText
} from 'lucide-react';

// --- DATABASE & STATE MANAGEMENT (SIMULATED BACKEND) ---

const generateId = () => Math.random().toString(36).substr(2, 9);
const generatePin = () => Math.floor(1000 + Math.random() * 9000).toString();

const initialData = {
  users: [
    { id: 'admin1', role: 'admin', name: 'Super Admin', email: 'admin@app.com', password: '123', status: 'active', balance: 0 },
    { id: 'p1', role: 'passenger', name: 'Juan Pasajero', email: 'juan@app.com', password: '123', status: 'active', balance: 50 },
    { id: 'p2', role: 'passenger', name: 'Maria Morosa', email: 'maria@app.com', password: '123', status: 'active', balance: -150 }, 
    { id: 'd1', role: 'driver', name: 'Carlos Conductor', email: 'carlos@app.com', password: '123', status: 'available', balance: 200, vehicle: 'Toyota Yaris 2022' },
  ],
  services: [
    { id: 's1', name: 'Auto Básico', type: 'ride', baseRate: 20, kmRate: 10, minRate: 2, image: 'car', active: true, commission: 0.20 },
    { id: 's2', name: 'Auto VIP', type: 'ride', baseRate: 50, kmRate: 15, minRate: 3, image: 'car', active: true, commission: 0.25 },
    { id: 's3', name: 'Moto Express', type: 'ride', baseRate: 15, kmRate: 7, minRate: 1, image: 'bike', active: true, commission: 0.15 },
  ],
  trips: [],
  transactions: [],
  notifications: [
    { id: 'n1', target: 'all', title: '¡Bienvenido a Drive MX!', message: 'Gracias por formar parte de nuestra comunidad. Mantén tu app actualizada para disfrutar de nuevas funciones.', date: new Date() }
  ],
  supportTickets: [],
  settings: {
    walletLegend: "Recuerda mantener saldo positivo en tu cartera para poder seguir solicitando nuestros servicios o recibir viajes.",
    whatsappLink: "https://wa.me/521234567890",
    referralActive: false
  }
};

const appReducer = (state, action) => {
  switch (action.type) {
    case 'LOGIN':
      const user = state.users.find(u => u.email === action.payload.email && u.password === action.payload.password);
      return { ...state, currentUser: user || null, loginError: !user };
    case 'LOGOUT':
      return { ...state, currentUser: null };
    case 'REGISTER':
      const newUser = { ...action.payload, id: generateId(), status: 'active', balance: 0 };
      return { ...state, users: [...state.users, newUser], currentUser: newUser };
    case 'REQUEST_TRIP':
      const newTrip = { ...action.payload, id: generateId(), status: 'searching', pin: generatePin(), createdAt: new Date() };
      return { ...state, trips: [...state.trips, newTrip] };
    case 'ACCEPT_TRIP':
      return {
        ...state,
        trips: state.trips.map(t => t.id === action.payload.tripId ? { ...t, status: 'accepted', driverId: action.payload.driverId } : t),
        users: state.users.map(u => u.id === action.payload.driverId ? { ...u, status: 'busy' } : u)
      };
    case 'START_TRIP':
      return {
        ...state,
        trips: state.trips.map(t => t.id === action.payload ? { ...t, status: 'in_progress' } : t)
      };
    case 'COMPLETE_TRIP':
      const trip = state.trips.find(t => t.id === action.payload.tripId);
      const service = state.services.find(s => s.id === trip.serviceId);
      const commissionAmount = trip.price * service.commission;
      const driverEarn = trip.price - commissionAmount;

      let newTransactions = [...state.transactions];

      const updatedUsers = state.users.map(u => {
        if (u.id === trip.passengerId) {
          if (trip.paymentMethod === 'wallet') {
            newTransactions.push({ id: generateId(), userId: u.id, type: 'payment', amount: -trip.price, date: new Date(), desc: `Viaje ${trip.id} (Cartera)` });
            return { ...u, balance: u.balance - trip.price };
          }
          // Si es efectivo/transferencia, el saldo app del pasajero no cambia.
          return u;
        }
        if (u.id === trip.driverId) {
          if (trip.paymentMethod === 'wallet') {
             // El conductor recibe el pago digital menos la comisión
             newTransactions.push({ id: generateId(), userId: u.id, type: 'earning', amount: driverEarn, date: new Date(), desc: `Viaje ${trip.id} (Ganancia Cartera)` });
             return { ...u, status: 'available', balance: u.balance + driverEarn };
          } else {
             // El conductor recibió el dinero físico/transferencia. Solo le descontamos la comisión de su cartera app.
             newTransactions.push({ id: generateId(), userId: u.id, type: 'payment', amount: -commissionAmount, date: new Date(), desc: `Comisión Viaje ${trip.id} (${trip.paymentMethod === 'cash' ? 'Efectivo' : 'Transferencia'})` });
             return { ...u, status: 'available', balance: u.balance - commissionAmount };
          }
        }
        return u;
      });

      return {
        ...state,
        trips: state.trips.map(t => t.id === action.payload.tripId ? { ...t, status: 'completed' } : t),
        users: updatedUsers,
        transactions: newTransactions
      };
    case 'UPDATE_BALANCE':
      return {
        ...state,
        users: state.users.map(u => u.id === action.payload.userId ? { ...u, balance: u.balance + action.payload.amount } : u),
        transactions: [
          ...state.transactions,
          { id: generateId(), userId: action.payload.userId, type: 'manual', amount: action.payload.amount, date: new Date(), desc: 'Ajuste Admin' }
        ]
      };
    case 'CHANGE_STATUS':
      return {
        ...state,
        users: state.users.map(u => u.id === action.payload.userId ? { ...u, status: action.payload.status } : u)
      };
    case 'UPDATE_SETTINGS':
      return { ...state, settings: { ...state.settings, ...action.payload } };
    case 'SEND_NOTIFICATION':
      return {
        ...state,
        notifications: [{ ...action.payload, id: generateId(), date: new Date() }, ...state.notifications]
      };
    case 'CREATE_TICKET':
      return {
        ...state,
        supportTickets: [{ id: generateId(), userId: action.payload.userId, status: 'open', date: new Date(), messages: [{ senderId: action.payload.userId, text: action.payload.text, date: new Date() }] }, ...state.supportTickets]
      };
    case 'ADD_TICKET_MESSAGE':
      return {
        ...state,
        supportTickets: state.supportTickets.map(t => t.id === action.payload.ticketId ? { ...t, messages: [...t.messages, { senderId: action.payload.senderId, text: action.payload.text, date: new Date() }] } : t)
      };
    case 'RESOLVE_TICKET':
      return {
        ...state,
        supportTickets: state.supportTickets.map(t => t.id === action.payload ? { ...t, status: 'resolved' } : t)
      };
    case 'DELETE_ACCOUNT':
      return {
        ...state,
        users: state.users.filter(u => u.id !== action.payload),
        currentUser: null
      };
    case 'APPLY_REFERRAL_REWARD':
      const targetUser = state.users.find(u => u.id === action.payload);
      if (targetUser?.hasReferred) return state; // Evitar que abusen del sistema de referidos
      return {
        ...state,
        users: state.users.map(u => u.id === action.payload ? { ...u, balance: u.balance + 10, hasReferred: true } : u),
        transactions: [
          ...state.transactions,
          { id: generateId(), userId: action.payload, type: 'earning', amount: 10, date: new Date(), desc: 'Bono Recomiéndanos' }
        ]
      };
    default:
      return state;
  }
};

const AppContext = createContext();

// --- UI COMPONENTS ---

const Button = ({ children, onClick, variant = 'primary', className = '', disabled = false }) => {
  const baseStyle = "w-full py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2";
  const variants = {
    primary: "bg-red-600 text-white hover:bg-red-700 shadow-md",
    secondary: "bg-gray-100 text-gray-800 hover:bg-gray-200",
    outline: "border-2 border-red-600 text-red-600 hover:bg-red-50",
    danger: "bg-red-100 text-red-600 hover:bg-red-200"
  };
  return (
    <button 
      onClick={onClick} 
      disabled={disabled}
      className={`${baseStyle} ${variants[variant]} ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
    >
      {children}
    </button>
  );
};

const Input = ({ label, type = 'text', value, onChange, placeholder, icon: Icon }) => (
  <div className="mb-4">
    {label && <label className="block text-sm font-semibold text-gray-700 mb-1">{label}</label>}
    <div className="relative">
      {Icon && <Icon className="absolute left-3 top-3.5 text-gray-400 w-5 h-5" />}
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={`w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all ${Icon ? 'pl-10' : ''}`}
      />
    </div>
  </div>
);

// --- SHARED SCREENS (WALLET & NOTIFICATIONS) ---

const WalletScreen = ({ user, transactions, onBack, isBlocked }) => (
  <div className="min-h-screen bg-gray-50 max-w-md mx-auto w-full z-40 absolute inset-0">
    <div className="bg-red-600 p-6 text-white rounded-b-3xl">
      <div className="flex justify-between items-center mb-6">
        <button onClick={onBack}><X className="w-6 h-6" /></button>
        <h2 className="font-bold">Billetera</h2>
        <div className="w-6"></div>
      </div>
      <p className="text-red-100 text-sm font-medium">Saldo Disponible</p>
      <h1 className="text-5xl font-black mt-1">${user.balance.toFixed(2)}</h1>
      {isBlocked && (
        <div className="mt-4 bg-red-700 p-3 rounded-lg flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-yellow-300" />
          <span className="text-sm font-medium">Cuenta bloqueada por saldo negativo.</span>
        </div>
      )}
    </div>
    
    <div className="p-6">
      <h3 className="font-bold text-gray-900 mb-4">Movimientos</h3>
      <div className="space-y-3">
        {transactions.filter(t => t.userId === user.id).reverse().map(t => (
          <div key={t.id} className="bg-white p-4 rounded-xl flex justify-between items-center shadow-sm">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${t.amount < 0 ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                <DollarSign className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold text-sm">{t.desc}</p>
                <p className="text-xs text-gray-400">{new Date(t.date).toLocaleDateString()}</p>
              </div>
            </div>
            <span className={`font-black ${t.amount < 0 ? 'text-red-600' : 'text-green-600'}`}>
              {t.amount > 0 ? '+' : ''}{t.amount.toFixed(2)}
            </span>
          </div>
        ))}
        {transactions.filter(t => t.userId === user.id).length === 0 && (
          <p className="text-center text-gray-500 mt-10">No hay movimientos recientes.</p>
        )}
      </div>
    </div>
  </div>
);

const NotificationsScreen = ({ user, notifications, onBack }) => {
  const userNotifs = notifications.filter(n => n.target === 'all' || n.target === user.role || n.target === user.id);
  return (
    <div className="min-h-screen bg-gray-50 max-w-md mx-auto w-full z-40 absolute inset-0 flex flex-col">
      <div className="bg-white p-4 border-b border-gray-100 flex items-center gap-4 sticky top-0 shadow-sm z-10">
        <button onClick={onBack} className="p-2 bg-gray-50 rounded-full"><ChevronRight className="w-5 h-5 rotate-180 text-gray-600" /></button>
        <h2 className="text-xl font-black text-gray-900">Notificaciones</h2>
      </div>
      <div className="p-4 flex-1 overflow-y-auto space-y-3">
        {userNotifs.length > 0 ? userNotifs.map(n => (
          <div key={n.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex gap-4">
            <div className="w-10 h-10 bg-red-50 rounded-full flex items-center justify-center flex-shrink-0">
              <Bell className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h4 className="font-bold text-gray-900 leading-tight">{n.title}</h4>
              <p className="text-sm text-gray-500 mt-1">{n.message}</p>
              <p className="text-xs text-gray-400 mt-2">{new Date(n.date).toLocaleString()}</p>
            </div>
          </div>
        )) : (
          <div className="text-center mt-20 text-gray-400">
            <Bell className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No tienes notificaciones nuevas</p>
          </div>
        )}
      </div>
    </div>
  );
};

const SupportScreen = ({ user, tickets, onBack, dispatch }) => {
  const userTickets = tickets.filter(t => t.userId === user.id);
  const [activeTicket, setActiveTicket] = useState(null);
  const [newMessage, setNewMessage] = useState('');

  const handleSend = () => {
    if (!newMessage.trim()) return;
    if (activeTicket && activeTicket !== 'new') {
      dispatch({ type: 'ADD_TICKET_MESSAGE', payload: { ticketId: activeTicket.id, senderId: user.id, text: newMessage } });
    } else {
      dispatch({ type: 'CREATE_TICKET', payload: { userId: user.id, text: newMessage } });
      setActiveTicket(null); // Return to list so user sees new ticket
    }
    setNewMessage('');
  };

  if (activeTicket) {
    const isNew = activeTicket === 'new';
    const currentTicket = isNew ? null : tickets.find(t => t.id === activeTicket.id);
    
    return (
      <div className="min-h-screen bg-gray-50 max-w-md mx-auto w-full z-40 absolute inset-0 flex flex-col">
        <div className="bg-white p-4 border-b border-gray-100 flex items-center gap-4 sticky top-0 shadow-sm z-10">
          <button onClick={() => setActiveTicket(null)} className="p-2 bg-gray-50 rounded-full"><ChevronRight className="w-5 h-5 rotate-180 text-gray-600" /></button>
          <h2 className="text-xl font-black text-gray-900">{isNew ? 'Nuevo Ticket' : 'Chat de Soporte'}</h2>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
          {!isNew && currentTicket?.messages.map((msg, idx) => (
            <div key={idx} className={`max-w-[80%] p-3 rounded-2xl ${msg.senderId === user.id ? 'bg-red-600 text-white self-end rounded-br-sm' : 'bg-white border border-gray-200 text-gray-800 self-start rounded-bl-sm shadow-sm'}`}>
              <p className="text-sm">{msg.text}</p>
              <p className={`text-[10px] mt-1 ${msg.senderId === user.id ? 'text-red-200' : 'text-gray-400'}`}>{new Date(msg.date).toLocaleTimeString()}</p>
            </div>
          ))}
          {isNew && <p className="text-center text-sm text-gray-500 mt-4">Describe tu problema y un agente te responderá pronto.</p>}
        </div>

        <div className="p-4 bg-white border-t border-gray-100">
          {(!isNew && currentTicket?.status === 'resolved') ? (
            <div className="bg-gray-100 p-4 rounded-xl text-center">
              <CheckCircle className="w-6 h-6 text-green-600 mx-auto mb-2" />
              <p className="text-sm font-bold text-gray-700">Este ticket ha sido solucionado.</p>
              <p className="text-xs text-gray-500 mt-1">Si necesitas más ayuda, por favor abre una nueva conversación.</p>
            </div>
          ) : (
            <div className="flex gap-2">
              <input 
                type="text" 
                value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
                placeholder="Escribe un mensaje..."
                className="flex-1 p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none"
              />
              <button onClick={handleSend} disabled={!newMessage.trim()} className={`p-3 rounded-xl flex items-center justify-center transition-colors ${newMessage.trim() ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-400'}`}>
                <Send className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 max-w-md mx-auto w-full z-40 absolute inset-0 flex flex-col">
      <div className="bg-white p-4 border-b border-gray-100 flex items-center justify-between sticky top-0 shadow-sm z-10">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 bg-gray-50 rounded-full"><ChevronRight className="w-5 h-5 rotate-180 text-gray-600" /></button>
          <h2 className="text-xl font-black text-gray-900">Soporte Técnico</h2>
        </div>
        <button onClick={() => setActiveTicket('new')} className="text-red-600 font-bold flex items-center gap-1 text-sm bg-red-50 px-3 py-1.5 rounded-full">
          <PlusCircle className="w-4 h-4" /> Nuevo
        </button>
      </div>
      
      <div className="p-4 flex-1 overflow-y-auto space-y-3">
        {userTickets.length > 0 ? userTickets.map(t => (
          <div key={t.id} onClick={() => setActiveTicket(t)} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 cursor-pointer hover:border-red-600 transition-colors">
            <div className="flex justify-between items-start mb-2">
              <span className={`text-xs font-bold px-2 py-1 rounded capitalize ${t.status === 'open' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                {t.status === 'open' ? 'Abierto' : 'Solucionado'}
              </span>
              <span className="text-xs text-gray-400">{new Date(t.date).toLocaleDateString()}</span>
            </div>
            <p className="font-bold text-gray-900 line-clamp-1">{t.messages[t.messages.length - 1]?.text}</p>
            <p className="text-sm text-gray-500 mt-1">{t.messages.length} mensaje(s)</p>
          </div>
        )) : (
          <div className="text-center mt-20 text-gray-400">
            <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No tienes conversaciones de soporte</p>
          </div>
        )}
      </div>
    </div>
  );
};

const SettingsScreen = ({ user, dispatch, onBack }) => {
  const handleDelete = () => {
    if (window.confirm('¿Estás seguro de que deseas eliminar tu cuenta? Esta acción no se puede deshacer.')) {
      dispatch({ type: 'DELETE_ACCOUNT', payload: user.id });
    }
  };

  const showTerms = () => {
    alert('Términos de uso y licencias:\n\n1. El uso de esta aplicación está sujeto a las leyes locales.\n2. Drive MX se reserva el derecho de suspender cuentas por mal uso.\n3. Todos los derechos reservados y operados legalmente.');
  };

  return (
    <div className="min-h-screen bg-gray-50 max-w-md mx-auto w-full z-40 absolute inset-0 flex flex-col">
      <div className="bg-white p-4 border-b border-gray-100 flex items-center gap-4 sticky top-0 shadow-sm z-10">
        <button onClick={onBack} className="p-2 bg-gray-50 rounded-full"><ChevronRight className="w-5 h-5 rotate-180 text-gray-600" /></button>
        <h2 className="text-xl font-black text-gray-900">Configuración</h2>
      </div>
      <div className="p-6 flex-1 space-y-4">
        <button onClick={showTerms} className="w-full bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 text-left hover:border-gray-300 transition-colors">
          <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center flex-shrink-0">
            <FileText className="w-5 h-5 text-blue-600" />
          </div>
          <div className="flex-1">
            <h4 className="font-bold text-gray-900">Términos de uso y licencias</h4>
            <p className="text-xs text-gray-500">Lee nuestras políticas legales</p>
          </div>
        </button>
        
        <button onClick={handleDelete} className="w-full bg-white p-4 rounded-2xl shadow-sm border border-red-100 flex items-center gap-4 text-left hover:bg-red-50 transition-colors group">
          <div className="w-10 h-10 bg-red-50 rounded-full flex items-center justify-center flex-shrink-0 group-hover:bg-red-100">
            <Trash2 className="w-5 h-5 text-red-600" />
          </div>
          <div className="flex-1">
            <h4 className="font-bold text-red-600">Eliminar cuenta</h4>
            <p className="text-xs text-red-400">Esta acción es permanente</p>
          </div>
        </button>
      </div>
    </div>
  );
};

const ReferralScreen = ({ user, settings, dispatch, onBack }) => {
  const handleShare = () => {
    window.open(settings.whatsappLink, '_blank');
    if (!user.hasReferred) {
      dispatch({ type: 'APPLY_REFERRAL_REWARD', payload: user.id });
      setTimeout(() => alert('¡Gracias por recomendarnos! Hemos recargado $10 a tu cartera.'), 1000);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 max-w-md mx-auto w-full z-40 absolute inset-0 flex flex-col">
      <div className="bg-white p-4 border-b border-gray-100 flex items-center gap-4 sticky top-0 shadow-sm z-10">
        <button onClick={onBack} className="p-2 bg-gray-50 rounded-full"><ChevronRight className="w-5 h-5 rotate-180 text-gray-600" /></button>
        <h2 className="text-xl font-black text-gray-900">Recomiéndanos</h2>
      </div>
      <div className="p-6 flex-1 flex flex-col items-center justify-center text-center">
        {!settings.referralActive ? (
          <>
            <Share2 className="w-16 h-16 text-gray-300 mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">Función inactiva</h3>
            <p className="text-gray-500">El programa de recomendaciones no está disponible en este momento.</p>
          </>
        ) : (
          <>
            <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-6">
              <Share2 className="w-12 h-12 text-green-600" />
            </div>
            <h3 className="text-2xl font-black text-gray-900 mb-2">¡Gana $10 MXN!</h3>
            <p className="text-gray-600 mb-8">Comparte Drive MX con tus amigos por WhatsApp. Recibirás $10 pesos en tu cartera automáticamente al compartir nuestro link oficial.</p>
            
            {user.hasReferred ? (
              <div className="bg-green-50 text-green-700 p-4 rounded-xl border border-green-200 w-full flex items-center justify-center gap-2 font-bold">
                <CheckCircle className="w-5 h-5" /> Ya recibiste tu recompensa
              </div>
            ) : (
              <Button onClick={handleShare} className="bg-green-600 hover:bg-green-700 text-white">
                Compartir por WhatsApp
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
};

const SharedMenu = ({ user, isMenuOpen, setIsMenuOpen, setView, dispatch }) => {
  if (!isMenuOpen) return null;
  return (
    <div className="absolute inset-0 bg-black/60 z-50 flex transition-opacity">
      <div className="w-3/4 bg-white h-full shadow-2xl flex flex-col">
        <div className="p-6 bg-red-600 text-white">
          <div className="flex justify-between items-center mb-6">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
              <User className="w-6 h-6" />
            </div>
            <button onClick={() => setIsMenuOpen(false)} className="bg-red-700 p-2 rounded-full hover:bg-red-800 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
          <h3 className="font-black text-2xl truncate">{user.name}</h3>
          <p className="text-sm text-red-100 font-medium truncate">{user.email}</p>
        </div>
        
        <div className="flex-1 py-2">
          <button onClick={() => { setView('home'); setIsMenuOpen(false); }} className="w-full text-left px-6 py-4 hover:bg-gray-50 flex items-center gap-4 font-bold text-gray-700 transition-colors">
            {user.role === 'passenger' ? <MapPin className="w-5 h-5 text-gray-400" /> : <Navigation className="w-5 h-5 text-gray-400" />} 
            {user.role === 'passenger' ? 'Solicitar Viaje' : 'Inicio'}
          </button>
          <button onClick={() => { setView('wallet'); setIsMenuOpen(false); }} className="w-full text-left px-6 py-4 hover:bg-gray-50 flex items-center gap-4 font-bold text-gray-700 transition-colors">
            <Wallet className="w-5 h-5 text-gray-400" /> Mi Billetera
          </button>
          <button onClick={() => { setView('notifications'); setIsMenuOpen(false); }} className="w-full text-left px-6 py-4 hover:bg-gray-50 flex items-center gap-4 font-bold text-gray-700 transition-colors">
            <Bell className="w-5 h-5 text-gray-400" /> Notificaciones
          </button>
          <button className="w-full text-left px-6 py-4 hover:bg-gray-50 flex items-center gap-4 font-bold text-gray-700 transition-colors">
            <Clock className="w-5 h-5 text-gray-400" /> Mis Viajes
          </button>
          <button onClick={() => { setView('support'); setIsMenuOpen(false); }} className="w-full text-left px-6 py-4 hover:bg-gray-50 flex items-center gap-4 font-bold text-gray-700 transition-colors">
            <MessageSquare className="w-5 h-5 text-gray-400" /> Soporte Técnico
          </button>
          <button onClick={() => { setView('settings'); setIsMenuOpen(false); }} className="w-full text-left px-6 py-4 hover:bg-gray-50 flex items-center gap-4 font-bold text-gray-700 transition-colors">
            <Settings className="w-5 h-5 text-gray-400" /> Configuración
          </button>
          <button onClick={() => { setView('referral'); setIsMenuOpen(false); }} className="w-full text-left px-6 py-4 hover:bg-gray-50 flex items-center gap-4 font-bold text-gray-700 transition-colors">
            <Share2 className="w-5 h-5 text-gray-400" /> Recomiéndanos
          </button>
        </div>

        <div className="p-6 border-t border-gray-100 bg-gray-50">
          <button onClick={() => dispatch({type:'LOGOUT'})} className="w-full text-left py-2 text-red-600 font-black flex items-center gap-3 hover:text-red-700 transition-colors">
            <LogOut className="w-5 h-5" /> Cerrar Sesión
          </button>
        </div>
      </div>
      <div className="flex-1" onClick={() => setIsMenuOpen(false)}></div>
    </div>
  );
};

// --- SCREENS ---

const SplashScreen = ({ onFinish }) => {
  useEffect(() => {
    const timer = setTimeout(onFinish, 2000);
    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <div className="h-screen w-full bg-white flex flex-col items-center justify-center relative overflow-hidden">
      <div className="absolute top-0 w-full h-1/2 bg-gradient-to-b from-red-50 to-white"></div>
      <div className="z-10 flex flex-col items-center">
        <div className="w-24 h-24 bg-red-600 rounded-3xl flex items-center justify-center shadow-2xl mb-6 animate-pulse">
          <Navigation className="text-white w-12 h-12" />
        </div>
        <h1 className="text-4xl font-black text-gray-900 tracking-tight">DRIVE <span className="text-red-600">MX</span></h1>
        <p className="text-gray-500 mt-2 font-medium">Loading...</p>
      </div>
      <div className="absolute bottom-10 w-8 h-8 border-4 border-red-200 border-t-red-600 rounded-full animate-spin"></div>
    </div>
  );
};

const AuthScreen = () => {
  const { state, dispatch } = useContext(AppContext);
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('passenger'); // default passenger for new registers as requested earlier

  const handleSubmit = () => {
    if (isLogin) {
      dispatch({ type: 'LOGIN', payload: { email, password } });
    } else {
      dispatch({ type: 'REGISTER', payload: { email, password, name, role } });
    }
  };

  return (
    <div className="min-h-screen bg-white p-6 flex flex-col justify-center max-w-md mx-auto">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-red-600 rounded-2xl flex items-center justify-center shadow-lg mx-auto mb-4">
          <Navigation className="text-white w-8 h-8" />
        </div>
        <h2 className="text-3xl font-black text-gray-900">{isLogin ? 'Bienvenido' : 'Crear Cuenta'}</h2>
        <p className="text-gray-500 mt-2">{isLogin ? 'Ingresa para continuar' : 'Únete a Drive MX'}</p>
      </div>

      {state.loginError && <div className="bg-red-100 text-red-600 p-3 rounded-lg mb-4 text-sm font-medium text-center">Credenciales incorrectas (Prueba juan@app.com / 123)</div>}

      {!isLogin && <Input icon={User} placeholder="Nombre completo" value={name} onChange={e => setName(e.target.value)} />}
      <Input icon={User} type="email" placeholder="Correo electrónico" value={email} onChange={e => setEmail(e.target.value)} />
      <Input icon={Shield} type="password" placeholder="Contraseña" value={password} onChange={e => setPassword(e.target.value)} />

      <Button onClick={handleSubmit}>{isLogin ? 'Ingresar' : 'Registrarse'}</Button>
      
      <div className="mt-6 text-center">
        <button onClick={() => setIsLogin(!isLogin)} className="text-red-600 font-bold text-sm">
          {isLogin ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Ingresa'}
        </button>
      </div>
    </div>
  );
};

const SimulatedMap = ({ children, height = 'h-64' }) => (
  <div className={`w-full ${height} bg-gray-200 relative overflow-hidden rounded-b-3xl`}>
    <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
    <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
      <path d="M 50 50 Q 150 150 250 100 T 350 200" fill="transparent" stroke="#EF4444" strokeWidth="4" strokeDasharray="5,5" className="animate-pulse" />
    </svg>
    {children}
  </div>
);

// --- PASSENGER MODULE ---

const PassengerApp = () => {
  const { state, dispatch } = useContext(AppContext);
  const user = state.currentUser;
  const [view, setView] = useState('home'); 
  const [stops, setStops] = useState(['', '']);
  const [selectedService, setSelectedService] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('wallet'); // Nuevo estado para método de pago
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showWalletPushUp, setShowWalletPushUp] = useState(false);
  const [showBlockedModal, setShowBlockedModal] = useState(false);

  const activeTrip = state.trips.find(t => t.passengerId === user.id && t.status !== 'completed' && t.status !== 'cancelled');
  const isBlocked = user.balance < 0;

  const handleRequestRide = () => {
    if (isBlocked) {
      setShowBlockedModal(true);
      return;
    }
    if (!selectedService) return alert('Selecciona un servicio.');
    if (paymentMethod === 'wallet' && user.balance < selectedService.baseRate) {
       return alert('No tienes saldo suficiente en tu cartera para este método de pago. Por favor elige efectivo, transferencia o recarga tu saldo.');
    }
    
    const price = selectedService.baseRate + (Math.random() * 50);
    dispatch({
      type: 'REQUEST_TRIP',
      payload: { passengerId: user.id, serviceId: selectedService.id, route: stops, price: parseFloat(price.toFixed(2)), paymentMethod }
    });
    setView('home');
  };

  if (activeTrip) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col max-w-md mx-auto relative">
        <SimulatedMap height="h-1/2">
           <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-red-600 rounded-full shadow-[0_0_0_10px_rgba(239,68,68,0.2)] animate-ping"></div>
        </SimulatedMap>
        
        <div className="flex-1 bg-white rounded-t-3xl -mt-6 z-10 p-6 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] flex flex-col">
          <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-6"></div>
          <h2 className="text-xl font-black text-gray-900 mb-2">
            {activeTrip.status === 'searching' ? 'Buscando conductor...' : activeTrip.status === 'accepted' ? 'El conductor va en camino' : 'Viaje en curso'}
          </h2>
          {activeTrip.status !== 'searching' && (
            <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-2xl mb-4">
              <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                <Car className="text-gray-500" />
              </div>
              <div>
                <p className="font-bold text-gray-900">Toyota Yaris - ABC-123</p>
                <p className="text-sm text-gray-500">Carlos Conductor • 4.9★</p>
              </div>
            </div>
          )}

          {/* Botón para compartir viaje activo */}
          <button 
            onClick={() => {
              const msg = `¡Sigue mi viaje en Drive MX! Voy en camino seguro.`;
              window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
            }}
            className="w-full bg-[#25D366] text-white p-3 rounded-xl mb-4 flex items-center justify-center gap-2 font-bold hover:bg-[#20bd5a] transition-colors"
          >
            <Share2 className="w-5 h-5" /> Compartir por WhatsApp
          </button>

          <div className="mt-auto bg-red-50 p-6 rounded-2xl border border-red-100 text-center">
            <p className="text-sm font-bold text-red-600 mb-2">CÓDIGO DE SEGURIDAD</p>
            <p className="text-5xl font-black tracking-widest text-gray-900">{activeTrip.pin}</p>
            <p className="text-xs text-gray-500 mt-2">Díselo al conductor para finalizar el viaje</p>
          </div>
        </div>
      </div>
    );
  }

  if (view === 'wallet') return <WalletScreen user={user} transactions={state.transactions} onBack={() => setView('home')} isBlocked={isBlocked} />;
  if (view === 'notifications') return <NotificationsScreen user={user} notifications={state.notifications} onBack={() => setView('home')} />;
  if (view === 'support') return <SupportScreen user={user} tickets={state.supportTickets} onBack={() => setView('home')} dispatch={dispatch} />;
  if (view === 'settings') return <SettingsScreen user={user} dispatch={dispatch} onBack={() => setView('home')} />;
  if (view === 'referral') return <ReferralScreen user={user} settings={state.settings} dispatch={dispatch} onBack={() => setView('home')} />;

  return (
    <div className="min-h-screen bg-white flex flex-col max-w-md mx-auto relative overflow-hidden">
      <SharedMenu user={user} isMenuOpen={isMenuOpen} setIsMenuOpen={setIsMenuOpen} setView={setView} dispatch={dispatch} />

      {showWalletPushUp && (
        <div className="absolute inset-0 bg-black/50 z-50 flex flex-col justify-end">
          <div className="bg-white rounded-t-3xl p-6 shadow-2xl w-full relative">
            <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-6"></div>
            <h3 className="text-2xl font-black text-center text-gray-900 mb-2">Tu Cartera</h3>
            <p className="text-center text-gray-500 mb-6 text-sm px-4">{state.settings.walletLegend}</p>
            <div className="bg-gray-50 p-6 rounded-2xl text-center mb-6">
              <p className="text-sm font-bold text-gray-500 mb-1">Saldo Actual</p>
              <p className={`text-4xl font-black ${user.balance < 0 ? 'text-red-600' : 'text-green-600'}`}>${user.balance.toFixed(2)}</p>
            </div>
            <Button onClick={() => { setView('wallet'); setShowWalletPushUp(false); }} className="mb-3">Ver Historial</Button>
            <Button variant="secondary" onClick={() => setShowWalletPushUp(false)}>Cerrar</Button>
          </div>
        </div>
      )}

      {showBlockedModal && (
        <div className="absolute inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 shadow-2xl w-full text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
            <h3 className="text-2xl font-black text-gray-900 mb-2">Saldo Pendiente</h3>
            <p className="text-gray-500 mb-6">
              No podrás solicitar más viajes hasta liquidar tu saldo pendiente de <span className="font-bold text-red-600">-${Math.abs(user.balance).toFixed(2)}</span>. Por favor recarga tu cartera.
            </p>
            <Button onClick={() => setShowBlockedModal(false)}>Entendido</Button>
          </div>
        </div>
      )}

      <div className="p-4 flex justify-between items-center z-10 absolute top-0 w-full pointer-events-none">
        <button className="w-10 h-10 bg-white border border-gray-100 shadow-sm rounded-full flex items-center justify-center hover:bg-gray-50 transition-colors pointer-events-auto" onClick={() => setIsMenuOpen(true)}>
          <Menu className="text-gray-900 w-5 h-5" />
        </button>
      </div>

      <SimulatedMap height="h-64" />

      <div className="p-6 flex-1 flex flex-col">
        {view === 'home' ? (
          <>
            <h2 className="text-2xl font-black text-gray-900 mb-6 mt-4">¿A dónde vamos?</h2>
            <div className="bg-gray-50 rounded-2xl p-4 mb-6 border border-gray-100 shadow-sm relative">
              <div className="absolute left-6 top-8 bottom-8 w-0.5 bg-gray-300"></div>
              <div className="flex items-center gap-3 mb-4 relative">
                <div className="w-3 h-3 bg-gray-900 rounded-full z-10"></div>
                <input type="text" placeholder="Punto de partida" className="w-full bg-transparent font-medium focus:outline-none" defaultValue="Mi ubicación actual" />
              </div>
              <div className="w-full h-px bg-gray-200 mb-4 ml-6"></div>
              <div className="flex items-center gap-3 relative">
                <div className="w-3 h-3 bg-red-600 z-10"></div>
                <input type="text" placeholder="Destino" className="w-full bg-transparent font-medium focus:outline-none" value={stops[1]} onChange={e => setStops(['', e.target.value])} />
              </div>
            </div>

            {/* Banner Mi Cartera */}
            <div onClick={() => setShowWalletPushUp(true)} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-3 flex justify-between items-center cursor-pointer hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-50 rounded-full flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-red-600" />
                </div>
                <span className="font-bold text-gray-800">Mi Cartera</span>
              </div>
              <span className={`text-xl font-black ${user.balance < 0 ? 'text-red-600' : 'text-green-600'}`}>${user.balance.toFixed(2)}</span>
            </div>

            {/* Banner Compartir Viaje */}
            <div 
              onClick={() => {
                const msg = stops[1] ? `Voy en viaje hacia ${stops[1]} usando Drive MX. ¡Sigue mi ruta!` : `Estoy viajando seguro con Drive MX. ¡Sigue mi ruta!`;
                window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
              }}
              className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6 flex justify-between items-center cursor-pointer hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#25D366]/10 rounded-full flex items-center justify-center">
                  <Share2 className="w-6 h-6 text-[#25D366]" />
                </div>
                <span className="font-bold text-gray-800">Compartir viaje</span>
              </div>
              <span className="text-xs font-bold text-[#25D366] bg-[#25D366]/10 px-3 py-1 rounded-full">WhatsApp</span>
            </div>

            {stops[1] && (
              <Button onClick={() => isBlocked ? setShowBlockedModal(true) : setView('ride')} className="mt-auto">Cotizar Viaje</Button>
            )}
          </>
        ) : (
          <div className="flex flex-col h-full">
            <div className="flex items-center mb-6">
              <button onClick={() => setView('home')}><ChevronRight className="w-6 h-6 rotate-180" /></button>
              <h2 className="text-xl font-black text-gray-900 ml-2">Elegir Servicio</h2>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-3 mb-6">
              {state.services.filter(s => s.type === 'ride').map(service => {
                const estPrice = (service.baseRate + (Math.random() * 20)).toFixed(2);
                const isSelected = selectedService?.id === service.id;
                return (
                  <div key={service.id} onClick={() => setSelectedService(service)} className={`p-4 rounded-2xl border-2 transition-all flex items-center justify-between cursor-pointer ${isSelected ? 'border-red-600 bg-red-50' : 'border-gray-100 bg-white'}`}>
                    <div className="flex items-center gap-4">
                      {service.image === 'car' ? <Car className={`w-8 h-8 ${isSelected ? 'text-red-600' : 'text-gray-400'}`} /> : <Bike className={`w-8 h-8 ${isSelected ? 'text-red-600' : 'text-gray-400'}`} />}
                      <div>
                        <h4 className="font-bold text-gray-900">{service.name}</h4>
                        <p className="text-xs text-gray-500 flex items-center gap-1"><Clock className="w-3 h-3" /> 5 min</p>
                      </div>
                    </div>
                    <span className="font-black text-lg text-gray-900">${estPrice}</span>
                  </div>
                );
              })}
            </div>

            {/* SECCIÓN DE MÉTODOS DE PAGO */}
            {selectedService && (
              <div className="mb-6">
                <h3 className="text-sm font-bold text-gray-900 mb-3">Método de pago</h3>
                <div className="flex gap-2">
                  <button onClick={() => setPaymentMethod('wallet')} className={`flex-1 py-3 rounded-xl text-xs font-bold border-2 transition-all flex flex-col items-center gap-1 ${paymentMethod === 'wallet' ? 'bg-red-50 border-red-600 text-red-600' : 'bg-white border-gray-100 text-gray-500'}`}>
                    <Wallet className="w-5 h-5" /> Cartera
                  </button>
                  <button onClick={() => setPaymentMethod('cash')} className={`flex-1 py-3 rounded-xl text-xs font-bold border-2 transition-all flex flex-col items-center gap-1 ${paymentMethod === 'cash' ? 'bg-red-50 border-red-600 text-red-600' : 'bg-white border-gray-100 text-gray-500'}`}>
                    <DollarSign className="w-5 h-5" /> Efectivo
                  </button>
                  <button onClick={() => setPaymentMethod('transfer')} className={`flex-1 py-3 rounded-xl text-xs font-bold border-2 transition-all flex flex-col items-center gap-1 ${paymentMethod === 'transfer' ? 'bg-red-50 border-red-600 text-red-600' : 'bg-white border-gray-100 text-gray-500'}`}>
                    <Activity className="w-5 h-5" /> Transfer.
                  </button>
                </div>
              </div>
            )}

            <Button onClick={handleRequestRide} disabled={!selectedService}>{isBlocked ? 'Saldo Insuficiente' : 'Confirmar Viaje'}</Button>
          </div>
        )}
      </div>
    </div>
  );
};

// --- DRIVER MODULE ---

const DriverApp = () => {
  const { state, dispatch } = useContext(AppContext);
  const user = state.currentUser;
  
  const [view, setView] = useState('home');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showWalletPushUp, setShowWalletPushUp] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [showPinModal, setShowPinModal] = useState(false);

  const activeTrip = state.trips.find(t => t.driverId === user.id && t.status !== 'completed' && t.status !== 'cancelled');
  const pendingTrip = state.trips.find(t => t.status === 'searching');
  const isBlocked = user.balance <= 0;

  const toggleStatus = () => {
    dispatch({ type: 'CHANGE_STATUS', payload: { userId: user.id, status: user.status === 'available' ? 'offline' : 'available' } });
  };

  const handleAccept = (tripId) => {
    dispatch({ type: 'ACCEPT_TRIP', payload: { tripId, driverId: user.id } });
  };

  const handleComplete = () => {
    if (pinInput === activeTrip.pin) {
      dispatch({ type: 'COMPLETE_TRIP', payload: { tripId: activeTrip.id } });
      setShowPinModal(false);
      setPinInput('');
      alert('Viaje completado. Saldo actualizado.');
    } else {
      alert('PIN incorrecto.');
    }
  };

  if (view === 'wallet') return <WalletScreen user={user} transactions={state.transactions} onBack={() => setView('home')} isBlocked={isBlocked} />;
  if (view === 'notifications') return <NotificationsScreen user={user} notifications={state.notifications} onBack={() => setView('home')} />;
  if (view === 'support') return <SupportScreen user={user} tickets={state.supportTickets} onBack={() => setView('home')} dispatch={dispatch} />;
  if (view === 'settings') return <SettingsScreen user={user} dispatch={dispatch} onBack={() => setView('home')} />;
  if (view === 'referral') return <ReferralScreen user={user} settings={state.settings} dispatch={dispatch} onBack={() => setView('home')} />;

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col max-w-md mx-auto relative overflow-hidden">
      
      <SharedMenu user={user} isMenuOpen={isMenuOpen} setIsMenuOpen={setIsMenuOpen} setView={setView} dispatch={dispatch} />

      {/* Driver Wallet Push Up */}
      {showWalletPushUp && (
        <div className="absolute inset-0 bg-black/70 z-50 flex flex-col justify-end">
          <div className="bg-white text-gray-900 rounded-t-3xl p-6 shadow-2xl w-full relative">
            <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-6"></div>
            <h3 className="text-2xl font-black text-center mb-2">Tu Cartera (Conductor)</h3>
            <p className="text-center text-gray-500 mb-6 text-sm px-4">{state.settings.walletLegend}</p>
            <div className="bg-gray-50 p-6 rounded-2xl text-center mb-6">
              <p className="text-sm font-bold text-gray-500 mb-1">Saldo Actual</p>
              <p className={`text-4xl font-black ${user.balance <= 0 ? 'text-red-600' : 'text-green-600'}`}>${user.balance.toFixed(2)}</p>
            </div>
            <Button onClick={() => { setView('wallet'); setShowWalletPushUp(false); }} className="mb-3">Ver Historial</Button>
            <Button variant="secondary" onClick={() => setShowWalletPushUp(false)}>Cerrar</Button>
          </div>
        </div>
      )}

      <div className="p-4 flex justify-between items-center bg-gray-800 z-10 shadow-md">
        <button className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center hover:bg-gray-600 transition-colors" onClick={() => setIsMenuOpen(true)}>
          <Menu className="text-white w-5 h-5" />
        </button>
        
        <button 
          onClick={toggleStatus}
          disabled={isBlocked && user.status === 'offline'}
          className={`px-4 py-2 rounded-full font-bold text-xs uppercase tracking-wider transition-all ${user.status === 'available' ? 'bg-red-600 text-white shadow-[0_0_15px_rgba(239,68,68,0.5)]' : 'bg-gray-700 text-gray-400'} ${isBlocked ? 'opacity-50' : ''}`}
        >
          {user.status === 'available' ? 'Conectado' : 'Desconectado'}
        </button>
      </div>

      {isBlocked && user.status === 'offline' && (
        <div className="bg-red-600 p-3 text-center text-xs font-bold flex items-center justify-center gap-2 z-10 shadow-md">
          <AlertTriangle className="w-4 h-4" /> Recarga saldo para poder conectarte
        </div>
      )}

      {/* Driver Wallet & Share Banners */}
      <div className="p-4 z-10 absolute top-20 w-full pointer-events-none flex flex-col gap-3">
        <div 
          onClick={() => setShowWalletPushUp(true)}
          className="bg-white/95 backdrop-blur p-4 rounded-xl shadow-lg border border-gray-100 flex justify-between items-center cursor-pointer pointer-events-auto"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-gray-600" />
            </div>
            <span className="font-bold text-gray-800">Mi Cartera</span>
          </div>
          <span className={`text-xl font-black ${user.balance <= 0 ? 'text-red-600' : 'text-green-600'}`}>${user.balance.toFixed(2)}</span>
        </div>

        {/* Compartir Ruta Banner */}
        <div 
          onClick={() => {
            const msg = `Estoy trabajando y viajando seguro con Drive MX. ¡Sigue mi ruta!`;
            window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
          }}
          className="bg-white/95 backdrop-blur p-4 rounded-xl shadow-lg border border-gray-100 flex justify-between items-center cursor-pointer pointer-events-auto"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#25D366]/10 rounded-full flex items-center justify-center">
              <Share2 className="w-6 h-6 text-[#25D366]" />
            </div>
            <span className="font-bold text-gray-800">Compartir ruta</span>
          </div>
          <span className="text-xs font-bold text-[#25D366] bg-[#25D366]/10 px-3 py-1 rounded-full">WhatsApp</span>
        </div>
      </div>

      <div className="flex-1 relative">
        <SimulatedMap height="h-full">
           <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
             <Car className="w-8 h-8 text-gray-900 filter drop-shadow-lg" />
           </div>
        </SimulatedMap>

        {user.status === 'available' && pendingTrip && !activeTrip && (
          <div className="absolute bottom-0 w-full p-4 z-20">
            <div className="bg-white text-gray-900 rounded-3xl p-6 shadow-2xl animate-bounce-slight">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <span className="bg-red-100 text-red-600 text-xs font-bold px-2 py-1 rounded-md uppercase">Nuevo Viaje</span>
                  <h3 className="text-2xl font-black mt-2">${pendingTrip.price}</h3>
                  <p className="text-xs font-bold text-gray-500 mt-1 uppercase flex items-center gap-1">
                    Pago en: <span className="text-gray-900">{pendingTrip.paymentMethod === 'wallet' ? 'Cartera' : pendingTrip.paymentMethod === 'cash' ? 'Efectivo' : 'Transferencia'}</span>
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold">3.2 km</p>
                  <p className="text-xs text-gray-500">8 min</p>
                </div>
              </div>
              <div className="bg-gray-50 p-3 rounded-xl mb-4 text-sm">
                <p className="font-medium text-gray-600 flex items-center gap-2"><MapPin className="w-4 h-4 text-gray-400"/> {pendingTrip.route[0] || 'Origen'}</p>
                <div className="pl-2 py-1"><div className="w-0.5 h-3 bg-gray-300"></div></div>
                <p className="font-bold flex items-center gap-2"><MapPin className="w-4 h-4 text-red-600"/> {pendingTrip.route[1] || 'Destino'}</p>
              </div>
              <Button onClick={() => handleAccept(pendingTrip.id)}>Aceptar Viaje</Button>
            </div>
          </div>
        )}

        {activeTrip && (
          <div className="absolute bottom-0 w-full p-4 z-20">
            <div className="bg-white text-gray-900 rounded-3xl p-6 shadow-2xl">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-xl font-black">{activeTrip.status === 'accepted' ? 'Ir al origen' : 'En viaje'}</h3>
                  <p className="text-sm text-gray-500">Pasajero esperando</p>
                </div>
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <Navigation className="w-6 h-6 text-red-600" />
                </div>
              </div>
              
              {activeTrip.status === 'accepted' ? (
                 <Button onClick={() => dispatch({type: 'START_TRIP', payload: activeTrip.id})}>Iniciar Viaje</Button>
              ) : (
                 <Button onClick={() => setShowPinModal(true)}>Finalizar Viaje</Button>
              )}
            </div>
          </div>
        )}
      </div>

      {showPinModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-white text-gray-900 p-6 rounded-3xl w-full max-w-sm text-center">
            <Shield className="w-12 h-12 text-red-600 mx-auto mb-4" />
            <h3 className="text-xl font-black mb-2">Ingresa el PIN</h3>
            <p className="text-sm text-gray-500 mb-6">Pídele el código de 4 dígitos al pasajero para finalizar el cobro.</p>
            <input 
              type="text" 
              maxLength="4" 
              value={pinInput} 
              onChange={e => setPinInput(e.target.value.replace(/\D/g, ''))}
              className="w-full text-center text-4xl font-black tracking-[1em] p-4 bg-gray-50 border-2 border-gray-200 rounded-2xl mb-6 focus:border-red-600 outline-none"
              placeholder="0000"
            />
            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => setShowPinModal(false)}>Cancelar</Button>
              <Button onClick={handleComplete} disabled={pinInput.length !== 4}>Validar y Cobrar</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// --- ADMIN PANEL ---

const AdminApp = () => {
  const { state, dispatch } = useContext(AppContext);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedUser, setSelectedUser] = useState(null);
  const [balanceAdd, setBalanceAdd] = useState('');
  
  // Notification form state
  const [notifTitle, setNotifTitle] = useState('');
  const [notifMessage, setNotifMessage] = useState('');
  const [notifTarget, setNotifTarget] = useState('all');

  // Support Admin State
  const [adminActiveTicket, setAdminActiveTicket] = useState(null);
  const [adminReplyText, setAdminReplyText] = useState('');

  const stats = {
    totalUsers: state.users.length,
    activeTrips: state.trips.filter(t => t.status !== 'completed').length,
    revenue: state.transactions.filter(t => t.type === 'earning').reduce((acc, t) => acc + (t.amount * 0.20), 0)
  };

  const handleUpdateBalance = () => {
    const amount = parseFloat(balanceAdd);
    if (!isNaN(amount)) {
      dispatch({ type: 'UPDATE_BALANCE', payload: { userId: selectedUser.id, amount } });
      setBalanceAdd('');
      setSelectedUser({...selectedUser, balance: selectedUser.balance + amount});
      alert('Saldo actualizado correctamente.');
    }
  };

  const handleSendNotification = () => {
    if (!notifTitle || !notifMessage) return alert('Completa título y mensaje.');
    dispatch({
      type: 'SEND_NOTIFICATION',
      payload: { title: notifTitle, message: notifMessage, target: notifTarget }
    });
    setNotifTitle('');
    setNotifMessage('');
    alert('Notificación enviada exitosamente.');
  };

  const handleAdminReply = () => {
    if (!adminReplyText.trim() || !adminActiveTicket) return;
    dispatch({ type: 'ADD_TICKET_MESSAGE', payload: { ticketId: adminActiveTicket.id, senderId: 'admin1', text: adminReplyText } });
    setAdminReplyText('');
  };

  const handleResolveTicket = () => {
    if (!adminActiveTicket) return;
    dispatch({ type: 'RESOLVE_TICKET', payload: adminActiveTicket.id });
    setAdminActiveTicket(null);
    alert('Ticket marcado como solucionado.');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className="w-64 bg-gray-900 text-white flex flex-col">
        <div className="p-6">
          <h1 className="text-2xl font-black tracking-tight">DRIVE MX <span className="text-red-500">ADMIN</span></h1>
        </div>
        <nav className="flex-1 px-4 space-y-2">
          {['dashboard', 'usuarios', 'viajes', 'notificaciones', 'soporte', 'ajustes'].map(tab => (
            <button 
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`w-full text-left px-4 py-3 rounded-xl font-medium capitalize flex items-center gap-3 transition-colors ${activeTab === tab ? 'bg-red-600 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}
            >
              {tab === 'dashboard' ? <Activity className="w-5 h-5"/> : 
               tab === 'usuarios' ? <User className="w-5 h-5"/> : 
               tab === 'notificaciones' ? <Bell className="w-5 h-5"/> : 
               tab === 'soporte' ? <MessageSquare className="w-5 h-5"/> : 
               tab === 'ajustes' ? <Settings className="w-5 h-5"/> : <Navigation className="w-5 h-5"/>}
              {tab}
            </button>
          ))}
        </nav>
        <div className="p-4">
          <button onClick={() => dispatch({type:'LOGOUT'})} className="flex items-center gap-2 text-gray-500 hover:text-white transition-colors">
            <LogOut className="w-5 h-5" /> Salir
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-8 overflow-y-auto">
        {activeTab === 'dashboard' && (
          <div>
            <h2 className="text-3xl font-black text-gray-900 mb-8">Dashboard</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center mb-4"><User /></div>
                <p className="text-gray-500 font-medium">Usuarios Totales</p>
                <h3 className="text-4xl font-black text-gray-900">{stats.totalUsers}</h3>
              </div>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div className="w-12 h-12 bg-green-100 text-green-600 rounded-xl flex items-center justify-center mb-4"><Navigation /></div>
                <p className="text-gray-500 font-medium">Viajes Activos</p>
                <h3 className="text-4xl font-black text-gray-900">{stats.activeTrips}</h3>
              </div>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div className="w-12 h-12 bg-red-100 text-red-600 rounded-xl flex items-center justify-center mb-4"><DollarSign /></div>
                <p className="text-gray-500 font-medium">Ingresos Plataforma</p>
                <h3 className="text-4xl font-black text-gray-900">${stats.revenue.toFixed(2)}</h3>
              </div>
            </div>
            
            <h3 className="text-xl font-bold mb-4">Transacciones Recientes</h3>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-gray-50 text-gray-500 text-sm">
                  <tr>
                    <th className="p-4">ID</th>
                    <th className="p-4">Usuario ID</th>
                    <th className="p-4">Tipo</th>
                    <th className="p-4">Monto</th>
                    <th className="p-4">Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {state.transactions.slice(-5).reverse().map(t => (
                    <tr key={t.id} className="border-t border-gray-100">
                      <td className="p-4 font-mono text-xs">{t.id}</td>
                      <td className="p-4 font-medium">{t.userId}</td>
                      <td className="p-4 capitalize">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${t.type === 'payment' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>{t.type}</span>
                      </td>
                      <td className={`p-4 font-bold ${t.amount < 0 ? 'text-red-600' : 'text-green-600'}`}>{t.amount.toFixed(2)}</td>
                      <td className="p-4 text-sm text-gray-500">{new Date(t.date).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'usuarios' && (
          <div>
            <h2 className="text-3xl font-black text-gray-900 mb-8">Gestión de Usuarios</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {state.users.filter(u => u.role !== 'admin').map(user => (
                <div key={user.id} onClick={() => setSelectedUser(user)} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 cursor-pointer hover:border-red-600 transition-colors">
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-gray-500"><User /></div>
                    <span className={`px-2 py-1 rounded text-xs font-bold capitalize ${user.role === 'passenger' ? 'bg-blue-100 text-blue-600' : user.role === 'driver' ? 'bg-orange-100 text-orange-600' : 'bg-purple-100 text-purple-600'}`}>
                      {user.role}
                    </span>
                  </div>
                  <h4 className="font-bold text-gray-900 truncate">{user.name}</h4>
                  <p className="text-sm text-gray-500 mb-4 truncate">{user.email}</p>
                  
                  <div className="flex justify-between items-center pt-4 border-t border-gray-100">
                    <span className={`text-sm font-bold ${user.balance < 0 ? 'text-red-600' : 'text-green-600'}`}>
                      ${user.balance.toFixed(2)}
                    </span>
                    <span className={`w-3 h-3 rounded-full ${user.status === 'active' || user.status === 'available' ? 'bg-green-500' : user.status === 'busy' ? 'bg-yellow-500' : 'bg-red-500'}`}></span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'notificaciones' && (
          <div>
            <h2 className="text-3xl font-black text-gray-900 mb-8">Notificaciones Push</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Send className="w-5 h-5 text-red-600"/> Enviar Nueva Notificación
                </h3>
                <Input label="Título" placeholder="Ej. ¡Promo Especial!" value={notifTitle} onChange={e => setNotifTitle(e.target.value)} />
                <div className="mb-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Mensaje</label>
                  <textarea 
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none h-24 resize-none"
                    placeholder="Escribe tu mensaje aquí..."
                    value={notifMessage} onChange={e => setNotifMessage(e.target.value)}
                  />
                </div>
                <div className="mb-6">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Enviar a:</label>
                  <select className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none" value={notifTarget} onChange={e => setNotifTarget(e.target.value)}>
                    <option value="all">Todos los usuarios (Pasajeros y Conductores)</option>
                    <option value="passenger">Solo Pasajeros</option>
                    <option value="driver">Solo Conductores</option>
                  </select>
                </div>
                <Button onClick={handleSendNotification}>Enviar Notificación</Button>
              </div>

              <div>
                <h3 className="font-bold text-gray-900 mb-4">Historial de Envíos</h3>
                <div className="space-y-4">
                  {state.notifications.map(n => (
                    <div key={n.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-bold text-gray-900">{n.title}</h4>
                        <span className="text-xs px-2 py-1 bg-gray-100 rounded text-gray-500 capitalize">{n.target}</span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{n.message}</p>
                      <p className="text-xs text-gray-400">{new Date(n.date).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        )}

        {activeTab === 'soporte' && (
          <div>
            <h2 className="text-3xl font-black text-gray-900 mb-8">Soporte Técnico</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {state.supportTickets.map(t => {
                const user = state.users.find(u => u.id === t.userId);
                return (
                  <div key={t.id} onClick={() => setAdminActiveTicket(t)} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 cursor-pointer hover:border-red-600 transition-colors">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-2">
                        <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-500"><User className="w-5 h-5"/></div>
                        <div>
                          <h4 className="font-bold text-gray-900 text-sm leading-tight">{user?.name || 'Usuario'}</h4>
                          <span className="text-xs text-gray-500 capitalize">{user?.role}</span>
                        </div>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider ${t.status === 'open' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                        {t.status === 'open' ? 'Abierto' : 'Solucionado'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 font-medium line-clamp-2 bg-gray-50 p-3 rounded-xl border border-gray-100">
                      "{t.messages[t.messages.length - 1]?.text}"
                    </p>
                    <p className="text-xs text-gray-400 mt-4">{new Date(t.date).toLocaleString()}</p>
                  </div>
                );
              })}
              {state.supportTickets.length === 0 && (
                <div className="col-span-full text-center py-20 text-gray-400">
                  <CheckCircle className="w-16 h-16 mx-auto mb-4 opacity-30 text-green-500" />
                  <p className="text-lg">No hay tickets de soporte activos</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'ajustes' && (
          <div>
            <h2 className="text-3xl font-black text-gray-900 mb-8">Ajustes de la App</h2>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 max-w-2xl mb-8">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Settings className="w-5 h-5 text-gray-500"/> Leyenda de Cartera
              </h3>
              <textarea 
                className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none mb-4 min-h-[100px]"
                value={state.settings.walletLegend}
                onChange={e => dispatch({type: 'UPDATE_SETTINGS', payload: {walletLegend: e.target.value}})}
              />
              <p className="text-sm text-gray-500">Este texto es editable y aparecerá en el "Push Up" (modal) de la cartera tanto para pasajeros como conductores.</p>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 max-w-2xl">
              <h3 className="font-bold text-gray-900 mb-6 flex items-center gap-2">
                <Share2 className="w-5 h-5 text-gray-500"/> Programa Recomiéndanos
              </h3>
              
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl mb-6 border border-gray-200">
                <div>
                  <p className="font-bold text-gray-900">Activar recompensa de $10</p>
                  <p className="text-sm text-gray-500">Los usuarios ganarán $10 al compartir el link por WhatsApp.</p>
                </div>
                <button 
                  onClick={() => dispatch({type: 'UPDATE_SETTINGS', payload: {referralActive: !state.settings.referralActive}})}
                  className={`w-12 h-6 rounded-full transition-colors relative ${state.settings.referralActive ? 'bg-green-500' : 'bg-gray-300'}`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform shadow-sm ${state.settings.referralActive ? 'translate-x-6' : 'translate-x-0.5'}`}></div>
                </button>
              </div>

              <Input 
                label="Link de WhatsApp a compartir" 
                placeholder="Ej. https://wa.me/..."
                value={state.settings.whatsappLink}
                onChange={e => dispatch({type: 'UPDATE_SETTINGS', payload: {whatsappLink: e.target.value}})}
              />
            </div>
          </div>
        )}

        {/* User Detail Modal */}
        {selectedUser && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white p-8 rounded-3xl w-full max-w-lg relative">
              <button onClick={() => setSelectedUser(null)} className="absolute top-6 right-6 text-gray-400 hover:text-gray-900"><X /></button>
              
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center text-gray-500"><User className="w-8 h-8" /></div>
                <div>
                  <h3 className="text-2xl font-black text-gray-900">{selectedUser.name}</h3>
                  <p className="text-gray-500 capitalize">{selectedUser.role} • {selectedUser.status}</p>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-xl mb-6">
                <p className="text-sm text-gray-500 mb-1">Saldo Actual</p>
                <h4 className={`text-3xl font-black ${selectedUser.balance < 0 ? 'text-red-600' : 'text-green-600'}`}>
                  ${selectedUser.balance.toFixed(2)}
                </h4>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-bold text-gray-700 mb-1">Recargar / Descontar Cartera Manualmente</label>
                <p className="text-xs text-gray-500 mb-3">Puedes usar números positivos para inyectar saldo o números negativos (ej. -50) para generar saldo negativo o descontar.</p>
                <div className="flex gap-2">
                  <input 
                    type="number" 
                    value={balanceAdd} 
                    onChange={e => setBalanceAdd(e.target.value)}
                    placeholder="Monto (+ / -)" 
                    className="flex-1 p-3 bg-gray-50 border border-gray-200 rounded-xl"
                  />
                  <Button onClick={handleUpdateBalance} className="w-auto px-6">Aplicar</Button>
                </div>
              </div>

              {selectedUser.vehicle && (
                <div className="mb-6 border-t border-gray-100 pt-6">
                  <h4 className="font-bold text-gray-900 mb-2">Vehículo</h4>
                  <p className="text-gray-600">{selectedUser.vehicle}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <Button variant="outline" onClick={() => dispatch({type: 'CHANGE_STATUS', payload: {userId: selectedUser.id, status: 'blocked'}})}>
                  Bloquear Usuario
                </Button>
                <Button variant="secondary">Ver Documentos</Button>
              </div>
            </div>
          </div>
        )}

        {/* Admin Chat Support Modal */}
        {adminActiveTicket && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white p-0 rounded-3xl w-full max-w-2xl relative flex flex-col h-[80vh] overflow-hidden shadow-2xl">
              <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                <div>
                  <h3 className="text-xl font-black text-gray-900">Ticket de Soporte</h3>
                  <p className="text-sm text-gray-500">ID: {adminActiveTicket.id}</p>
                </div>
                <div className="flex gap-3">
                  {adminActiveTicket.status === 'open' && (
                    <Button onClick={handleResolveTicket} className="w-auto px-4 py-2 text-sm bg-green-600 hover:bg-green-700">
                      <Check className="w-4 h-4"/> Marcar Solucionado
                    </Button>
                  )}
                  <button onClick={() => setAdminActiveTicket(null)} className="p-2 bg-white rounded-full border border-gray-200 hover:bg-gray-100"><X /></button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4 bg-white">
                {state.supportTickets.find(t => t.id === adminActiveTicket.id)?.messages.map((msg, idx) => (
                  <div key={idx} className={`max-w-[70%] p-4 rounded-2xl ${msg.senderId === 'admin1' ? 'bg-red-600 text-white self-end rounded-br-sm' : 'bg-gray-100 text-gray-800 self-start rounded-bl-sm border border-gray-200'}`}>
                    <p className="text-sm">{msg.text}</p>
                    <p className={`text-[10px] mt-2 ${msg.senderId === 'admin1' ? 'text-red-200' : 'text-gray-400'}`}>{new Date(msg.date).toLocaleString()}</p>
                  </div>
                ))}
              </div>

              {state.supportTickets.find(t => t.id === adminActiveTicket.id)?.status === 'open' ? (
                <div className="p-6 bg-gray-50 border-t border-gray-100 flex gap-3">
                  <input 
                    type="text" 
                    value={adminReplyText}
                    onChange={e => setAdminReplyText(e.target.value)}
                    placeholder="Escribe la respuesta para el usuario..."
                    className="flex-1 p-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none"
                    onKeyDown={e => e.key === 'Enter' && handleAdminReply()}
                  />
                  <Button onClick={handleAdminReply} className="w-auto px-6"><Send className="w-5 h-5"/></Button>
                </div>
              ) : (
                <div className="p-6 bg-gray-50 border-t border-gray-100 text-center">
                  <p className="text-gray-500 font-bold flex items-center justify-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500"/> Conversación Finalizada y Solucionada
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// --- MAIN APP CONTAINER ---

export default function App() {
  const [state, dispatch] = useReducer(appReducer, initialData);
  const [showSplash, setShowSplash] = useState(true);

  if (showSplash) {
    return <SplashScreen onFinish={() => setShowSplash(false)} />;
  }

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {!state.currentUser ? (
        <AuthScreen />
      ) : state.currentUser.role === 'admin' ? (
        <AdminApp />
      ) : state.currentUser.role === 'driver' ? (
        <DriverApp />
      ) : (
        <PassengerApp />
      )}
    </AppContext.Provider>
  );
}