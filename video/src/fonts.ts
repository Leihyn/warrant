import { loadFont as loadSerif } from "@remotion/google-fonts/InstrumentSerif";
import { loadFont as loadMono } from "@remotion/google-fonts/JetBrainsMono";
import { loadFont as loadSans } from "@remotion/google-fonts/Archivo";

export const { fontFamily: serif } = loadSerif();
export const { fontFamily: mono } = loadMono();
export const { fontFamily: sans } = loadSans();
