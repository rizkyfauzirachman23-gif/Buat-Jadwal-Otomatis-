import React, { useState, useEffect } from 'react';
import { MapPin, Search, Navigation, Coffee, Utensils } from 'lucide-react';
import { searchNearbyPlaces } from '../services/geminiService';
import { PlaceResult } from '../types';
import ReactMarkdown from 'react-markdown';

export const NearbyPlaces: React.FC = () => {
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<{ text: string; places: PlaceResult[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchType, setSearchType] = useState<string>('Tempat makan siang murah');

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (err) => {
          console.error(err);
          setError("Izin lokasi diperlukan untuk fitur ini.");
        }
      );
    } else {
      setError("Browser tidak mendukung geolocation.");
    }
  }, []);

  const handleSearch = async () => {
    if (!location) return;
    setLoading(true);
    setError(null);
    try {
      const data = await searchNearbyPlaces(location.lat, location.lng, searchType);
      setResults(data);
    } catch (e) {
      console.error(e);
      setError("Gagal mengambil data dari Google Maps.");
    } finally {
      setLoading(false);
    }
  };

  if (error && !location) {
     return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mt-6">
            <div className="text-center text-amber-600">
                <MapPin className="mx-auto mb-2" />
                <p>{error}</p>
                <p className="text-xs text-slate-500 mt-1">Aktifkan lokasi untuk mencari tempat istirahat guru.</p>
            </div>
        </div>
     )
  }

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mt-6">
      <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-indigo-700">
        <MapPin size={24} /> Cari Tempat Istirahat (Google Maps)
      </h2>
      
      <p className="text-slate-600 text-sm mb-4">
        Temukan rekomendasi tempat makan atau kedai kopi di sekitar sekolah untuk jam istirahat guru.
      </p>

      <div className="flex gap-2 mb-4">
        <button 
          onClick={() => setSearchType('Tempat makan siang enak dan murah')}
          className={`flex-1 py-2 px-3 rounded-lg flex items-center justify-center gap-2 text-sm border ${searchType.includes('makan') ? 'bg-indigo-50 border-indigo-500 text-indigo-700' : 'bg-white border-slate-300 hover:bg-slate-50'}`}
        >
            <Utensils size={16}/> Makan Siang
        </button>
        <button 
          onClick={() => setSearchType('Coffee shop nyaman untuk kerja')}
          className={`flex-1 py-2 px-3 rounded-lg flex items-center justify-center gap-2 text-sm border ${searchType.includes('Coffee') ? 'bg-indigo-50 border-indigo-500 text-indigo-700' : 'bg-white border-slate-300 hover:bg-slate-50'}`}
        >
            <Coffee size={16}/> Ngopi
        </button>
      </div>

      <button
        onClick={handleSearch}
        disabled={loading || !location}
        className="w-full py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-all mb-6"
      >
        {loading ? (
          <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
        ) : (
          <Search size={18} />
        )}
        {loading ? 'Mencari...' : 'Cari Rekomendasi'}
      </button>

      {results && (
        <div className="space-y-4">
            <div className="prose prose-sm prose-slate max-w-none bg-slate-50 p-4 rounded-lg border border-slate-200">
                 <ReactMarkdown>{results.text}</ReactMarkdown>
            </div>

            {results.places.length > 0 && (
                <div className="space-y-2">
                    <h3 className="font-medium text-slate-800">Tautan Langsung:</h3>
                    {results.places.map((place, idx) => (
                        <a 
                            key={idx}
                            href={place.uri}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-between p-3 bg-white border border-indigo-100 rounded-lg hover:shadow-md hover:border-indigo-300 transition-all group"
                        >
                            <div>
                                <p className="font-medium text-indigo-700 group-hover:underline">{place.title}</p>
                                {place.address && <p className="text-xs text-slate-500 truncate">{place.address}</p>}
                            </div>
                            <Navigation size={16} className="text-indigo-400 group-hover:text-indigo-600"/>
                        </a>
                    ))}
                </div>
            )}
        </div>
      )}
    </div>
  );
};