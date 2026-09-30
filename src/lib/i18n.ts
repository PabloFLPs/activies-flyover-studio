import type { Lang, OverlayKey, Sport } from "./types";

export type { Lang };
export const LANGS: Lang[] = ["pt-BR", "en-US"];

export const LANG_NAMES: Record<Lang, string> = {
  "pt-BR": "Português",
  "en-US": "English",
};
/** Short label for the language toggle. */
export const LANG_SHORT: Record<Lang, string> = {
  "pt-BR": "PT",
  "en-US": "EN",
};

interface Dict {
  header: { subtitle: string };
  menu: { settings: string; language: string; theme: string; accent: string };
  theme: { dark: string; light: string };
  on: string;
  off: string;
  sidebar: {
    activityFile: string;
    dropOrBrowse: string;
    fileFormats: string;
    loadDemo: string;
    identity: string;
    athletePlaceholder: string;
    locationPlaceholder: string;
    weatherManual: string;
    weatherTempPlaceholder: string;
    weatherCondition: string;
    sport: string;
    camera: string;
    tilt: string;
    introOutro: string;
    overlays: string;
    videoLength: string;
    exportFormat: string;
    exportHelpMp4: string;
    exportHelpPng: string;
    summaryDistance: string;
    summaryDuration: string;
    summaryPoints: string;
  };
  transport: {
    export: string;
    recording: string;
    play: string;
    pause: string;
    restart: string;
    timeline: string;
  };
  empty: { title: string; formats: string; demo: string };
  consent: { text: string; accept: string; decline: string };
  errors: { readFail: string };
  sportLabel: Record<Sport, string>;
  sportShort: Record<Sport, string>;
  badge: Record<Sport, string>;
  overlay: Record<OverlayKey, string>;
  hud: {
    distance: string;
    time: string;
    pace: string;
    speed: string;
    maxSpeed: string;
    elevGain: string;
    heartRate: string;
    calories: string;
    elevation: string;
    route: string;
    gainSuffix: string;
    weatherNA: string;
  };
  weather: {
    clear: string;
    partly: string;
    overcast: string;
    fog: string;
    drizzle: string;
    rain: string;
    heavyRain: string;
    snow: string;
    showers: string;
    thunder: string;
  };
}

const pt: Dict = {
  header: { subtitle: "Atividade → vídeo cinematográfico" },
  menu: {
    settings: "Ajustes",
    language: "Idioma",
    theme: "Tema",
    accent: "Cor de destaque",
  },
  theme: { dark: "Escuro", light: "Claro" },
  on: "LIG",
  off: "DES",
  sidebar: {
    activityFile: "Arquivo da atividade",
    dropOrBrowse: "Solte o arquivo ou procure",
    fileFormats: "GPX · GeoJSON · FIT · KML",
    loadDemo: "Carregar atividade demo",
    identity: "Identidade",
    athletePlaceholder: "Nome do atleta",
    locationPlaceholder: "Local (ex.: Praça da Liberdade, BH)",
    weatherManual: "Definir clima manualmente",
    weatherTempPlaceholder: "Temperatura (°C)",
    weatherCondition: "Condição",
    sport: "Esporte",
    camera: "Câmera",
    tilt: "Inclinação",
    introOutro: "Fly-in de abertura e encerramento",
    overlays: "Sobreposições",
    videoLength: "Duração do vídeo",
    exportFormat: "Formato de exportação",
    exportHelpMp4:
      "Vídeo HD .mp4 (H.264, 1080×1920) — toca em qualquer lugar, incluindo Instagram e TikTok. Usa o codificador nativo do seu navegador.",
    exportHelpPng:
      "Imagem .png (1080×1920) — um quadro do momento atual da atividade, ideal para posts e stories.",
    summaryDistance: "Distância",
    summaryDuration: "Duração",
    summaryPoints: "Pontos",
  },
  transport: {
    export: "Exportar",
    recording: "Gravando",
    play: "Reproduzir",
    pause: "Pausar",
    restart: "Reiniciar",
    timeline: "Linha do tempo",
  },
  empty: {
    title: "Solte uma atividade",
    formats: "GPX · GeoJSON · FIT · KML",
    demo: "ou carregue a demonstração",
  },
  consent: {
    text: "Este site guarda apenas suas preferências de tema e cor de destaque neste navegador (armazenamento local). Nada de rastreamento.",
    accept: "Aceitar",
    decline: "Recusar",
  },
  errors: { readFail: "Não foi possível ler este arquivo." },
  sportLabel: {
    running: "Corrida",
    cycling: "Ciclismo",
    hiking: "Trilha",
    walking: "Caminhada",
    swimming: "Natação",
  },
  sportShort: {
    running: "Corrida",
    cycling: "Pedal",
    hiking: "Trilha",
    walking: "Caminhada",
    swimming: "Natação",
  },
  badge: {
    running: "CORRIDA",
    cycling: "PEDAL",
    hiking: "TRILHA",
    walking: "CAMINHADA",
    swimming: "NATAÇÃO",
  },
  overlay: {
    distance: "Distância",
    duration: "Duração",
    pace: "Ritmo / vel.",
    maxspeed: "Vel. máx",
    elevgain: "Ganho elev.",
    elevchart: "Gráfico elev.",
    hr: "Freq. cardíaca",
    calories: "Calorias",
    datetime: "Data e local",
    routemap: "Mini-mapa",
    name: "Nome do atleta",
    weather: "Clima",
  },
  hud: {
    distance: "DISTÂNCIA",
    time: "TEMPO",
    pace: "RITMO",
    speed: "VELOCIDADE",
    maxSpeed: "VEL. MÁX",
    elevGain: "GANHO ELEV.",
    heartRate: "FREQ. CARDÍACA",
    calories: "CALORIAS",
    elevation: "ELEVAÇÃO",
    route: "ROTA",
    gainSuffix: "m de ganho",
    weatherNA: "clima indisponível",
  },
  weather: {
    clear: "Céu limpo",
    partly: "Parc. nublado",
    overcast: "Nublado",
    fog: "Neblina",
    drizzle: "Garoa",
    rain: "Chuva",
    heavyRain: "Chuva forte",
    snow: "Neve",
    showers: "Pancadas",
    thunder: "Tempestade",
  },
};

