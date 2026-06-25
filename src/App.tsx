import { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, query, orderBy, doc, updateDoc, limit } from 'firebase/firestore';
import { db } from './firebase';
import { LocationType, ReportLocation } from './types';
import Map from './components/Map';
import AddLocationDialog from './components/AddLocationDialog';
import ClaimDonationDialog from './components/ClaimDonationDialog';
import { AlertTriangle, Home, Package, Share2, Search, Truck, MapPin, Wifi, UserX, CheckCircle, Building } from 'lucide-react';

import { motion } from 'framer-motion';

export default function App() {
  const [locations, setLocations] = useState<ReportLocation[]>([]); // state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);
  const [actionMenuType, setActionMenuType] = useState<LocationType>('shelter');
  const [dialogPreselectedType, setDialogPreselectedType] = useState<LocationType>('shelter');
  const [selectedCoords, setSelectedCoords] = useState<{lat: number, lng: number} | null>(null);
  const [filter, setFilter] = useState<'all' | 'shelter' | 'missing_person' | 'donation' | 'transport' | 'wifi' | 'collection_center'>('all');
  const [isAddingMode, setIsAddingMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [missingSearchQuery, setMissingSearchQuery] = useState('');
  const [collectionSearchQuery, setCollectionSearchQuery] = useState('');
  const [shelterSearchQuery, setShelterSearchQuery] = useState('');
  const [donationSearchQuery, setDonationSearchQuery] = useState('');
  const [transportSearchQuery, setTransportSearchQuery] = useState('');
  const [wifiSearchQuery, setWifiSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isSearchingMap, setIsSearchingMap] = useState(false);

  // Claim Donation State
  const [claimDialogOpen, setClaimDialogOpen] = useState(false);
  const [selectedDonation, setSelectedDonation] = useState<ReportLocation | null>(null);

  useEffect(() => {
    if (!searchQuery || searchQuery.trim().length < 3) {
      setSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearchingMap(true);
      try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=5&q=${encodeURIComponent(searchQuery + ' Venezuela')}`);
        const data = await response.json();
        setSuggestions(data || []);
      } catch (error) {
        console.error('Error fetching suggestions', error);
      } finally {
        setIsSearchingMap(false);
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSuggestionClick = (feature: any) => {
    const lat = parseFloat(feature.lat);
    const lng = parseFloat(feature.lon);
    const name = feature.display_name.split(',')[0];
    setSearchQuery(name);
    setSuggestions([]);
    setSelectedCoords({ lat, lng });
  };

  useEffect(() => {
    const q = query(collection(db, 'locations'), orderBy('createdAt', 'desc'), limit(500));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const locs: ReportLocation[] = [];
      snapshot.forEach((doc) => {
        locs.push({ id: doc.id, ...doc.data() } as ReportLocation);
      });
      setLocations(locs);
    }, (error) => {
      console.error("Firestore Error: ", error);
      const errInfo = {
        error: error instanceof Error ? error.message : String(error),
        operationType: 'list',
        path: 'locations',
        authInfo: {
          userId: null,
          email: null,
          emailVerified: null,
          isAnonymous: null,
          tenantId: null,
          providerInfo: []
        }
      };
      throw new Error(JSON.stringify(errInfo));
    });

    return () => unsubscribe();
  }, []);

  const handleActionClick = (type: LocationType) => {
    setDialogPreselectedType(type);
    setSelectedCoords(null);
    setIsAddingMode(false);
    setIsDialogOpen(true);
  };

  const handleMapClick = (lat: number, lng: number) => {
    if (isAddingMode) {
      setSelectedCoords({ lat, lng });
      setIsDialogOpen(true);
      setIsAddingMode(false);
    }
  };

  const handleAddSubmit = async (data: any) => {
    try {
      await addDoc(collection(db, 'locations'), {
        ...data,
        createdAt: Date.now()
      });
      setIsDialogOpen(false);
      setSelectedCoords(null);
    } catch (error) {
      console.error("Firestore Error: ", error);
      const errInfo = {
        error: error instanceof Error ? error.message : String(error),
        operationType: 'create',
        path: 'locations',
        authInfo: {
          userId: null,
          email: null,
          emailVerified: null,
          isAnonymous: null,
          tenantId: null,
          providerInfo: []
        }
      };
      throw new Error(JSON.stringify(errInfo));
    }
  };

  const handleClaimDonation = (donation: ReportLocation) => {
    setSelectedDonation(donation);
    setClaimDialogOpen(true);
  };

  const handleClaimSubmit = async (data: any) => {
    try {
      await addDoc(collection(db, 'claims'), {
        ...data,
        createdAt: Date.now()
      });
      alert('Tu solicitud ha sido enviada exitosamente. Nos contactaremos pronto.');
      setClaimDialogOpen(false);
      setSelectedDonation(null);
    } catch (error) {
      console.error("Firestore Error: ", error);
      alert('Hubo un error al enviar tu solicitud. Intenta nuevamente.');
    }
  };

  const handleUpdateMissingStatus = async (id: string, newStatus: 'missing' | 'found') => {
    try {
      const docRef = doc(db, 'locations', id);
      await updateDoc(docRef, { status: newStatus });
      alert(newStatus === 'found' ? '¡Qué buena noticia! Marcado como encontrado.' : 'Estado actualizado a desaparecido.');
    } catch (error) {
      console.error("Error updating status: ", error);
      alert("No se pudo actualizar el estado.");
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Red de Ayuda Venezuela',
          text: 'Reporta emergencias y encuentra refugios o donaciones en tiempo real.',
          url: window.location.href,
        });
      } catch (err) {
        console.error('Error sharing', err);
      }
    } else {
      alert('Copia este enlace para compartir: ' + window.location.href);
    }
  };

  const filteredLocations = locations.filter(loc => {
    const matchesFilter = filter === 'all' || loc.type === filter;
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = !searchQuery || 
                          loc.title.toLowerCase().includes(searchLower) || 
                          loc.description.toLowerCase().includes(searchLower);
    return matchesFilter && matchesSearch;
  });
  
  const stats = {
    shelters: locations.filter(l => l.type === 'shelter').length,
    missing: locations.filter(l => l.type === 'missing_person').length,
    donations: locations.filter(l => l.type === 'donation').length,
    transports: locations.filter(l => l.type === 'transport').length,
    wifi: locations.filter(l => l.type === 'wifi').length,
    collection_centers: locations.filter(l => l.type === 'collection_center').length
  };

  return (
    <div className="bg-slate-100 text-slate-900 flex flex-col min-h-screen p-4 md:p-6 font-sans max-w-screen-2xl mx-auto w-full">
      <header className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4 shrink-0 bg-white/80 backdrop-blur-md p-4 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-yellow-400 via-blue-500 to-red-600 blur-lg opacity-80 rounded-xl"></div>
            <div className="relative w-14 h-14 bg-gradient-to-br from-yellow-400 via-blue-500 to-red-600 rounded-xl flex items-center justify-center text-white font-black text-3xl shadow-[0_0_15px_rgba(250,204,21,0.6)] border border-white/30">V</div>
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight">Red de Ayuda <span className="text-red-600">Venezuela</span></h1>
            <p className="text-[10px] sm:text-xs text-slate-500 uppercase tracking-widest font-bold mt-0.5">Reportes y Donaciones en Tiempo Real</p>
          </div>
        </div>
        <div className="flex gap-2">
          <a
            href={`https://wa.me/?text=${encodeURIComponent('Red de Ayuda Venezuela: Reporta emergencias y encuentra refugios o donaciones en tiempo real. ' + window.location.href)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center w-10 h-10 bg-[#25D366] text-white rounded-xl hover:bg-[#128C7E] transition-colors shadow-sm"
            title="Compartir en WhatsApp"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>
          </a>
          <a
            href={`https://t.me/share/url?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent('Red de Ayuda Venezuela: Reporta emergencias y encuentra refugios o donaciones en tiempo real.')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center w-10 h-10 bg-[#0088cc] text-white rounded-xl hover:bg-[#0077b5] transition-colors shadow-sm"
            title="Compartir en Telegram"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M12 24c6.627 0 12-5.373 12-12S18.627 0 12 0 0 5.373 0 12s5.373 12 12 12zm5.894-17.535l-14.73 5.683c-1.312.527-1.303 1.258-.242 1.583l3.774 1.18 8.736-5.508c.412-.255.79-.118.476.16l-7.08 6.39-.271 4.045c.397 0 .57-.182.79-.396l1.897-1.846 3.947 2.915c.728.403 1.252.196 1.433-.687l2.593-12.213c.253-1.135-.429-1.648-1.323-1.31z"/></svg>
          </a>
          <a
            href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center w-10 h-10 bg-[#1877F2] text-white rounded-xl hover:bg-[#166FE5] transition-colors shadow-sm"
            title="Compartir en Facebook"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
          </a>
          <a
            href="https://www.instagram.com/"
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => {
              try {
                navigator.clipboard.writeText('Red de Ayuda Venezuela: ' + window.location.href);
                alert('Enlace copiado al portapapeles. Pégalo en tu historia o publicación de Instagram.');
              } catch (err) {
                console.error(err);
              }
            }}
            className="flex items-center justify-center w-10 h-10 bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888] text-white rounded-xl hover:opacity-90 transition-opacity shadow-sm"
            title="Copiar enlace y abrir Instagram"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
          </a>
        </div>
      </header>

      <div className="flex flex-col pb-4 md:pb-0 gap-4 flex-1">
        
        {/* Action Buttons at the Top */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, staggerChildren: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 shrink-0"
        >
          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              setActionMenuType('collection_center');
              setIsActionMenuOpen(true);
            }}
            className="bg-indigo-600 border-2 border-indigo-500 rounded-2xl p-4 transition-shadow text-left flex flex-col group shadow-lg hover:shadow-xl"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-white/20 text-white rounded-full flex items-center justify-center shrink-0">
                <Building className="w-5 h-5 group-hover:scale-110 transition-transform" />
              </div>
              <p className="font-bold text-white text-[13px] sm:text-[15px] leading-tight">Centro de Acopio</p>
            </div>
            <p className="text-[10px] text-indigo-100 font-medium">Recolección y entrega</p>
          </motion.button>

          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              setActionMenuType('shelter');
              setIsActionMenuOpen(true);
            }}
            className="bg-green-600 border-2 border-green-500 rounded-2xl p-4 transition-shadow text-left flex flex-col group shadow-lg hover:shadow-xl"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-white/20 text-white rounded-full flex items-center justify-center shrink-0">
                <Home className="w-5 h-5 group-hover:scale-110 transition-transform" />
              </div>
              <p className="font-bold text-white text-[13px] sm:text-[15px] leading-tight">Ofrecer Refugio</p>
            </div>
            <p className="text-[10px] text-green-100 font-medium">Alojamiento y ayuda</p>
          </motion.button>
          
          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              setActionMenuType('donation');
              setIsActionMenuOpen(true);
            }}
            className="bg-blue-600 border-2 border-blue-500 rounded-2xl p-4 transition-shadow text-left flex flex-col group shadow-lg hover:shadow-xl"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-white/20 text-white rounded-full flex items-center justify-center shrink-0">
                <Package className="w-5 h-5 group-hover:scale-110 transition-transform" />
              </div>
              <p className="font-bold text-white text-[13px] sm:text-[15px] leading-tight">Ofrecer Donación</p>
            </div>
            <p className="text-[10px] text-blue-100 font-medium">Comida, Agua, Insumos</p>
          </motion.button>

          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              setActionMenuType('transport');
              setIsActionMenuOpen(true);
            }}
            className="bg-purple-600 border-2 border-purple-500 rounded-2xl p-4 transition-shadow text-left flex flex-col group shadow-lg hover:shadow-xl"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-white/20 text-white rounded-full flex items-center justify-center shrink-0">
                <Truck className="w-5 h-5 group-hover:scale-110 transition-transform" />
              </div>
              <p className="font-bold text-white text-[13px] sm:text-[15px] leading-tight">Ofrecer Transporte</p>
            </div>
            <p className="text-[10px] text-purple-100 font-medium">Traslado de insumos o personas</p>
          </motion.button>

          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              setActionMenuType('wifi');
              setIsActionMenuOpen(true);
            }}
            className="bg-orange-600 border-2 border-orange-500 rounded-2xl p-4 transition-shadow text-left flex flex-col group shadow-lg hover:shadow-xl"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-white/20 text-white rounded-full flex items-center justify-center shrink-0">
                <Wifi className="w-5 h-5 group-hover:scale-110 transition-transform" />
              </div>
              <p className="font-bold text-white text-[13px] sm:text-[15px] leading-tight">Centro WiFi</p>
            </div>
            <p className="text-[10px] text-orange-100 font-medium">Punto de conexión a internet</p>
          </motion.button>

          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              setActionMenuType('missing_person');
              setIsActionMenuOpen(true);
            }}
            className="bg-red-600 border-2 border-red-500 rounded-2xl p-4 transition-shadow text-left flex flex-col group shadow-lg hover:shadow-xl"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-white/20 text-white rounded-full flex items-center justify-center shrink-0">
                <UserX className="w-5 h-5 group-hover:scale-110 transition-transform" />
              </div>
              <p className="font-bold text-white text-[13px] sm:text-[15px] leading-tight">Desaparecido</p>
            </div>
            <p className="text-[10px] text-red-100 font-medium">Reportar o buscar persona</p>
          </motion.button>
        </motion.div>

        {/* Main Content Area (Map + Search + List) */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-4 min-h-[500px] md:min-h-0">
          
          {/* Map Column */}
          <div className="md:col-span-8 flex flex-col gap-4">
            {/* Search Bar */}
            <div className="relative shrink-0 z-[1000]">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-slate-400" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border-2 border-slate-200 text-slate-900 rounded-xl pl-12 pr-4 py-3 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
                placeholder="Buscar por dirección, nombre del refugio o descripción de la emergencia..."
              />
              {isSearchingMap && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                  <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}
              {suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden z-[2000]">
                  {suggestions.map((feature, i) => {
                    const addressString = feature.display_name;
                    return (
                      <button
                        key={i}
                        onClick={() => handleSuggestionClick(feature)}
                        className="w-full text-left px-4 py-3 hover:bg-slate-50 border-b border-slate-100 last:border-0 transition-colors flex items-center gap-3"
                      >
                        <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                        <span className="text-sm font-medium text-slate-700 truncate">{addressString}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Map Area */}
            <div className="bg-white border-2 border-slate-200 rounded-[2rem] overflow-hidden relative shadow-sm flex-1 min-h-[400px]">
              <Map 
                locations={filteredLocations.filter(l => filter === 'all' ? l.type !== 'missing_person' : true)} 
                onMapClick={handleMapClick}
                selectedLocation={selectedCoords}
                onClaimDonation={handleClaimDonation}
              />
              <div className="absolute bottom-6 left-6 flex gap-2 z-[1000] pointer-events-none flex-wrap">
                <span 
                  onClick={(e) => { e.stopPropagation(); setFilter('all'); }} 
                  className={`pointer-events-auto cursor-pointer px-4 py-2 rounded-full shadow-md text-[10px] sm:text-xs font-bold uppercase border-2 transition-colors ${filter === 'all' ? 'bg-slate-800 text-white border-slate-900' : 'bg-white border-slate-400 text-slate-700 hover:bg-slate-50'}`}
                >
                  Todos
                </span>
                <span 
                  onClick={(e) => { e.stopPropagation(); setFilter('missing_person'); }} 
                  className={`pointer-events-auto cursor-pointer px-4 py-2 rounded-full shadow-md text-[10px] sm:text-xs font-bold uppercase border-2 transition-colors ${filter === 'missing_person' ? 'bg-red-600 text-white border-red-700' : 'bg-white border-red-500 text-red-700 hover:bg-red-50'}`}
                >
                  Desaparecidos
                </span>
                <span 
                  onClick={(e) => { e.stopPropagation(); setFilter('shelter'); }} 
                  className={`pointer-events-auto cursor-pointer px-4 py-2 rounded-full shadow-md text-[10px] sm:text-xs font-bold uppercase border-2 transition-colors ${filter === 'shelter' ? 'bg-green-600 text-white border-green-700' : 'bg-white border-green-500 text-green-700 hover:bg-green-50'}`}
                >
                  Refugios
                </span>
                <span 
                  onClick={(e) => { e.stopPropagation(); setFilter('donation'); }} 
                  className={`pointer-events-auto cursor-pointer px-4 py-2 rounded-full shadow-md text-[10px] sm:text-xs font-bold uppercase border-2 transition-colors ${filter === 'donation' ? 'bg-blue-600 text-white border-blue-700' : 'bg-white border-blue-500 text-blue-700 hover:bg-blue-50'}`}
                >
                  Donaciones
                </span>
                <span 
                  onClick={(e) => { e.stopPropagation(); setFilter('transport'); }} 
                  className={`pointer-events-auto cursor-pointer px-4 py-2 rounded-full shadow-md text-[10px] sm:text-xs font-bold uppercase border-2 transition-colors ${filter === 'transport' ? 'bg-purple-600 text-white border-purple-700' : 'bg-white border-purple-500 text-purple-700 hover:bg-purple-50'}`}
                >
                  Transporte
                </span>
                <span 
                  onClick={(e) => { e.stopPropagation(); setFilter('wifi'); }} 
                  className={`pointer-events-auto cursor-pointer px-4 py-2 rounded-full shadow-md text-[10px] sm:text-xs font-bold uppercase border-2 transition-colors ${filter === 'wifi' ? 'bg-orange-600 text-white border-orange-700' : 'bg-white border-orange-500 text-orange-700 hover:bg-orange-50'}`}
                >
                  WiFi
                </span>
                <span 
                  onClick={(e) => { e.stopPropagation(); setFilter('collection_center'); }} 
                  className={`pointer-events-auto cursor-pointer px-4 py-2 rounded-full shadow-md text-[10px] sm:text-xs font-bold uppercase border-2 transition-colors ${filter === 'collection_center' ? 'bg-indigo-600 text-white border-indigo-700' : 'bg-white border-indigo-500 text-indigo-700 hover:bg-indigo-50'}`}
                >
                  Acopio
                </span>
              </div>
              {isAddingMode && (
                <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur px-6 py-3 rounded-full shadow-xl border-2 border-blue-400 z-[1000] text-sm font-bold text-blue-700 animate-pulse pointer-events-none">
                  Haz clic en el mapa para ubicar tu reporte
                </div>
              )}
            </div>
          </div>

          {/* Sidebar Lists */}
          <div className="md:col-span-4 flex flex-col gap-4 overflow-hidden">
            {/* Impacto Total */}
            <div className="bg-slate-900 text-white rounded-2xl p-4 sm:p-6 shadow-md shrink-0 flex flex-row items-center justify-between">
              <div>
                <p className="text-[10px] text-slate-400 font-bold tracking-widest uppercase mb-1">Total de Reportes</p>
                <h4 className="text-2xl sm:text-3xl font-bold">{locations.length}</h4>
              </div>
              <div className="flex flex-col items-end gap-1 text-xs text-slate-300 font-medium">
                <span className="flex items-center gap-2"><span className="w-2 h-2 bg-indigo-400 rounded-full"></span> {stats.collection_centers} Centros de Acopio</span>
                <span className="flex items-center gap-2"><span className="w-2 h-2 bg-green-400 rounded-full"></span> {stats.shelters} Refugios</span>
                <span className="flex items-center gap-2"><span className="w-2 h-2 bg-blue-400 rounded-full"></span> {stats.donations} Donaciones</span>
                <span className="flex items-center gap-2"><span className="w-2 h-2 bg-purple-400 rounded-full"></span> {stats.transports} Transportes</span>
                <span className="flex items-center gap-2"><span className="w-2 h-2 bg-red-400 rounded-full"></span> {stats.missing} Desaparecidos</span>
                <span className="flex items-center gap-2"><span className="w-2 h-2 bg-orange-400 rounded-full"></span> {stats.wifi} Centros WiFi</span>
              </div>
            </div>

            {/* List container */}
            <div className="flex-1 overflow-y-auto pr-2 space-y-4">
              {/* Desaparecidos Recientes */}
              {(filter === 'all' || filter === 'missing_person') && (
                <div className="bg-white border border-red-100 rounded-2xl p-4 shadow-sm flex flex-col">
                  <div className="flex justify-between items-center mb-3 shrink-0">
                    <h2 className="font-bold text-slate-800 flex items-center gap-2"><UserX className="w-4 h-4 text-red-500" /> Desaparecidos</h2>
                    <span className="text-[10px] bg-red-50 text-red-600 px-2 py-0.5 rounded-full font-bold animate-pulse">URGENTE</span>
                  </div>
                  <div className="space-y-3">
                    {filteredLocations.filter(l => l.type === 'missing_person').slice(0, 10).map((loc, i) => (
                      <motion.div 
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        key={loc.id} 
                        className={`border-l-4 pl-3 py-1 rounded-r-lg transition-colors cursor-pointer ${loc.status === 'found' ? 'border-green-500 bg-green-50 hover:bg-green-100' : 'border-red-500 bg-red-50/30 hover:bg-red-50/60'}`}
                        onClick={() => setSelectedCoords({ lat: loc.lat, lng: loc.lng })}
                      >
                        <div className="flex justify-between items-start">
                          <p className="text-xs font-bold text-slate-800">{loc.title}</p>
                          {loc.status === 'found' ? (
                            <span className="text-[9px] bg-green-100 text-green-700 px-1 rounded font-bold">ENCONTRADO</span>
                          ) : (
                            <span className="text-[9px] bg-red-100 text-red-700 px-1 rounded font-bold">DESAPARECIDO</span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-600 mt-1 leading-snug line-clamp-2">{loc.description}</p>
                        <p className="text-[9px] text-slate-400 mt-1 font-medium">{new Date(loc.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                      </motion.div>
                    ))}
                    {filteredLocations.filter(l => l.type === 'missing_person').length === 0 && (
                       <p className="text-xs text-slate-400 italic">No hay reportes de personas desaparecidas.</p>
                    )}
                  </div>
                </div>
              )}

              {/* Refugios y Ayudas */}
              {(filter === 'all' || filter === 'shelter' || filter === 'donation' || filter === 'transport' || filter === 'wifi' || filter === 'collection_center') && (
                <div className={`bg-white border rounded-2xl p-4 shadow-sm flex flex-col ${filter === 'shelter' ? 'border-green-100' : filter === 'donation' ? 'border-blue-100' : filter === 'transport' ? 'border-purple-100' : filter === 'wifi' ? 'border-orange-100' : filter === 'collection_center' ? 'border-indigo-100' : 'border-slate-100'}`}>
                  <div className="flex justify-between items-center mb-3 shrink-0">
                    <h2 className="font-bold text-slate-800 flex items-center gap-2">
                      {filter === 'shelter' ? <><Home className="w-4 h-4 text-green-500" /> Refugios</> : 
                       filter === 'donation' ? <><Package className="w-4 h-4 text-blue-500" /> Donaciones</> : 
                       filter === 'transport' ? <><Truck className="w-4 h-4 text-purple-500" /> Transporte</> : 
                       filter === 'wifi' ? <><Wifi className="w-4 h-4 text-orange-500" /> WiFi / Starlink</> : 
                       filter === 'collection_center' ? <><Building className="w-4 h-4 text-indigo-500" /> Centros de Acopio</> :
                       <><Home className="w-4 h-4 text-green-500" /> Ayudas y Acopio</>}
                    </h2>
                  </div>
                  <div className="space-y-2">
                    {filteredLocations.filter(l => l.type === 'shelter' || l.type === 'donation' || l.type === 'transport' || l.type === 'wifi' || l.type === 'collection_center').slice(0, 15).map((loc, i) => (
                      <motion.div 
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        key={loc.id} 
                        className={`flex items-center gap-3 p-2 rounded-xl border hover:shadow-md transition-all cursor-pointer ${loc.type === 'shelter' ? 'bg-green-50/50 border-green-100 hover:bg-green-50' : loc.type === 'transport' ? 'bg-purple-50/50 border-purple-100 hover:bg-purple-50' : loc.type === 'wifi' ? 'bg-orange-50/50 border-orange-100 hover:bg-orange-50' : loc.type === 'collection_center' ? 'bg-indigo-50/50 border-indigo-100 hover:bg-indigo-50' : 'bg-blue-50/50 border-blue-100 hover:bg-blue-50'}`}
                        onClick={() => setSelectedCoords({ lat: loc.lat, lng: loc.lng })}
                      >
                        <div className={`w-8 h-8 shrink-0 rounded-lg flex items-center justify-center font-bold text-xs uppercase shadow-sm ${loc.type === 'shelter' ? 'bg-green-100 text-green-600' : loc.type === 'transport' ? 'bg-purple-100 text-purple-600' : loc.type === 'wifi' ? 'bg-orange-100 text-orange-600' : loc.type === 'collection_center' ? 'bg-indigo-100 text-indigo-600' : 'bg-blue-100 text-blue-600'}`}>
                          {loc.type === 'shelter' ? <Home className="w-4 h-4" /> : loc.type === 'transport' ? <Truck className="w-4 h-4" /> : loc.type === 'wifi' ? <Wifi className="w-4 h-4" /> : loc.type === 'collection_center' ? <Building className="w-4 h-4" /> : <Package className="w-4 h-4" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-slate-800 truncate">{loc.title}</p>
                          <p className="text-[10px] text-slate-500 font-medium truncate mt-0.5">
                            {loc.type === 'shelter' ? (loc.capacity ? `${loc.capacity} Cupos` : 'Refugio') : loc.type === 'transport' ? 'Transporte' : loc.type === 'wifi' ? 'WiFi' : loc.type === 'collection_center' ? 'Centro de Acopio' : 'Donación'} • {new Date(loc.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </p>
                        </div>
                      </motion.div>
                    ))}
                     {filteredLocations.filter(l => l.type === 'shelter' || l.type === 'donation' || l.type === 'transport' || l.type === 'wifi' || l.type === 'collection_center').length === 0 && (
                       <p className="text-xs text-slate-400 italic">No hay ayudas disponibles que coincidan con tu búsqueda.</p>
                    )}
                  </div>
                </div>
              )}
            </div>

          </div>

        </div>

      </div>

      {/* Buscador de Personas Desaparecidas */}
      <div id="missing-person-search" className="mt-8 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm shrink-0">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center shrink-0">
              <UserX className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">Buscador de Personas Desaparecidas</h2>
              <p className="text-sm text-slate-500">Busca por nombre, apellido, zona o edificio.</p>
            </div>
          </div>
          <div className="w-full md:w-96 relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Buscar persona..." 
              value={missingSearchQuery}
              onChange={(e) => setMissingSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 transition-shadow"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {locations
            .filter(l => l.type === 'missing_person' && (
              !missingSearchQuery || 
              l.title.toLowerCase().includes(missingSearchQuery.toLowerCase()) || 
              l.description.toLowerCase().includes(missingSearchQuery.toLowerCase())
            ))
            .slice(0, missingSearchQuery ? undefined : 20)
            .map((loc) => (
              <div key={loc.id} className="border rounded-xl p-4 flex flex-col justify-between bg-slate-50 relative overflow-hidden">
                <div className={`absolute top-0 left-0 w-1 h-full ${loc.status === 'found' ? 'bg-green-500' : 'bg-red-500'}`} />
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-slate-800 text-sm">{loc.title}</h3>
                    {loc.status === 'found' ? (
                      <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold whitespace-nowrap">Encontrado</span>
                    ) : (
                      <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold whitespace-nowrap">Desaparecido</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 mb-3 line-clamp-3">{loc.description}</p>
                </div>
                <div className="flex flex-col gap-2 mt-auto">
                  <p className="text-[10px] text-slate-400 font-medium mb-1">{new Date(loc.createdAt).toLocaleDateString()} {new Date(loc.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                  {loc.status !== 'found' && (
                    <button 
                      onClick={() => handleUpdateMissingStatus(loc.id, 'found')}
                      className="w-full py-1.5 flex items-center justify-center gap-1 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg text-[10px] font-bold uppercase transition-colors border border-green-200"
                    >
                      <CheckCircle className="w-3 h-3" />
                      Marcar Encontrado
                    </button>
                  )}
                </div>
              </div>
            ))}
          {locations.filter(l => l.type === 'missing_person').length === 0 && (
            <div className="col-span-full py-8 text-center text-slate-500 italic">No hay reportes de desaparecidos.</div>
          )}
        </div>
      </div>

      {/* Buscador de Centros de Acopio */}
      <div id="collection-center-search" className="mt-8 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm shrink-0">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center shrink-0">
              <Building className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">Buscador de Centros de Acopio</h2>
              <p className="text-sm text-slate-500">Busca por nombre, descripción, estado, municipio o localidad.</p>
            </div>
          </div>
          <div className="w-full md:w-96 relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Buscar centro de acopio..." 
              value={collectionSearchQuery}
              onChange={(e) => setCollectionSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {locations
            .filter(l => l.type === 'collection_center' && (
              !collectionSearchQuery || 
              l.title.toLowerCase().includes(collectionSearchQuery.toLowerCase()) || 
              l.description.toLowerCase().includes(collectionSearchQuery.toLowerCase()) ||
              (l.address && l.address.toLowerCase().includes(collectionSearchQuery.toLowerCase()))
            ))
            .slice(0, collectionSearchQuery ? undefined : 20)
            .map((loc) => (
              <div key={loc.id} className="border border-indigo-100 rounded-xl p-4 flex flex-col justify-between bg-indigo-50/30 hover:bg-indigo-50/50 transition-colors relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500" />
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-slate-800 text-sm line-clamp-2">{loc.title}</h3>
                  </div>
                  <p className="text-xs text-slate-600 mb-3 line-clamp-3">{loc.description}</p>
                </div>
                <div className="flex flex-col gap-2 mt-auto">
                  {loc.address && (
                    <div className="flex gap-1 items-start text-xs text-slate-500 bg-white/50 p-2 rounded">
                      <MapPin className="w-3 h-3 shrink-0 mt-0.5 text-indigo-400" />
                      <span className="line-clamp-2">{loc.address}</span>
                    </div>
                  )}
                  {loc.contact && (
                    <div className="flex gap-1 items-center text-xs text-slate-500">
                      <span className="font-semibold">Contacto:</span> {loc.contact}
                    </div>
                  )}
                  <p className="text-[10px] text-slate-400 font-medium mt-1">{new Date(loc.createdAt).toLocaleDateString()} {new Date(loc.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                </div>
              </div>
            ))}
          {locations.filter(l => l.type === 'collection_center').length === 0 && (
            <div className="col-span-full py-8 text-center text-slate-500 italic">No hay centros de acopio registrados.</div>
          )}
        </div>
      </div>

      {/* Buscador de Refugios */}
      <div id="shelter-search" className="mt-8 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm shrink-0">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center shrink-0">
              <Home className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">Buscador de Refugios</h2>
              <p className="text-sm text-slate-500">Busca refugios por nombre, descripción o ubicación.</p>
            </div>
          </div>
          <div className="w-full md:w-96 relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Buscar refugio..." 
              value={shelterSearchQuery}
              onChange={(e) => setShelterSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 transition-shadow"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {locations
            .filter(l => l.type === 'shelter' && (
              !shelterSearchQuery || 
              l.title.toLowerCase().includes(shelterSearchQuery.toLowerCase()) || 
              l.description.toLowerCase().includes(shelterSearchQuery.toLowerCase()) ||
              (l.address && l.address.toLowerCase().includes(shelterSearchQuery.toLowerCase()))
            ))
            .slice(0, shelterSearchQuery ? undefined : 20)
            .map((loc) => (
              <div key={loc.id} className="border border-green-100 rounded-xl p-4 flex flex-col justify-between bg-green-50/30 hover:bg-green-50/50 transition-colors relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-green-500" />
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-slate-800 text-sm line-clamp-2">{loc.title}</h3>
                  </div>
                  <p className="text-xs text-slate-600 mb-3 line-clamp-3">{loc.description}</p>
                </div>
                <div className="flex flex-col gap-2 mt-auto">
                  {loc.capacity && (
                     <div className="flex gap-1 items-center text-xs text-green-700 bg-green-100 p-1 px-2 rounded-full w-max font-bold mb-1">
                       Cupos: {loc.capacity}
                     </div>
                  )}
                  {loc.address && (
                    <div className="flex gap-1 items-start text-xs text-slate-500 bg-white/50 p-2 rounded">
                      <MapPin className="w-3 h-3 shrink-0 mt-0.5 text-green-400" />
                      <span className="line-clamp-2">{loc.address}</span>
                    </div>
                  )}
                  {loc.contact && (
                    <div className="flex gap-1 items-center text-xs text-slate-500">
                      <span className="font-semibold">Contacto:</span> {loc.contact}
                    </div>
                  )}
                  <p className="text-[10px] text-slate-400 font-medium mt-1">{new Date(loc.createdAt).toLocaleDateString()} {new Date(loc.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                </div>
              </div>
            ))}
          {locations.filter(l => l.type === 'shelter').length === 0 && (
            <div className="col-span-full py-8 text-center text-slate-500 italic">No hay refugios registrados.</div>
          )}
        </div>
      </div>

      {/* Buscador de Donaciones */}
      <div id="donation-search" className="mt-8 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm shrink-0">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center shrink-0">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">Buscador de Donaciones</h2>
              <p className="text-sm text-slate-500">Busca donaciones por tipo, descripción o ubicación.</p>
            </div>
          </div>
          <div className="w-full md:w-96 relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Buscar donaciones..." 
              value={donationSearchQuery}
              onChange={(e) => setDonationSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {locations
            .filter(l => l.type === 'donation' && (
              !donationSearchQuery || 
              l.title.toLowerCase().includes(donationSearchQuery.toLowerCase()) || 
              l.description.toLowerCase().includes(donationSearchQuery.toLowerCase()) ||
              (l.address && l.address.toLowerCase().includes(donationSearchQuery.toLowerCase()))
            ))
            .slice(0, donationSearchQuery ? undefined : 20)
            .map((loc) => (
              <div key={loc.id} className="border border-blue-100 rounded-xl p-4 flex flex-col justify-between bg-blue-50/30 hover:bg-blue-50/50 transition-colors relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-blue-500" />
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-slate-800 text-sm line-clamp-2">{loc.title}</h3>
                  </div>
                  <p className="text-xs text-slate-600 mb-3 line-clamp-3">{loc.description}</p>
                </div>
                <div className="flex flex-col gap-2 mt-auto">
                  {loc.donationCategory && (
                     <div className="flex gap-1 items-center text-xs text-blue-700 bg-blue-100 p-1 px-2 rounded-full w-max font-bold mb-1">
                       {loc.donationCategory === 'food' ? 'Comida' : loc.donationCategory === 'water' ? 'Agua' : loc.donationCategory === 'medicine' ? 'Medicinas' : 'Ropa/Otros'}
                     </div>
                  )}
                  {loc.address && (
                    <div className="flex gap-1 items-start text-xs text-slate-500 bg-white/50 p-2 rounded">
                      <MapPin className="w-3 h-3 shrink-0 mt-0.5 text-blue-400" />
                      <span className="line-clamp-2">{loc.address}</span>
                    </div>
                  )}
                  {loc.contact && (
                    <div className="flex gap-1 items-center text-xs text-slate-500">
                      <span className="font-semibold">Contacto:</span> {loc.contact}
                    </div>
                  )}
                  <p className="text-[10px] text-slate-400 font-medium mt-1">{new Date(loc.createdAt).toLocaleDateString()} {new Date(loc.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                </div>
              </div>
            ))}
          {locations.filter(l => l.type === 'donation').length === 0 && (
            <div className="col-span-full py-8 text-center text-slate-500 italic">No hay donaciones registradas.</div>
          )}
        </div>
      </div>

      {/* Buscador de Transporte */}
      <div id="transport-search" className="mt-8 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm shrink-0">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center shrink-0">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">Buscador de Transporte</h2>
              <p className="text-sm text-slate-500">Busca transporte disponible por descripción o ubicación.</p>
            </div>
          </div>
          <div className="w-full md:w-96 relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Buscar transporte..." 
              value={transportSearchQuery}
              onChange={(e) => setTransportSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 transition-shadow"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {locations
            .filter(l => l.type === 'transport' && (
              !transportSearchQuery || 
              l.title.toLowerCase().includes(transportSearchQuery.toLowerCase()) || 
              l.description.toLowerCase().includes(transportSearchQuery.toLowerCase()) ||
              (l.address && l.address.toLowerCase().includes(transportSearchQuery.toLowerCase()))
            ))
            .slice(0, transportSearchQuery ? undefined : 20)
            .map((loc) => (
              <div key={loc.id} className="border border-purple-100 rounded-xl p-4 flex flex-col justify-between bg-purple-50/30 hover:bg-purple-50/50 transition-colors relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-purple-500" />
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-slate-800 text-sm line-clamp-2">{loc.title}</h3>
                  </div>
                  <p className="text-xs text-slate-600 mb-3 line-clamp-3">{loc.description}</p>
                </div>
                <div className="flex flex-col gap-2 mt-auto">
                  {loc.address && (
                    <div className="flex gap-1 items-start text-xs text-slate-500 bg-white/50 p-2 rounded">
                      <MapPin className="w-3 h-3 shrink-0 mt-0.5 text-purple-400" />
                      <span className="line-clamp-2">{loc.address}</span>
                    </div>
                  )}
                  {loc.contact && (
                    <div className="flex gap-1 items-center text-xs text-slate-500">
                      <span className="font-semibold">Contacto:</span> {loc.contact}
                    </div>
                  )}
                  <p className="text-[10px] text-slate-400 font-medium mt-1">{new Date(loc.createdAt).toLocaleDateString()} {new Date(loc.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                </div>
              </div>
            ))}
          {locations.filter(l => l.type === 'transport').length === 0 && (
            <div className="col-span-full py-8 text-center text-slate-500 italic">No hay transportes registrados.</div>
          )}
        </div>
      </div>

      {/* Buscador de Centros WiFi */}
      <div id="wifi-search" className="mt-8 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm shrink-0">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center shrink-0">
              <Wifi className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">Buscador de Centros WiFi</h2>
              <p className="text-sm text-slate-500">Busca puntos de conexión a internet o llamadas.</p>
            </div>
          </div>
          <div className="w-full md:w-96 relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Buscar puntos WiFi..." 
              value={wifiSearchQuery}
              onChange={(e) => setWifiSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 transition-shadow"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {locations
            .filter(l => l.type === 'wifi' && (
              !wifiSearchQuery || 
              l.title.toLowerCase().includes(wifiSearchQuery.toLowerCase()) || 
              l.description.toLowerCase().includes(wifiSearchQuery.toLowerCase()) ||
              (l.address && l.address.toLowerCase().includes(wifiSearchQuery.toLowerCase()))
            ))
            .slice(0, wifiSearchQuery ? undefined : 20)
            .map((loc) => (
              <div key={loc.id} className="border border-orange-100 rounded-xl p-4 flex flex-col justify-between bg-orange-50/30 hover:bg-orange-50/50 transition-colors relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-orange-500" />
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-slate-800 text-sm line-clamp-2">{loc.title}</h3>
                  </div>
                  <p className="text-xs text-slate-600 mb-3 line-clamp-3">{loc.description}</p>
                </div>
                <div className="flex flex-col gap-2 mt-auto">
                  {loc.address && (
                    <div className="flex gap-1 items-start text-xs text-slate-500 bg-white/50 p-2 rounded">
                      <MapPin className="w-3 h-3 shrink-0 mt-0.5 text-orange-400" />
                      <span className="line-clamp-2">{loc.address}</span>
                    </div>
                  )}
                  {loc.contact && (
                    <div className="flex gap-1 items-center text-xs text-slate-500">
                      <span className="font-semibold">Contacto:</span> {loc.contact}
                    </div>
                  )}
                  <p className="text-[10px] text-slate-400 font-medium mt-1">{new Date(loc.createdAt).toLocaleDateString()} {new Date(loc.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                </div>
              </div>
            ))}
          {locations.filter(l => l.type === 'wifi').length === 0 && (
            <div className="col-span-full py-8 text-center text-slate-500 italic">No hay puntos WiFi registrados.</div>
          )}
        </div>
      </div>

      {/* Footer with Larger Links */}
      <footer className="mt-4 pt-4 border-t border-slate-200 shrink-0 bg-white p-4 rounded-2xl shadow-sm">
        <div className="mb-4">
          <p className="mb-2 text-slate-800 text-center font-bold text-xs sm:text-sm uppercase tracking-wide">Sitios Oficiales de Ayuda y Reportes:</p>
          <div className="flex flex-wrap justify-center gap-2 text-blue-700 font-bold text-[9px] sm:text-xs">
            <a href="https://terremotovenezuela.com/" target="_blank" rel="noopener noreferrer" className="hover:underline hover:text-blue-900 bg-blue-50 px-2 py-1 rounded-md border border-blue-100 transition-colors">terremotovenezuela.com</a>
            <a href="https://terremotovenezuela.app/" target="_blank" rel="noopener noreferrer" className="hover:underline hover:text-blue-900 bg-blue-50 px-2 py-1 rounded-md border border-blue-100 transition-colors">terremotovenezuela.app</a>
            <a href="https://www.sismovenezuela.com/" target="_blank" rel="noopener noreferrer" className="hover:underline hover:text-blue-900 bg-blue-50 px-2 py-1 rounded-md border border-blue-100 transition-colors">sismovenezuela.com</a>
            <a href="https://venezuelareporta.org/" target="_blank" rel="noopener noreferrer" className="hover:underline hover:text-blue-900 bg-blue-50 px-2 py-1 rounded-md border border-blue-100 transition-colors">venezuelareporta.org</a>
            <a href="https://desaparecidosterremotovenezuela.com/" target="_blank" rel="noopener noreferrer" className="hover:underline hover:text-blue-900 bg-blue-50 px-2 py-1 rounded-md border border-blue-100 transition-colors">desaparecidosterremotovenezuela.com</a>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row justify-between items-center gap-2 text-[9px] sm:text-xs text-slate-400 font-bold uppercase tracking-widest mt-3 border-t border-slate-100 pt-3">
          <p className="text-center">Desarrollado por Power AI Solutions LLC • Todos los derechos reservados</p>
          <div className="flex flex-wrap gap-3 sm:gap-6 justify-center">
            <span className="text-slate-500 text-center">Más información: poweraisolutionsllc@gmail.com</span>
            <span className="text-red-600 flex items-center justify-center gap-1"><AlertTriangle className="w-3 h-3"/> Línea Nacional: 911 / 171</span>
          </div>
        </div>
      </footer>

      {/* Dialogs */}
      <AddLocationDialog 
        isOpen={isDialogOpen} 
        onClose={() => {
          setIsDialogOpen(false);
          setIsAddingMode(false);
        }}
        onSubmit={handleAddSubmit}
        lat={selectedCoords?.lat || null}
        lng={selectedCoords?.lng || null}
        preselectedType={dialogPreselectedType}
        onRequestMapSelection={() => {
          setIsDialogOpen(false);
          setIsAddingMode(true);
        }}
        onUpdateCoords={(lat, lng) => {
          if (lat === null || lng === null) {
            setSelectedCoords(null);
          } else {
            setSelectedCoords({ lat, lng });
          }
        }}
      />

      <ClaimDonationDialog
        isOpen={claimDialogOpen}
        onClose={() => {
          setClaimDialogOpen(false);
          setSelectedDonation(null);
        }}
        onSubmit={handleClaimSubmit}
        donation={selectedDonation}
      />

      {isActionMenuOpen && (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col">
            <div className="p-6 text-center">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
                actionMenuType === 'collection_center' ? 'bg-indigo-100 text-indigo-600' :
                actionMenuType === 'shelter' ? 'bg-green-100 text-green-600' :
                actionMenuType === 'donation' ? 'bg-blue-100 text-blue-600' :
                actionMenuType === 'transport' ? 'bg-purple-100 text-purple-600' :
                actionMenuType === 'wifi' ? 'bg-orange-100 text-orange-600' :
                'bg-red-100 text-red-600'
              }`}>
                {actionMenuType === 'collection_center' && <Building className="w-8 h-8" />}
                {actionMenuType === 'shelter' && <Home className="w-8 h-8" />}
                {actionMenuType === 'donation' && <Package className="w-8 h-8" />}
                {actionMenuType === 'transport' && <Truck className="w-8 h-8" />}
                {actionMenuType === 'wifi' && <Wifi className="w-8 h-8" />}
                {actionMenuType === 'missing_person' && <UserX className="w-8 h-8" />}
              </div>
              <h2 className="text-xl font-bold text-slate-800 mb-2">
                {actionMenuType === 'collection_center' ? 'Centros de Acopio' :
                 actionMenuType === 'shelter' ? 'Refugios' :
                 actionMenuType === 'donation' ? 'Donaciones' :
                 actionMenuType === 'transport' ? 'Transporte' :
                 actionMenuType === 'wifi' ? 'Centros WiFi' :
                 'Personas Desaparecidas'}
              </h2>
              <p className="text-sm text-slate-600 mb-6">¿Qué deseas hacer?</p>
              
              <div className="flex flex-col gap-3">
                <button 
                  onClick={() => {
                    setIsActionMenuOpen(false);
                    handleActionClick(actionMenuType);
                  }}
                  className={`w-full text-white font-bold py-3 rounded-xl transition-colors shadow-lg ${
                    actionMenuType === 'collection_center' ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200' :
                    actionMenuType === 'shelter' ? 'bg-green-600 hover:bg-green-700 shadow-green-200' :
                    actionMenuType === 'donation' ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-200' :
                    actionMenuType === 'transport' ? 'bg-purple-600 hover:bg-purple-700 shadow-purple-200' :
                    actionMenuType === 'wifi' ? 'bg-orange-600 hover:bg-orange-700 shadow-orange-200' :
                    'bg-red-600 hover:bg-red-700 shadow-red-200'
                  }`}
                >
                  Registrar {
                    actionMenuType === 'collection_center' ? 'Centro' :
                    actionMenuType === 'shelter' ? 'Refugio' :
                    actionMenuType === 'donation' ? 'Donación' :
                    actionMenuType === 'transport' ? 'Transporte' :
                    actionMenuType === 'wifi' ? 'Punto WiFi' :
                    'Reporte'
                  }
                </button>
                <button 
                  onClick={() => {
                    setIsActionMenuOpen(false);
                    setFilter(actionMenuType === 'missing_person' ? 'all' : actionMenuType);
                    setTimeout(() => {
                      const searchIdMap: Record<string, string> = {
                        'collection_center': 'collection-center-search',
                        'shelter': 'shelter-search',
                        'donation': 'donation-search',
                        'transport': 'transport-search',
                        'wifi': 'wifi-search',
                        'missing_person': 'missing-person-search'
                      };
                      const targetId = searchIdMap[actionMenuType];
                      if (targetId) {
                        document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth' });
                      } else {
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }
                    }, 100);
                  }}
                  className={`w-full bg-white font-bold py-3 rounded-xl transition-colors border-2 ${
                    actionMenuType === 'collection_center' ? 'hover:bg-indigo-50 text-indigo-700 border-indigo-200' :
                    actionMenuType === 'shelter' ? 'hover:bg-green-50 text-green-700 border-green-200' :
                    actionMenuType === 'donation' ? 'hover:bg-blue-50 text-blue-700 border-blue-200' :
                    actionMenuType === 'transport' ? 'hover:bg-purple-50 text-purple-700 border-purple-200' :
                    actionMenuType === 'wifi' ? 'hover:bg-orange-50 text-orange-700 border-orange-200' :
                    'hover:bg-red-50 text-red-700 border-red-200'
                  }`}
                >
                  Buscar {
                    actionMenuType === 'collection_center' ? 'Centro' :
                    actionMenuType === 'shelter' ? 'Refugios' :
                    actionMenuType === 'donation' ? 'Donaciones' :
                    actionMenuType === 'transport' ? 'Transporte' :
                    actionMenuType === 'wifi' ? 'Puntos WiFi' :
                    'Personas'
                  }
                </button>
              </div>
              
              <button 
                onClick={() => setIsActionMenuOpen(false)}
                className="mt-6 text-sm text-slate-500 font-medium hover:text-slate-800"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

