import React from 'react';

const AuroraBackground: React.FC = () => {
  return (
    <>
      <style>{`
        :root {
          --avs-green: #16A34A; /* emerald-600 */
          --avs-mint: #34D399;  /* emerald-300 */
          --avs-deep: #065F46;  /* teal-900-ish */
          --avs-ice: #F1F5F9;   /* slate-100 */
        }
        
        html, body { 
          background: var(--avs-ice); 
        }
        
        .avs-aurora {
          background:
            radial-gradient(60rem 60rem at 10% 15%, color-mix(in oklab, var(--avs-green) 88%, white) 0%, transparent 60%),
            radial-gradient(50rem 50rem at 85% 25%, color-mix(in oklab, var(--avs-mint) 80%, white) 0%, transparent 60%),
            radial-gradient(65rem 65rem at 80% 85%, color-mix(in oklab, var(--avs-deep) 40%, white) 0%, transparent 60%),
            radial-gradient(70rem 70rem at 15% 80%, color-mix(in oklab, var(--avs-green) 45%, white) 0%, transparent 60%);
          filter: blur(22px) saturate(1.05);
          animation: avsDrift 22s ease-in-out infinite alternate;
        }
        
        /* tiny animated grain to avoid banding */
        .avs-aurora::after {
          content: "";
          position: absolute; 
          inset: 0;
          background-image: url("data:image/svg+xml;utf8,\
          <svg xmlns='http://www.w3.org/2000/svg' width='140' height='140' viewBox='0 0 140 140'>\
          <filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='2' stitchTiles='stitch'/></filter>\
          <rect width='100%' height='100%' filter='url(%23n)' opacity='0.025'/></svg>");
          mix-blend-mode: overlay;
          animation: avsNoise 3.5s steps(2,end) infinite;
          pointer-events: none;
        }
        
        @keyframes avsDrift {
          0%   { transform: translate3d(0,0,0) scale(1); }
          50%  { transform: translate3d(0,-1.5%,0) scale(1.02); }
          100% { transform: translate3d(0,1.5%,0) scale(1.015); }
        }
        
        @keyframes avsNoise { 
          0% { opacity: .02 } 
          100% { opacity: .03 } 
        }
        
        @media (prefers-reduced-motion: reduce) {
          .avs-aurora, .avs-aurora::after { 
            animation: none 
          }
        }
      `}</style>
      
      {/* Background — Aurora Blobs */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="avs-aurora absolute inset-0"></div>
        {/* Soft center mist to keep the card readable */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.75)_0%,rgba(255,255,255,0.55)_40%,rgba(255,255,255,0.65)_100%)]"></div>
      </div>
    </>
  );
};

export default AuroraBackground;
