'use client';

import React from 'react';

type EventCardMinProps = {
  name: string;
  buildingIDs?: string[];
  dateStart: string;
  dateEnd: string | null;
  isApproved: boolean;
  description?: string | null;
  onClick?: () => void;
};

const EventCardMin: React.FC<EventCardMinProps> = ({
  name,
  buildingIDs,
  dateStart,
  dateEnd,
  isApproved,
  description,
  onClick
}) => {
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        hour: 'numeric', 
        minute: '2-digit' 
      });
    } catch {
      return dateString;
    }
  };

  return (
    <div
      onClick={onClick}
      className="flex items-start justify-between p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors duration-150 ease-out-2"
    >
      <div className="flex-1">
        <div className="flex items-center mb-1">
          {isApproved && (
            <span className="inline-block w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
          )}
          <p className="text-sm font-semibold text-gray-800">{name}</p>
        </div>
        {description && (
          <p className="text-xs text-gray-600 mb-1 line-clamp-1">{description}</p>
        )}
        {buildingIDs && buildingIDs.length > 0 && (
          <div className="flex items-center text-xs text-gray-500 mb-1">
            <span className="mr-1">📍</span>
            <span>Building {buildingIDs[0]}</span>
          </div>
        )}
        <div className="flex items-center text-xs text-gray-500">
          <span className="mr-1">🕐</span>
          <span>{formatDate(dateStart)}</span>
        </div>
      </div>
      <div className="ml-2">
        {isApproved ? (
          <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded whitespace-nowrap">
            Live
          </span>
        ) : (
          <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded whitespace-nowrap">
            Soon
          </span>
        )}
      </div>
    </div>
  );
};

export default EventCardMin;