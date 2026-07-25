import { useState, useRef } from 'react';
import axios from 'axios';

export default function SearchBar({ onSelect }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const timeoutRef = useRef(null);

  const handleSearch = async (q) => {
    if (q.length < 2) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const res = await axios.get(`/api/search`, { params: { q, limit: 5 } });
      setResults(res.data);
      setShowResults(true);
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const value = e.target.value;
    setQuery(value);

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => handleSearch(value), 300);
  };

  const handleSelect = (result) => {
    setQuery(result.display_name);
    setShowResults(false);
    setResults([]);
    if (onSelect) onSelect(result.latitude, result.longitude);
  };

  return (
    <div className="absolute top-4 left-4 right-4 z-[1000] max-w-lg">
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <input
          type="text"
          value={query}
          onChange={handleChange}
          onFocus={() => results.length > 0 && setShowResults(true)}
          onBlur={() => setTimeout(() => setShowResults(false), 200)}
          placeholder="جستجوی مکان‌ها..."
          className="w-full pl-10 pr-4 py-3 rounded-xl shadow-lg border-0 outline-none text-sm"
        />
        {loading && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          </div>
        )}
      </div>

      {showResults && results.length > 0 && (
        <div className="mt-1 bg-white rounded-xl shadow-lg overflow-hidden">
          {results.map((result, i) => (
            <button
              key={i}
              onClick={() => handleSelect(result)}
              className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-0"
            >
              <p className="text-sm text-gray-800 line-clamp-1">{result.display_name}</p>
              <p className="text-xs text-gray-400 mt-0.5">{result.type}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
