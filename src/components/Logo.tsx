import React, { useState } from 'react';
import { ChefHat } from 'lucide-react';

interface LogoProps {
  className?: string;
  size?: number;
}

const Logo: React.FC<LogoProps> = ({ className, size = 40 }) => {
  const [imageError, setImageError] = useState(false);

  return (
    <div className={`flex items-center justify-center overflow-hidden h-full aspect-square ${className}`} style={{ width: size, height: size }}>
      {!imageError ? (
        <img 
          src="/logo.png" 
          alt="Dalia Bakery Logo" 
          className="h-full w-full object-contain"
          referrerPolicy="no-referrer"
          onError={() => setImageError(true)}
        />
      ) : (
        <div className="bg-white rounded-xl shadow-sm p-2 flex items-center justify-center w-full h-full">
          <ChefHat size={size * 0.6} className="text-primary" />
        </div>
      )}
    </div>
  );
};

export default Logo;
