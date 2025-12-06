import React, { useState, useEffect } from 'react';

const FALLBACK_IMAGE = "http://skuytov.eu/f1f1f1f2/FallBack_Placeholder.png";

/**
 * Image component that handles loading errors gracefully by showing a fallback.
 * @param {Object} props - Standard img props plus fallback logic
 */
const ImageWithFallback = ({ src, alt, className, ...props }) => {
  const [imgSrc, setImgSrc] = useState(src || FALLBACK_IMAGE);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setImgSrc(src || FALLBACK_IMAGE);
    setHasError(false);
  }, [src]);

  const handleError = () => {
    if (!hasError) {
      setImgSrc(FALLBACK_IMAGE);
      setHasError(true);
    }
  };

  return (
    <img 
      src={imgSrc} 
      alt={alt} 
      className={className} 
      onError={handleError}
      loading="lazy"
      {...props}
    />
  );
};

export default ImageWithFallback;
