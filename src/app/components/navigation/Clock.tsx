'use client'
import { Sun, Moon } from "lucide-react";
import { useState, useEffect } from "react";

type ClockProps = {
  className?: string;
};

export default function Clock({ className = "" }: ClockProps) {
  const [currentTime, setCurrentTime] = useState<string>("");
  const [isDaytime, setIsDaytime] = useState<boolean>(true);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours24 = now.getHours();
      const minutes = now.getMinutes();
      const period = hours24 >= 12 ? "PM" : "AM";
      const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
      const formattedTime = `${hours12}:${minutes.toString().padStart(2, "0")} ${period}`;

      setCurrentTime(formattedTime);
      setIsDaytime(hours24 >= 6 && hours24 < 18);
    };

    updateTime();
    const interval = setInterval(updateTime, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      {isDaytime ? (
        <Sun className="w-4 h-4 text-yellow-500" />
      ) : (
        <Moon className="w-4 h-4 text-blue-500" />
      )}
      <span className="text-sm font-medium">{currentTime}</span>
    </div>
  );
}
