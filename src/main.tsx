import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initializeGoogleConsent } from "./lib/analytics.ts";

initializeGoogleConsent();

createRoot(document.getElementById("root")!).render(<App />);
