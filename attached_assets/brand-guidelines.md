Logo Typography Specifications
css/* Main Title: "Auto Vital Solution" */
.brand-title {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', sans-serif;
  font-size: 56px;
  font-weight: 700;
  letter-spacing: -0.02em;
  line-height: 1.1;
}

/* "Auto Vital" - Black portion */
.brand-name {
  color: #1F2937;  /* Dark gray-black */
}

/* "Solution" - Green portion */
.brand-solution {
  color: #059669;  /* Emerald-700 */
}

/* Tagline: "INTELLIGENT FLEET MANAGEMENT" */
.brand-tagline {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', sans-serif;
  font-size: 28px;
  font-weight: 400;
  letter-spacing: 0.15em;  /* Wide spacing for uppercase */
  text-transform: uppercase;
  color: #6B7280;  /* Gray-500 */
  margin-top: 8px;
}
React/Tailwind Implementation
jsx<div className="text-center">
  <h1 className="text-5xl font-bold tracking-tight leading-tight">
    <span className="text-gray-900">Auto Vital</span>
    <span className="text-emerald-700"> Solution</span>
  </h1>
  <p className="text-2xl font-normal tracking-[0.15em] uppercase text-gray-500 mt-2">
    Intelligent Fleet Management
  </p>
</div>
Exact Color Values
Black (Auto Vital):  #1F2937 or rgb(31, 41, 55)
Green (Solution):    #059669 or rgb(5, 150, 105)
Gray (Tagline):      #6B7280 or rgb(107, 114, 128)
Key Design Details

Font Weight Contrast: Heavy bold (700) for main title, regular (400) for tagline
Letter Spacing: Tight (-0.02em) for title, wide (0.15em) for tagline
Size Ratio: Title is approximately 2x the tagline size
Vertical Spacing: 8-12px gap between title and tagline
Alignment: Center-aligned

Save this as brand-guidelines.md or incorporate directly into your component!