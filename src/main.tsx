import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Register service worker early so push events are received even before explicit subscription
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js").catch(() => {/* silent — non-critical */});
}

createRoot(document.getElementById("root")!).render(<App />);
