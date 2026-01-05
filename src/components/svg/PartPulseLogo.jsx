/**
 * PartPulse Logo SVG Component
 * 
 * This is a professional placeholder logo.
 * To replace with your custom Adobe Illustrator logo:
 * 
 * 1. Open your PartPulse-logo.ai in Adobe Illustrator
 * 2. File > Export As > Select SVG format
 * 3. Copy the SVG code (open the .svg file in a text editor)
 * 4. Replace the SVG content below with your actual logo code
 * 
 * The SVG will be embedded directly in the component for instant loading.
 */

const PartPulseLogo = () => {
  return (
    <svg
      width="100%"
      height="100%"
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-8 h-8"
    >
      {/* Placeholder Professional Logo - Replace with your custom SVG */}
      
      {/* Main circle background */}
      <circle cx="50" cy="50" r="48" fill="#14b8a6" opacity="0.1" stroke="#14b8a6" strokeWidth="2" />
      
      {/* Outer gradient circle */}
      <circle cx="50" cy="50" r="42" fill="#14b8a6" />
      
      {/* Inner lighter circle for depth */}
      <circle cx="50" cy="50" r="38" fill="#0d9488" />
      
      {/* Pulse waves - representing "Pulse" */}
      <circle cx="50" cy="50" r="18" fill="none" stroke="#ffffff" strokeWidth="2.5" opacity="0.8" />
      <circle cx="50" cy="50" r="26" fill="none" stroke="#ffffff" strokeWidth="1.5" opacity="0.5" />
      
      {/* Center dot */}
      <circle cx="50" cy="50" r="4" fill="#ffffff" />
      
      {/* Stylized "P" shape in white - subtle branding */}
      <path
        d="M 42 38 L 42 62 M 42 45 L 52 45 Q 56 45 56 49 Q 56 53 52 53 L 42 53"
        stroke="#ffffff"
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export default PartPulseLogo;
