import { createRoot } from "react-dom/client";
import { App } from "./app";
import invariant from 'tiny-invariant'

const container = document.getElementById("app");
invariant(container)

const root = createRoot(container)
root.render(<App />);
