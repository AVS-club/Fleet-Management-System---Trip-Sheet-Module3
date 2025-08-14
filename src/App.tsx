import React, { Suspense, useEffect, useState } from "react";
import {
    return () => {
      subscription?.unsubscribe();
    };
  }, [navigate]);

  );
}

// Wrap App with Router to use useNavigate within App
const AppWrapper: React.FC = () => (
  <Router>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </Router>
);

export default AppWrapper;