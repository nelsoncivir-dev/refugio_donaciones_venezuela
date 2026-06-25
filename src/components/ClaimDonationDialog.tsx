import React, { useState, useRef } from 'react';
import { ReportLocation } from '../types';
import { X, Camera } from 'lucide-react';

interface ClaimDonationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  donation: ReportLocation | null;
}

export default function ClaimDonationDialog({ isOpen, onClose, onSubmit, donation }: ClaimDonationDialogProps) {
  const [name, setName] = useState('');
  const [cedula, setCedula] = useState('');
  const [cedulaPhoto, setCedulaPhoto] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen || !donation) return null;

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
          setCedulaPhoto(canvas.toDataURL('image/jpeg', 0.7));
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cedulaPhoto) {
      alert('Debes subir o tomar una foto de tu cédula de identidad para solicitar la ayuda.');
      return;
    }

    onSubmit({
      donationId: donation.id,
      name,
      cedula,
      cedulaPhoto
    });
    
    // Reset form
    setName('');
    setCedula('');
    setCedulaPhoto(null);
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
        
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-bold">Solicitar Ayuda</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto">
          <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg mb-4">
            <p className="text-sm font-bold text-blue-900 mb-1">Estás solicitando:</p>
            <p className="text-xs text-blue-800">{donation.title}</p>
          </div>

          <form id="claim-form" onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-slate-800 mb-1">
                Nombre Completo <span className="text-red-500">*</span>
              </label>
              <input 
                required
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                placeholder="Ej. Juan Pérez"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-800 mb-1">
                Cédula de Identidad <span className="text-red-500">*</span>
              </label>
              <input 
                required
                type="text" 
                value={cedula}
                onChange={(e) => setCedula(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                placeholder="V-12345678"
              />
            </div>

            {/* Photo Section */}
            <div>
              <label className="block text-sm font-bold text-slate-800 mb-1">
                Foto de tu Cédula <span className="text-red-500">*</span>
              </label>
              <p className="text-xs text-slate-500 mb-2">Para evitar fraudes, necesitamos una foto de tu cédula.</p>
              
              <input 
                type="file" 
                accept="image/*" 
                capture="environment" 
                className="hidden" 
                ref={fileInputRef}
                onChange={handlePhotoUpload}
              />
              
              {cedulaPhoto ? (
                <div className="relative rounded-lg overflow-hidden border border-slate-200">
                  <img src={cedulaPhoto} alt="Cédula" className="w-full h-32 object-cover" />
                  <button 
                    type="button" 
                    onClick={() => setCedulaPhoto(null)}
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
                  <span className="text-sm font-medium">Tomar foto de la cédula</span>
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
            form="claim-form"
            className="px-6 py-2 text-sm font-bold text-white rounded-lg transition-colors shadow-lg bg-blue-600 hover:bg-blue-700 shadow-blue-200"
          >
            Enviar Solicitud
          </button>
        </div>

      </div>
    </div>
  );
}
