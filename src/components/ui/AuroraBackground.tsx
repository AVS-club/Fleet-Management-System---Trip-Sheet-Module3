import React from 'react';

const AuroraBackground: React.FC = () => {
  return (
    <>
      <style>{`
        :root {
          /* Light mode colors */
          --avs-green: #16A34A; /* emerald-600 */
          --avs-mint: #34D399;  /* emerald-300 */
          --avs-deep: #065F46;  /* teal-900-ish */
          --avs-ice: #F1F5F9;   /* slate-100 */

          /* Dark mode colors */
          --avs-dark-green: #10B981; /* emerald-500 */
          --avs-dark-mint: #6EE7B7;  /* emerald-300 */
          --avs-dark-deep: #047857;  /* emerald-700 */
          --avs-dark-bg: #0F172A;    /* slate-900 */
        }

        html, body {
          background: var(--avs-ice);
        }

        html.dark, html.dark body {
          background: var(--avs-dark-bg);
        }

        /* Light mode aurora */
        .avs-aurora {
          background:
            radial-gradient(60rem 60rem at 10% 15%, rgba(22, 163, 74, 0.3) 0%, transparent 60%),
            radial-gradient(50rem 50rem at 85% 25%, rgba(52, 211, 153, 0.25) 0%, transparent 60%),
            radial-gradient(65rem 65rem at 80% 85%, rgba(6, 95, 70, 0.2) 0%, transparent 60%),
            radial-gradient(70rem 70rem at 15% 80%, rgba(22, 163, 74, 0.2) 0%, transparent 60%);
          filter: blur(22px) saturate(1.05);
          animation: avsDrift 22s ease-in-out infinite alternate;
        }

        /* Dark mode aurora */
        html.dark .avs-aurora {
          background:
            radial-gradient(60rem 60rem at 10% 15%, rgba(16, 185, 129, 0.15) 0%, transparent 65%),
            radial-gradient(50rem 50rem at 85% 25%, rgba(110, 231, 183, 0.12) 0%, transparent 65%),
            radial-gradient(65rem 65rem at 80% 85%, rgba(4, 120, 87, 0.1) 0%, transparent 65%),
            radial-gradient(70rem 70rem at 15% 80%, rgba(16, 185, 129, 0.12) 0%, transparent 65%);
          filter: blur(24px) saturate(1.1);
        }

        /* tiny animated grain to avoid banding - light mode */
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

        /* Dark mode grain - slightly more visible */
        html.dark .avs-aurora::after {
          background-image: url("data:image/svg+xml;utf8,\
          <svg xmlns='http://www.w3.org/2000/svg' width='140' height='140' viewBox='0 0 140 140'>\
          <filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='2' stitchTiles='stitch'/></filter>\
          <rect width='100%' height='100%' filter='url(%23n)' opacity='0.035'/></svg>");
          mix-blend-mode: soft-light;
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

        html.dark @keyframes avsNoise {
          0% { opacity: .03 }
          100% { opacity: .04 }
        }

        @media (prefers-reduced-motion: reduce) {
          .avs-aurora, .avs-aurora::after {
            animation: none
          }
        }

        /* Light mode center mist for readability */
        .avs-center-mist {
          background: radial-gradient(ellipse_at_center,rgba(255,255,255,0.75) 0%,rgba(255,255,255,0.55) 40%,rgba(255,255,255,0.65) 100%);
        }

        /* Dark mode center mist - darker with subtle green tint */
        html.dark .avs-center-mist {
          background: radial-gradient(ellipse_at_center,rgba(15,23,42,0.7) 0%,rgba(15,23,42,0.5) 40%,rgba(15,23,42,0.6) 100%);
        }
      `}</style>

      {/* Background — Aurora Blobs */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="avs-aurora absolute inset-0"></div>
        {/* Adaptive center mist to keep the card readable */}
        <div className="absolute inset-0 avs-center-mist"></div>
      </div>
    </>
  );
};

export default AuroraBackground;
