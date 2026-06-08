import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

export const config = {
  port: process.env.PORT || 3000,
  projectRoot,
  videosDir: path.join(projectRoot, "videos"),
  slidesDir: path.join(projectRoot, "slides"),
  staffDir: path.join(projectRoot, "staff"),
  clientDir: path.join(projectRoot, "client"),
  dataDir: path.join(projectRoot, "data"),
  brandingDir: path.join(projectRoot, "branding"),
  localPulseMediaDir: path.join(projectRoot, "data", "local-pulse-media"),

  videoExtensions: [".mp4", ".webm", ".mov", ".m4v"],
  staffImageExtensions: [".jpg", ".jpeg", ".png", ".webp", ".gif"],

  defaultNews: [
    "Welcome to FabLabTV",
    "Fab Academy project videos are playing now",
    "Use the remote page to change the on-call staff member",
    "Add your visitor log integration to power the Lab Pulse banner"
  ]
};
