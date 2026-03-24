import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./i18n";

// Expose debug functions for console use
import {
  fixProviderDisplayName,
  getUserDocument,
  createProviderProfile,
} from "./lib/firestore";

declare global {
  interface Window {
    fixProviderDisplayName?: typeof fixProviderDisplayName;
    getUserDocument?: typeof getUserDocument;
    createProviderProfile?: typeof createProviderProfile;
  }
}

window.fixProviderDisplayName = fixProviderDisplayName;
window.getUserDocument = getUserDocument;
window.createProviderProfile = createProviderProfile;

createRoot(document.getElementById("root")!).render(<App />);
