'use client';

import { useState } from 'react';

type Category = {
  name: string;
  icon: string;
  checked?: boolean;
};

const SearchBar = () => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showFilters, setShowFilters] = useState<boolean>(false);

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

  const containerStyle: React.CSSProperties = {
    position: 'absolute',
    top: '16px',
    left: '16px',
    right: '16px',
    zIndex: 10,
    maxWidth: '448px'
  };

  const cardStyle: React.CSSProperties = {
    backgroundColor: 'white',
    borderRadius: '8px',
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
    overflow: 'hidden'
  };

  const searchRowStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    padding: '12px',
    borderBottom: '1px solid #e5e7eb'
  };

  const inputStyle: React.CSSProperties = {
    flex: 1,
    outline: 'none',
    border: 'none',
    fontSize: '14px',
    color: '#374151'
  };

  const searchButtonStyle: React.CSSProperties = {
    backgroundColor: '#2563eb',
    color: 'white',
    padding: '8px 16px',
    borderRadius: '4px',
    marginLeft: '8px',
    border: 'none',
    cursor: 'pointer',
    fontSize: '14px'
  };

  const filterButtonStyle: React.CSSProperties = {
    marginLeft: '8px',
    padding: '8px 10px',
    backgroundColor: '#2563eb',
    color: 'white',
    borderRadius: '50%',
    border: 'none',
    cursor: 'pointer',
    fontSize: '18px'
  };

  const filterHeaderStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px',
    borderBottom: '1px solid #e5e7eb'
  };

  const categoryItemStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px',
    borderBottom: '1px solid #e5e7eb',
    cursor: 'pointer',
    backgroundColor: 'white'
  };

  const brandingStyle: React.CSSProperties = {
    backgroundColor: '#b91c1c',
    color: 'white',
    textAlign: 'center',
    padding: '8px',
    borderRadius: '0 0 8px 8px',
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
    marginTop: '4px'
  };

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <div style={searchRowStyle}>
          <span style={{ marginRight: '12px', fontSize: '20px' }}>🔍</span>
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={inputStyle}
          />
          <button style={searchButtonStyle}>
            Search
          </button>
          <button onClick={() => setShowFilters(!showFilters)} style={filterButtonStyle}>
            📍
          </button>
        </div>

        {showFilters && (
          <div style={{ maxHeight: '384px', overflowY: 'auto' }}>
            <div style={filterHeaderStyle}>
              <h3 style={{ fontWeight: 600, margin: 0, color: '#374151' }}>Filters</h3>
              <button
                onClick={() => setShowFilters(false)}
                style={{
                  color: '#2563eb',
                  fontSize: '14px',
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  fontWeight: 500
                }}
              >
                CLEAR
              </button>
            </div>

            {categories.map((category, index) => (
              <div key={index} style={categoryItemStyle}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <span style={{ fontSize: '24px', marginRight: '12px' }}>
                    {category.icon}
                  </span>
                  <span style={{ color: '#374151' }}>{category.name}</span>
                </div>
                {category.checked ? (
                  <span style={{ color: '#2563eb', fontSize: '18px' }}>✓</span>
                ) : (
                  <span style={{ color: '#9ca3af', fontSize: '18px' }}>›</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={brandingStyle}>
        <p style={{ fontSize: '14px', fontWeight: 600, margin: 0 }}>
          California State University, Fresno
        </p>
      </div>
    </div>
  );
};

export default SearchBar;