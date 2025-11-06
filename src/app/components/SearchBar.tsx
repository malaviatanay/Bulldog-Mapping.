'use client';

import { useState, useEffect, useRef } from 'react';

type Category = {
  name: string;
  icon: string;
  checked?: boolean;
};

type SearchSuggestion = {
  id: number;
  name: string;
  type: string;
};

const SearchBar = () => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showFilters, setShowFilters] = useState<boolean>(false);
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const searchRef = useRef<HTMLDivElement>(null);

  const categories: Category[] = [
    { name: 'Campus Layer', icon: '🗺️', checked: true },
    { name: 'Accessibility', icon: '♿' },
    { name: 'Campus Housing', icon: '🏠' },
    { name: 'Construction', icon: '🚧' },
    { name: 'Emergency', icon: '🚨' },
    { name: 'EV Charging Stations', icon: '🔌' },
    { name: 'Food & Drink', icon: '🍽️' },
    { name: 'Parking', icon: '🅿️' },
    { name: 'Restrooms', icon: '🚻' }
  ];

  // Mock data - Replace with actual building/location data
  const allLocations: SearchSuggestion[] = [
    { id: 1, name: 'Henry Madden Library', type: 'Building' },
    { id: 2, name: 'Student Union', type: 'Building' },
    { id: 3, name: 'Science 1 Building', type: 'Building' },
    { id: 4, name: 'Peters Business Building', type: 'Building' },
    { id: 5, name: 'Kremen Education Building', type: 'Building' },
    { id: 6, name: 'Save Mart Center', type: 'Venue' },
    { id: 7, name: 'Engineering East', type: 'Building' },
    { id: 8, name: 'Peace Garden', type: 'Landmark' },
    { id: 9, name: 'Parking Lot P1', type: 'Parking' },
    { id: 10, name: 'Parking Lot P2', type: 'Parking' },
    { id: 11, name: "Taco Bell Cantina", type: 'Food' },
    { id: 12, name: "Starbucks", type: 'Food' },
  ];

  // Filter suggestions based on search query
  useEffect(() => {
    if (searchQuery.length > 0) {
      const filtered = allLocations.filter(location =>
        location.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setSuggestions(filtered.slice(0, 5)); // Show max 5 suggestions
      setShowSuggestions(true);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [searchQuery]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    setSearchQuery(suggestion.name);
    setShowSuggestions(false);
    // TODO: Add logic to navigate to the location on the map
    console.log('Selected:', suggestion);
  };

  const handleSearch = () => {
    if (searchQuery) {
      // TODO: Add search logic here
      console.log('Searching for:', searchQuery);
      setShowSuggestions(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="absolute top-4 left-4 right-4 z-10 max-w-md">
      <div className="bg-white rounded-lg shadow-lg overflow-hidden" ref={searchRef}>
        <div className="flex items-center p-3 border-b border-gray-200">
          <span className="mr-3 text-xl">🔍</span>
          <input
            type="text"
            placeholder="Search buildings, parking, food..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            className="flex-1 outline-none border-none text-sm text-gray-700 placeholder-gray-400"
          />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery('');
                setShowSuggestions(false);
              }}
              className="mr-2 text-gray-400 hover:text-gray-600 text-lg"
            >
              ✕
            </button>
          )}
          <button 
            onClick={handleSearch}
            className="bg-blue-600 text-white px-4 py-2 rounded ml-2 cursor-pointer text-sm hover:bg-blue-700 transition"
          >
            Search
          </button>
          <button 
            onClick={() => setShowFilters(!showFilters)} 
            className="ml-2 px-2.5 py-2 bg-blue-600 text-white rounded-full cursor-pointer text-lg hover:bg-blue-700 transition"
          >
            📍
          </button>
        </div>

        {/* Autocomplete Suggestions */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="bg-white border-b border-gray-200">
            {suggestions.map((suggestion) => (
              <div
                key={suggestion.id}
                onClick={() => handleSuggestionClick(suggestion)}
                className="flex items-center justify-between p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
              >
                <div className="flex items-center">
                  <span className="mr-3 text-lg">
                    {suggestion.type === 'Building' && '🏢'}
                    {suggestion.type === 'Parking' && '🅿️'}
                    {suggestion.type === 'Food' && '🍽️'}
                    {suggestion.type === 'Venue' && '🏟️'}
                    {suggestion.type === 'Landmark' && '🌳'}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-gray-800">{suggestion.name}</p>
                    <p className="text-xs text-gray-500">{suggestion.type}</p>
                  </div>
                </div>
                <span className="text-gray-400 text-sm">→</span>
              </div>
            ))}
          </div>
        )}

        {/* No Results Message */}
        {showSuggestions && searchQuery && suggestions.length === 0 && (
          <div className="p-4 text-center text-gray-500 text-sm">
            No results found for "{searchQuery}"
          </div>
        )}

        {/* Filters Section */}
        {showFilters && (
          <div className="max-h-96 overflow-y-auto">
            <div className="flex justify-between items-center p-3 border-b border-gray-200">
              <h3 className="font-semibold m-0 text-gray-700">Filters</h3>
              <button
                onClick={() => setShowFilters(false)}
                className="text-blue-600 text-sm border-none bg-transparent cursor-pointer font-medium hover:underline"
              >
                CLEAR
              </button>
            </div>

            {categories.map((category, index) => (
              <div 
                key={index} 
                className="flex items-center justify-between p-3 border-b border-gray-200 cursor-pointer bg-white hover:bg-gray-50 transition"
              >
                <div className="flex items-center">
                  <span className="text-2xl mr-3">
                    {category.icon}
                  </span>
                  <span className="text-gray-700">{category.name}</span>
                </div>
                {category.checked ? (
                  <span className="text-blue-600 text-lg">✓</span>
                ) : (
                  <span className="text-gray-400 text-lg">›</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-red-700 text-white text-center py-2 rounded-b-lg shadow-lg mt-1">
        <p className="text-sm font-semibold m-0">
          California State University, Fresno
        </p>
      </div>
    </div>
  );
};

export default SearchBar;