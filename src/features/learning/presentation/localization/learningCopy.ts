import {
  languageBase,
  type LanguageBase,
  type LearningLanguage,
} from '../../domain/LearningLanguage';

export interface LearningCopy {
  tabs: { camera: string; settings: string };
  history: {
    title: string;
    subtitle: string;
    empty: string;
    tapToHear: string;
    justNow: string;
    minutesAgo: (minutes: number) => string;
    hoursAgo: (hours: number) => string;
    daysAgo: (days: number) => string;
  };
  languageName: (language: LearningLanguage) => string;
  languageShortName: (language: LearningLanguage) => string;
  camera: {
    caption: (language: LearningLanguage) => string;
    permissionTitle: string;
    permissionBody: string;
    requestPending: string;
    requestPermission: string;
    openSettings: string;
    permissionRequestFailed: string;
    settingsOpenFailed: string;
    previewFailed: string;
    recognitionUnavailable: string;
    unavailable: string;
    analyzing: string;
    searching: string;
    objectsDetected: (count: number) => string;
    meaningLabel: string;
    pronunciationLabel: string;
    tapToHearPronunciation: string;
    tapToChangeLanguages: string;
    tapToFreeze: string;
    tapToResume: string;
    frozen: string;
    live: string;
    pronunciationUnavailable: string;
    detectorAccessibility: (status: string, inferenceTimeMs?: number) => string;
  };
  settings: {
    title: string;
    subtitle: string;
    appearanceSection: string;
    appearanceTitle: string;
    appearanceDescription: string;
    lightMode: string;
    darkMode: string;
    languagesSection: string;
    nativeLanguageTitle: string;
    nativeLanguageDescription: string;
    learningLanguageTitle: string;
    learningLanguageDescription: string;
    performanceSection: string;
    performanceTitle: string;
    performanceDescription: string;
    maximumPerformanceTitle: string;
    maximumPerformanceDescription: string;
    powerSavingTitle: string;
    powerSavingDescription: string;
    diagnosticsTitle: string;
    diagnosticsDescription: string;
    diagnosticsOn: string;
    diagnosticsOff: string;
  };
}

const languageNames: Record<LanguageBase, Record<LearningLanguage, string>> = {
  'pt-BR': {
    'pt-BR': 'Português (Brasil)',
    'en-US': 'Inglês (EUA)',
    'en-GB': 'Inglês (Reino Unido)',
    es: 'Espanhol',
  },
  en: {
    'pt-BR': 'Portuguese (Brazil)',
    'en-US': 'English (US)',
    'en-GB': 'English (UK)',
    es: 'Spanish',
  },
  es: {
    'pt-BR': 'Portugués (Brasil)',
    'en-US': 'Inglés (EE. UU.)',
    'en-GB': 'Inglés (Reino Unido)',
    es: 'Español',
  },
};

const shortLanguageNames: Record<
  LanguageBase,
  Record<LearningLanguage, string>
> = {
  'pt-BR': {
    'pt-BR': 'Português',
    'en-US': 'Inglês (EUA)',
    'en-GB': 'Inglês (RU)',
    es: 'Espanhol',
  },
  en: {
    'pt-BR': 'Portuguese',
    'en-US': 'English (US)',
    'en-GB': 'English (UK)',
    es: 'Spanish',
  },
  es: {
    'pt-BR': 'Portugués',
    'en-US': 'Inglés (EE. UU.)',
    'en-GB': 'Inglés (RU)',
    es: 'Español',
  },
};

const copies: Record<
  LanguageBase,
  Omit<LearningCopy, 'languageName' | 'languageShortName'>
