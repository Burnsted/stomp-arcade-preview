import { createRoot } from "react-dom/client";
import { TerrainPark } from "./terrain-park";

const root = document.getElementById("root");
if (!root) throw new Error("Missing #root");
createRoot(root).render(<TerrainPark />);
