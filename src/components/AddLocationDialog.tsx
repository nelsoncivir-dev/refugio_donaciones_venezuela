import React, { useState, useEffect, useRef } from 'react';
import { LocationType, DonationCategory } from '../types';
import { X, Camera, MapPin, Map as MapIcon, Image as ImageIcon, Truck } from 'lucide-react';

interface AddLocationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void> | void;
  lat: number | null;
  lng: number | null;
  preselectedType?: LocationType;
  onRequestMapSelection: () => void;
  onUpdateCoords: (lat: number | null, lng: number | null) => void;
}

export default function AddLocationDialog({ isOpen, onClose, onSubmit, lat, lng, preselectedType = 'shelter', onRequestMapSelection, onUpdateCoords }: AddLocationDialogProps) {
  const [type, setType] = useState<LocationType>(preselectedType);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [contact, setContact] = useState('');
  const [capacity, setCapacity] = useState('');
  const [donationCategory, setDonationCategory] = useState<DonationCategory>('food');
  const [photo, setPhoto] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [addressMode, setAddressMode] = useState(false);
  const [capturedAddress, setCapturedAddress] = useState<string | null>(null);
  const [addressFields, setAddressFields] = useState({
    estado: '',
    municipio: '',
    parroquia: '',
    calle: '',
    referencia: ''
  });
  const [isGeocoding, setIsGeocoding] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setType(preselectedType);
    }
  }, [isOpen, preselectedType]);

  if (!isOpen) return null;

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        // Resize image to base64 to save space
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 800;
          const MAX_HEIGHT = 800;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          setPhoto(canvas.toDataURL('image/jpeg', 0.7));
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGetCurrentLocation = () => {
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        onUpdateCoords(position.coords.latitude, position.coords.longitude);
        try {
          const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${position.coords.latitude}&lon=${position.coords.longitude}`);
          const data = await response.json();
          if (data && data.display_name) {
            setCapturedAddress(data.display_name);
          } else {
            setCapturedAddress(`Lat: ${position.coords.latitude.toFixed(4)}, Lng: ${position.coords.longitude.toFixed(4)}`);
          }
        } catch (error) {
          setCapturedAddress(`Lat: ${position.coords.latitude.toFixed(4)}, Lng: ${position.coords.longitude.toFixed(4)}`);
        }
        setIsLocating(false);
      },
      (error) => {
        console.error("Error getting location", error);
        alert("No se pudo obtener la ubicación. Por favor, asegúrate de dar permisos o selecciona la ubicación en el mapa.");
        setIsLocating(false);
      },
      { enableHighAccuracy: true }
    );
  };

  const handleGeocodeAddress = async () => {
    const { estado, municipio, parroquia, calle } = addressFields;
    if (!estado || !municipio) {
      alert("Por favor ingresa al menos Estado y Municipio.");
      return;
    }
    
    const queryParts = [calle, parroquia, municipio, estado, 'Venezuela'].filter(Boolean);
    const searchQuery = queryParts.join(', ');
    
    setIsGeocoding(true);
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`);
      const data = await response.json();
      if (data && data.length > 0) {
        onUpdateCoords(parseFloat(data[0].lat), parseFloat(data[0].lon));
        const addressString = [
          addressFields.calle, 
          addressFields.referencia ? `(Ref: ${addressFields.referencia})` : '',
          addressFields.parroquia, 
          addressFields.municipio, 
          addressFields.estado
        ].filter(Boolean).join(', ');
        setCapturedAddress(addressString);
        setAddressMode(false);
      } else {
        alert("No se pudo encontrar la dirección exacta en el mapa. Puedes intentar elegir la ubicación manualmente en el mapa.");
      }
    } catch (error) {
      console.error("Error geocoding", error);
      alert("Error al buscar la dirección.");
    } finally {
      setIsGeocoding(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lat || !lng) {
      alert("Por favor, selecciona una ubicación para el reporte.");
      return;
    }

    setIsSubmitting(true);

    const payload: any = {
      type,
      title,
      description,
      lat,
      lng
    };
    if (contact.trim()) {
      payload.contact = contact.trim();
    }
    if (type === 'shelter' && capacity && parseInt(capacity, 10) > 0) {
      payload.capacity = parseInt(capacity, 10);
    }
    if (type === 'donation') {
      payload.donationCategory = donationCategory;
    }
    if (photo) {
      payload.photo = photo;
    }
    
    if (type === 'missing_person') {
      payload.status = 'missing';
    }

    // Si usó el modo dirección manual, guardamos la dirección para referencia
    if (addressFields.estado) {
      const addressString = [
        addressFields.calle, 
        addressFields.referencia ? `(Ref: ${addressFields.referencia})` : '',
        addressFields.parroquia, 
        addressFields.municipio, 
        addressFields.estado
      ].filter(Boolean).join(', ');
      payload.address = addressString;
    }

    try {
      await onSubmit(payload);
      alert("¡La acción se ha guardado correctamente!");
      
      // Reset form
      setTitle('');
      setDescription('');
      setContact('');
      setCapacity('');
      setPhoto(null);
      setCapturedAddress(null);
      setAddressFields({ estado: '', municipio: '', parroquia: '', calle: '', referencia: '' });
      onClose();
    } catch (err) {
      console.error(err);
      alert("Hubo un error al guardar la información. Por favor intenta nuevamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const typeConfig = {
    shelter: { 
      label: 'Ofrecer Refugio',
      activeClass: 'bg-green-50 border-green-300 text-green-700 ring-2 ring-green-200',
      btnClass: 'bg-green-600 hover:bg-green-700 shadow-green-200'
    },
    donation: { 
      label: 'Donación / Insumos',
      activeClass: 'bg-blue-50 border-blue-300 text-blue-700 ring-2 ring-blue-200',
      btnClass: 'bg-blue-600 hover:bg-blue-700 shadow-blue-200'
    },
    transport: {
      label: 'Ofrecer Transporte',
      activeClass: 'bg-purple-50 border-purple-300 text-purple-700 ring-2 ring-purple-200',
      btnClass: 'bg-purple-600 hover:bg-purple-700 shadow-purple-200'
    },
    wifi: {
      label: 'Centro WiFi / Starlink',
      activeClass: 'bg-orange-50 border-orange-300 text-orange-700 ring-2 ring-orange-200',
      btnClass: 'bg-orange-600 hover:bg-orange-700 shadow-orange-200'
    },
    missing_person: { 
      label: 'Reportar Desaparecido',
      activeClass: 'bg-red-50 border-red-300 text-red-700 ring-2 ring-red-200',
      btnClass: 'bg-red-600 hover:bg-red-700 shadow-red-200'
    }
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
        
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-bold">{typeConfig[type].label}</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto">
          <form id="report-form" onSubmit={handleSubmit} className="space-y-4">
            
            {/* Location Picker Section */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <label className="block text-sm font-bold text-slate-800 mb-2">
                1. Ubicación <span className="text-red-500">*</span>
              </label>
              {lat && lng ? (
                <div className="flex flex-col gap-2 bg-white p-3 rounded-lg border border-slate-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-green-700 font-medium">
                      <MapPin className="w-4 h-4" />
                      Ubicación capturada correctamente
                    </div>
                    <button type="button" onClick={() => { onUpdateCoords(null, null); setCapturedAddress(null); }} className="text-xs text-blue-600 font-bold hover:underline">
                      Cambiar
                    </button>
                  </div>
                  {capturedAddress && (
                    <p className="text-xs text-slate-600 font-medium bg-slate-50 p-2 rounded border border-slate-100">
                      {capturedAddress}
                    </p>
                  )}
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <button 
                      type="button" 
                      onClick={handleGetCurrentLocation}
                      disabled={isLocating}
                      className="flex-1 flex items-center justify-center gap-2 bg-slate-900 text-white py-2 rounded-lg text-sm font-medium hover:bg-slate-800 disabled:opacity-70"
                    >
                      <MapPin className="w-4 h-4" />
                      {isLocating ? 'Buscando...' : 'Usar mi ubicación'}
                    </button>
                    <button 
                      type="button"
                      onClick={() => setAddressMode(!addressMode)} 
                      className={`flex-1 flex items-center justify-center gap-2 border py-2 rounded-lg text-sm font-medium transition-colors ${addressMode ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'}`}
                    >
                      <MapIcon className="w-4 h-4" />
                      Ingresar manual
                    </button>
                  </div>
                  
                  {addressMode && (
                    <div className="mt-2 bg-white p-3 rounded-lg border border-slate-200 flex flex-col gap-3">
                      <p className="text-xs text-slate-600 font-medium">Ingresa los datos de tu dirección:</p>
                      
                      <div className="grid grid-cols-2 gap-2">
                        <input 
                          type="text" 
                          value={addressFields.estado}
                          onChange={(e) => setAddressFields({...addressFields, estado: e.target.value})}
                          placeholder="Estado *"
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                        <input 
                          type="text" 
                          value={addressFields.municipio}
                          onChange={(e) => setAddressFields({...addressFields, municipio: e.target.value})}
                          placeholder="Municipio *"
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2">
                        <input 
                          type="text" 
                          value={addressFields.parroquia}
                          onChange={(e) => setAddressFields({...addressFields, parroquia: e.target.value})}
                          placeholder="Parroquia"
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                        <input 
                          type="text" 
                          value={addressFields.calle}
                          onChange={(e) => setAddressFields({...addressFields, calle: e.target.value})}
                          placeholder="Calle/Avenida"
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                      </div>

                      <input 
                        type="text" 
                        value={addressFields.referencia}
                        onChange={(e) => setAddressFields({...addressFields, referencia: e.target.value})}
                        placeholder="Punto de referencia (opcional)"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      />

                      <div className="flex gap-2">
                        <button 
                          type="button"
                          onClick={() => setAddressMode(false)}
                          className="px-3 py-2 text-slate-600 bg-slate-100 rounded-lg text-sm font-bold hover:bg-slate-200"
                        >
                          Cancelar
                        </button>
                        <button 
                          type="button"
                          onClick={handleGeocodeAddress}
                          disabled={isGeocoding || !addressFields.estado || !addressFields.municipio}
                          className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm font-bold hover:bg-blue-700 disabled:opacity-50"
                        >
                          {isGeocoding ? 'Buscando...' : 'Buscar y Confirmar Ubicación'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Details Section */}
            <div>
              <label className="block text-sm font-bold text-slate-800 mb-1">
                2. Detalles
              </label>
              
              {type === 'donation' && (
                <div className="mb-3">
                  <label className="block text-xs font-medium text-slate-600 mb-1">Tipo de Donación</label>
                  <select 
                    value={donationCategory} 
                    onChange={(e) => setDonationCategory(e.target.value as DonationCategory)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white"
                  >
                    <option value="food">Comida / Alimentos</option>
                    <option value="water">Agua Potable</option>
                    <option value="clothes">Ropa / Abrigo</option>
                    <option value="other">Otros Insumos / Medicina</option>
                  </select>
                </div>
              )}

              <input 
                required
                type="text" 
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none mb-3 text-sm"
                placeholder={type === 'shelter' ? 'Nombre del Refugio / Familia' : type === 'donation' ? 'Ej. Se ofrecen 10 bolsas de comida' : type === 'transport' ? 'Ej. Camioneta pick-up disponible' : type === 'wifi' ? 'Nombre de red o ubicación del punto WiFi' : type === 'missing_person' ? 'Nombre y Apellido del Desaparecido' : 'Lugar o Zona Afectada'}
              />
              
              <textarea 
                required
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none text-sm"
                placeholder={type === 'shelter' ? 'Tengo 2 cuartos disponibles, hay agua potable...' : type === 'donation' ? 'Punto de entrega en la plaza central...' : type === 'transport' ? 'Ej. Puedo hacer viajes desde Caracas a Valencia los fines de semana...' : type === 'wifi' ? 'Ej. Starlink disponible de 8am a 6pm, sin contraseña...' : type === 'missing_person' ? 'Características físicas, ropa que llevaba, residencia o edificio donde vivía, última vez visto...' : 'Se necesita ayuda para remover escombros...'}
              />
            </div>

            {/* Contact & Capacity */}
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Contacto (Opcional)
                </label>
                <input 
                  type="text" 
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                  placeholder="Teléfono/Email"
                />
              </div>

              {(type === 'shelter' || type === 'transport') && (
                <div className="w-1/3">
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Capacidad
                  </label>
                  <input 
                    type="number" 
                    min="1"
                    value={capacity}
                    onChange={(e) => setCapacity(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                    placeholder={type === 'shelter' ? 'Personas' : 'Cajas/Kg/Puestos'}
                  />
                </div>
              )}
            </div>

            {/* Photo Section */}
            <div>
              <label className="block text-sm font-bold text-slate-800 mb-1">
                3. Evidencia / Foto (Opcional)
              </label>
              <input 
                type="file" 
                accept="image/*" 
                capture="environment" 
                className="hidden" 
                ref={fileInputRef}
                onChange={handlePhotoUpload}
              />
              
              {photo ? (
                <div className="relative rounded-lg overflow-hidden border border-slate-200">
                  <img src={photo} alt="Evidencia" className="w-full h-32 object-cover" />
                  <button 
                    type="button" 
                    onClick={() => setPhoto(null)}
                    className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button 
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-6 border-2 border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center text-slate-500 hover:bg-slate-50 hover:border-slate-400 transition-colors"
                >
                  <Camera className="w-6 h-6 mb-2" />
                  <span className="text-sm font-medium">Tomar o subir foto</span>
                </button>
              )}
            </div>

          </form>
        </div>

        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
          <button 
            type="button" 
            onClick={onClose}
            className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button 
            type="submit" 
            form="report-form"
            disabled={isSubmitting}
            className={`px-6 py-2 text-sm font-bold text-white rounded-lg transition-colors shadow-lg disabled:opacity-70 ${type === 'shelter' ? 'bg-green-600 hover:bg-green-700 shadow-green-200' : type === 'donation' ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-200' : type === 'transport' ? 'bg-purple-600 hover:bg-purple-700 shadow-purple-200' : type === 'wifi' ? 'bg-orange-600 hover:bg-orange-700 shadow-orange-200' : 'bg-red-600 hover:bg-red-700 shadow-red-200'}`}
          >
            {isSubmitting ? 'Guardando...' : 'Publicar'}
          </button>
        </div>

      </div>
    </div>
  );
}