const en: Dict = {
  header: { subtitle: "Activity → cinematic video" },
  menu: {
    settings: "Settings",
    language: "Language",
    theme: "Theme",
    accent: "Accent",
  },
  theme: { dark: "Dark", light: "Light" },
  on: "ON",
  off: "OFF",
  sidebar: {
    activityFile: "Activity file",
    dropOrBrowse: "Drop file or browse",
    fileFormats: "GPX · GeoJSON · FIT · KML",
    loadDemo: "Load demo activity",
    identity: "Identity",
    athletePlaceholder: "Athlete name",
    locationPlaceholder: "Location (e.g. Central Park, NY)",
    weatherManual: "Set weather manually",
    weatherTempPlaceholder: "Temperature (°C)",
    weatherCondition: "Condition",
    sport: "Sport",
    camera: "Camera",
    tilt: "Tilt",
    introOutro: "Intro & outro fly-in",
    overlays: "Overlays",
    videoLength: "Video length",
    exportFormat: "Export format",
    exportHelpMp4:
      "HD .mp4 video (H.264, 1080×1920) — plays everywhere including Instagram & TikTok. Uses your browser's native encoder.",
    exportHelpPng:
      "A .png image (1080×1920) — a single frame of the current view of the activity, great for posts and stories.",
    summaryDistance: "Distance",
    summaryDuration: "Duration",
    summaryPoints: "Points",
  },
  transport: {
    export: "Export",
    recording: "Recording",
    play: "Play",
    pause: "Pause",
    restart: "Restart",
    timeline: "Timeline",
  },
  empty: {
    title: "Drop an activity",
    formats: "GPX · GeoJSON · FIT · KML",
    demo: "or load the demo run",
  },
  consent: {
    text: "This site stores only your theme and accent-color preference in this browser (local storage). No tracking.",
    accept: "Accept",
    decline: "Decline",
  },
  errors: { readFail: "Could not read this file." },
  sportLabel: {
    running: "Running",
    cycling: "Cycling",
    hiking: "Trail / hiking",
    walking: "Walking",
    swimming: "Swimming",
  },
  sportShort: {
    running: "Run",
    cycling: "Ride",
    hiking: "Hike",
    walking: "Walk",
    swimming: "Swim",
  },
  badge: {
    running: "RUN",
    cycling: "RIDE",
    hiking: "HIKE",
    walking: "WALK",
    swimming: "SWIM",
  },
  overlay: {
    distance: "Distance",
    duration: "Duration",
    pace: "Pace / speed",
    maxspeed: "Max speed",
    elevgain: "Elev gain",
    elevchart: "Elev chart",
    hr: "Heart rate",
    calories: "Calories",
    datetime: "Date & location",
    routemap: "Route map",
    name: "Athlete name",
    weather: "Weather",
  },
  hud: {
    distance: "DISTANCE",
    time: "TIME",
    pace: "PACE",
    speed: "SPEED",
    maxSpeed: "MAX SPEED",
    elevGain: "ELEV GAIN",
    heartRate: "HEART RATE",
    calories: "CALORIES",
    elevation: "ELEVATION",
    route: "ROUTE",
    gainSuffix: "m gain",
    weatherNA: "weather unavailable",
  },
  weather: {
    clear: "Clear",
    partly: "Partly cloudy",
    overcast: "Overcast",
    fog: "Fog",
    drizzle: "Drizzle",
    rain: "Rain",
    heavyRain: "Heavy rain",
    snow: "Snow",
    showers: "Showers",
    thunder: "Thunderstorm",
  },
};

const DICTS: Record<Lang, Dict> = { "pt-BR": pt, "en-US": en };

export function tr(lang: Lang): Dict {
  return DICTS[lang] ?? pt;
}

export type TDict = Dict;

/** BCP-47 tag for Intl / toLocaleDateString. */
export function localeTag(lang: Lang): string {
  return lang;
}