> = {
  'pt-BR': {
    tabs: { camera: 'Câmera', settings: 'Configurações' },
    history: {
      title: 'Vistos recentemente',
      subtitle: 'Os últimos 15 objetos que você reconheceu.',
      empty: 'Aponte a câmera para um objeto para começar seu histórico.',
      tapToHear: 'Toque para ouvir de novo.',
      justNow: 'agora há pouco',
      minutesAgo: minutes => `há ${minutes} min`,
      hoursAgo: hours => `há ${hours} h`,
      daysAgo: days => (days === 1 ? 'ontem' : `há ${days} dias`),
    },
    camera: {
      caption: language =>
        `Explore ${languageNames['pt-BR'][
          language
        ].toLowerCase()} ao seu redor`,
      permissionTitle: 'A câmera é o começo',
      permissionBody:
        'Permita o acesso para reconhecer objetos e praticar idiomas em tempo real.',
      requestPending: 'SOLICITANDO…',
      requestPermission: 'PERMITIR CÂMERA',
      openSettings: 'ABRIR CONFIGURAÇÕES',
      permissionRequestFailed: 'Não foi possível solicitar acesso à câmera.',
      settingsOpenFailed: 'Não foi possível abrir as configurações da câmera.',
      previewFailed: 'Não foi possível iniciar a câmera.',
      recognitionUnavailable: 'O reconhecimento de objetos ficou indisponível.',
      unavailable: 'INDISPONÍVEL',
      analyzing: 'ANALISANDO',
      searching: 'PROCURANDO',
      objectsDetected: count => `${count} OBJETO${count === 1 ? '' : 'S'}`,
      meaningLabel: 'SIGNIFICADO',
      pronunciationLabel: 'PRONÚNCIA',
      tapToHearPronunciation: 'Toque para ouvir a pronúncia.',
      tapToChangeLanguages: 'Toque para escolher os idiomas.',
      tapToFreeze: 'Toque para congelar a cena.',
      tapToResume: 'Toque para voltar ao tempo real.',
      frozen: 'CONGELADO',
      live: 'AO VIVO',
      pronunciationUnavailable:
        'A pronúncia não está disponível neste aparelho.',
      detectorAccessibility: (status, time) =>
        `Detector: ${status}${
          time == null ? '' : `, inferência em ${time} milissegundos`
        }.`,
    },
    settings: {
      title: 'Configurações',
      subtitle: 'Ajuste a experiência sem sair do modo de aprendizagem.',
      appearanceSection: 'APARÊNCIA',
      appearanceTitle: 'Tema do aplicativo',
      appearanceDescription: 'Escolha como o SayLens aparece para você.',
      lightMode: 'Claro',
      darkMode: 'Escuro',
      languagesSection: 'IDIOMAS',
      nativeLanguageTitle: 'Seu idioma',
      nativeLanguageDescription: 'Idioma usado na interface e nas explicações.',
      learningLanguageTitle: 'Quero aprender',
      learningLanguageDescription:
        'Idioma das palavras, pronúncias e exemplos.',
      performanceSection: 'PERFORMANCE',
      performanceTitle: 'Perfil do dispositivo',
      performanceDescription:
        'Escolha entre toda a potência disponível ou o menor consumo possível.',
      maximumPerformanceTitle: 'Máximo desempenho',
      maximumPerformanceDescription:
        'Reconhecimento mais rápido e fluido. Usa mais bateria.',
      powerSavingTitle: 'Modo economia',
      powerSavingDescription:
        'Poupa bateria e evita aquecimento. Reconhecimento mais lento.',
      diagnosticsTitle: 'Painel de diagnóstico',
      diagnosticsDescription:
        'Mostra taxa do detector, latência e memória sobre a câmera.',
      diagnosticsOn: 'Ligado',
      diagnosticsOff: 'Desligado',
    },
  },
  en: {
    tabs: { camera: 'Camera', settings: 'Settings' },
    history: {
      title: 'Recently seen',
      subtitle: 'The last 15 objects you recognised.',
      empty: 'Point the camera at an object to start your history.',
      tapToHear: 'Tap to hear it again.',
      justNow: 'just now',
      minutesAgo: minutes => `${minutes} min ago`,
      hoursAgo: hours => `${hours} h ago`,
      daysAgo: days => (days === 1 ? 'yesterday' : `${days} days ago`),
    },
    camera: {
      caption: language =>
        `Explore ${languageNames.en[language].toLowerCase()} around you`,
      permissionTitle: 'The camera is the starting point',
      permissionBody:
        'Allow access to recognize objects and practice languages in real time.',
      requestPending: 'REQUESTING…',
      requestPermission: 'ALLOW CAMERA',
      openSettings: 'OPEN SETTINGS',
      permissionRequestFailed: 'Unable to request camera access.',
      settingsOpenFailed: 'Unable to open camera settings.',
      previewFailed: 'Unable to start the camera.',
      recognitionUnavailable: 'Object recognition is unavailable.',
      unavailable: 'UNAVAILABLE',
      analyzing: 'ANALYZING',
      searching: 'SEARCHING',
      objectsDetected: count => `${count} OBJECT${count === 1 ? '' : 'S'}`,
      meaningLabel: 'MEANING',
      pronunciationLabel: 'PRONUNCIATION',
      tapToHearPronunciation: 'Tap to hear the pronunciation.',
      tapToChangeLanguages: 'Tap to choose the languages.',
      tapToFreeze: 'Tap to freeze the scene.',
      tapToResume: 'Tap to go back to live.',
      frozen: 'FROZEN',
      live: 'LIVE',
      pronunciationUnavailable:
        'Pronunciation is not available on this device.',
      detectorAccessibility: (status, time) =>
        `Detector: ${status}${
          time == null ? '' : `, inference in ${time} milliseconds`
        }.`,
    },
    settings: {
      title: 'Settings',
      subtitle: 'Tune the experience without leaving learning mode.',
      appearanceSection: 'APPEARANCE',
      appearanceTitle: 'App theme',
      appearanceDescription: 'Choose how SayLens looks for you.',
      lightMode: 'Light',
      darkMode: 'Dark',
      languagesSection: 'LANGUAGES',
      nativeLanguageTitle: 'Your language',
      nativeLanguageDescription:
        'Language used in the interface and explanations.',
      learningLanguageTitle: 'I want to learn',
      learningLanguageDescription:
        'Language used for words, pronunciations, and examples.',
      performanceSection: 'PERFORMANCE',
      performanceTitle: 'Device profile',
      performanceDescription:
        'Choose between all available power or the lowest possible usage.',
      maximumPerformanceTitle: 'Maximum performance',
      maximumPerformanceDescription:
        'Faster, smoother recognition. Uses more battery.',
      powerSavingTitle: 'Power saving',
      powerSavingDescription:
        'Saves battery and avoids heating. Slower recognition.',
      diagnosticsTitle: 'Diagnostics panel',
      diagnosticsDescription:
        'Shows detector rate, latency and memory over the camera.',
      diagnosticsOn: 'On',
      diagnosticsOff: 'Off',
    },
  },
  es: {
    tabs: { camera: 'Cámara', settings: 'Configuración' },
    history: {
      title: 'Vistos recientemente',
      subtitle: 'Los últimos 15 objetos que reconociste.',
      empty: 'Apunta la cámara a un objeto para empezar tu historial.',
      tapToHear: 'Toca para escucharlo de nuevo.',
      justNow: 'hace un momento',
      minutesAgo: minutes => `hace ${minutes} min`,
      hoursAgo: hours => `hace ${hours} h`,
      daysAgo: days => (days === 1 ? 'ayer' : `hace ${days} días`),
    },
    camera: {
      caption: language =>
        `Explora ${languageNames.es[language].toLowerCase()} a tu alrededor`,
      permissionTitle: 'La cámara es el comienzo',
      permissionBody:
        'Permite el acceso para reconocer objetos y practicar idiomas en tiempo real.',
      requestPending: 'SOLICITANDO…',
      requestPermission: 'PERMITIR CÁMARA',
      openSettings: 'ABRIR CONFIGURACIÓN',
      permissionRequestFailed: 'No se pudo solicitar acceso a la cámara.',
      settingsOpenFailed: 'No se pudo abrir la configuración de la cámara.',
      previewFailed: 'No se pudo iniciar la cámara.',
      recognitionUnavailable:
        'El reconocimiento de objetos no está disponible.',
      unavailable: 'NO DISPONIBLE',
      analyzing: 'ANALIZANDO',
      searching: 'BUSCANDO',
      objectsDetected: count => `${count} OBJETO${count === 1 ? '' : 'S'}`,
      meaningLabel: 'SIGNIFICADO',
      pronunciationLabel: 'PRONUNCIACIÓN',
      tapToHearPronunciation: 'Toca para escuchar la pronunciación.',
      tapToChangeLanguages: 'Toca para elegir los idiomas.',
      tapToFreeze: 'Toca para congelar la escena.',
      tapToResume: 'Toca para volver al tiempo real.',
      frozen: 'CONGELADO',
      live: 'EN VIVO',
      pronunciationUnavailable:
        'La pronunciación no está disponible en este dispositivo.',
      detectorAccessibility: (status, time) =>
        `Detector: ${status}${
          time == null ? '' : `, inferencia en ${time} milisegundos`
        }.`,
    },
    settings: {
      title: 'Configuración',
      subtitle: 'Ajusta la experiencia sin salir del modo de aprendizaje.',
      appearanceSection: 'APARIENCIA',
      appearanceTitle: 'Tema de la aplicación',
      appearanceDescription: 'Elige cómo se muestra SayLens.',
      lightMode: 'Claro',
      darkMode: 'Oscuro',
      languagesSection: 'IDIOMAS',
      nativeLanguageTitle: 'Tu idioma',
      nativeLanguageDescription:
        'Idioma usado en la interfaz y las explicaciones.',
      learningLanguageTitle: 'Quiero aprender',
      learningLanguageDescription:
        'Idioma de las palabras, pronunciaciones y ejemplos.',
      performanceSection: 'RENDIMIENTO',
      performanceTitle: 'Perfil del dispositivo',
      performanceDescription:
        'Elige entre toda la potencia disponible o el menor consumo posible.',
      maximumPerformanceTitle: 'Máximo rendimiento',
      maximumPerformanceDescription:
        'Reconocimiento más rápido y fluido. Usa más batería.',
      powerSavingTitle: 'Modo ahorro',
      powerSavingDescription:
        'Ahorra batería y evita el calentamiento. Reconocimiento más lento.',
      diagnosticsTitle: 'Panel de diagnóstico',
      diagnosticsDescription:
        'Muestra tasa del detector, latencia y memoria sobre la cámara.',
      diagnosticsOn: 'Activado',
      diagnosticsOff: 'Desactivado',
    },
  },
};

export function getLearningCopy(language: LearningLanguage): LearningCopy {
  const base = languageBase(language);

  return {
    ...copies[base],
    languageName: target => languageNames[base][target],
    languageShortName: target => shortLanguageNames[base][target],
  };
}
