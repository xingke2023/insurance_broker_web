import React, { useState, useEffect } from 'react';

const CompanyIconDisplay = ({ iconUrl, companyName, imgSizeClasses, textClasses = 'text-white text-xl md:text-3xl', fallbackBgClasses = 'bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl md:rounded-2xl' }) => {
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false); // Reset error state when iconUrl or companyName changes
  }, [iconUrl, companyName]);

  // If iconUrl is provided and not in error state, attempt to render it as an image
  if (iconUrl && !imgError) {
    // A basic check to see if it looks like a URL or path
    const isLikelyUrl = typeof iconUrl === 'string' && (iconUrl.includes('http') || iconUrl.includes('/') || iconUrl.includes('.'));
    if (isLikelyUrl) {
      return (
        <img
          src={iconUrl}
          alt={companyName}
          className={`${imgSizeClasses} object-contain`}
          onError={() => setImgError(true)} // Set error state if image fails to load
        />
      );
    }
  }

  // Fallback to displaying the first character if:
  // - iconUrl is not provided
  // - imgError is true (image failed to load)
  // - iconUrl is provided but doesn't look like a URL (e.g., it's a single character emoji)
  return (
    <div className={`${imgSizeClasses} ${fallbackBgClasses} flex items-center justify-center ${textClasses} font-bold shadow-lg`}>
      {companyName ? companyName.charAt(0) : '?'}
    </div>
  );
};

export default CompanyIconDisplay;
