import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// FORCE UNREGISTER SERVICE WORKER
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(function (registrations) {
        for (let registration of registrations) {
            registration.unregister().then(function () {
                console.log('Service Worker unregistered via main.tsx');
                // Optional: reload is dangerous if it loops, so we just log
            });
        }
    });
}

createRoot(document.getElementById("root")!).render(<App />);
