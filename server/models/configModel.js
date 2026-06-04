import path from "node:path";
import { config as serverConfig } from "../config.js";
import { readJsonFile } from "../utils/filesystem.js";

export const defaultAppConfig = {
  labName: "Fab Lab",
  stationName: "FabLabTV",
  tagline: "Live from the lab",
  logo: "/branding/current-logo.png",
  timezone: "Atlantic/Reykjavik",
  rotationSeconds: 20,
  newsRotationSeconds: 12,
  labPulseRotationSeconds: 18,
  videoAutoplay: true,
  videoMuted: true,
  videoObjectFit: "cover",
  enableWeather: true,
  enableNews: true,
  enableVisitorStats: true,
  enableMachineStats: true,
  enableAnnouncements: true,
  newsHeadlines: [
    "Welcome to FabLabTV",
    "Fab Academy project videos are playing now",
    "Use the remote page to change the on-call staff member"
  ],
  weather: {
    location: "Reykjavik",
    provider: "placeholder"
  },
  visitorStats: {
    provider: "placeholder"
  },
  machineStats: {
    provider: "placeholder"
  }
};

export async function loadAppConfig() {
  const filePath = path.join(serverConfig.dataDir, "config.json");
  const userConfig = await readJsonFile(filePath, {});
  return {
    ...defaultAppConfig,
    ...userConfig,
    weather: { ...defaultAppConfig.weather, ...(userConfig.weather || {}) },
    visitorStats: { ...defaultAppConfig.visitorStats, ...(userConfig.visitorStats || {}) },
    machineStats: { ...defaultAppConfig.machineStats, ...(userConfig.machineStats || {}) }
  };
}
