import React from "https://esm.sh/react";
import { createRoot } from "https://esm.sh/react-dom/client";
import AllocationDashboard from "./components/AllocationDashboard.jsx";

const container = document.getElementById("root");
const root = createRoot(container);
root.render(<AllocationDashboard />);
