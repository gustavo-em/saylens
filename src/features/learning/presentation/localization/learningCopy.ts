import type { LearningLanguage } from '../../domain/LearningLanguage';

export interface LearningCopy {
  tabs: { camera: string; settings: string };
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
    detectorAccessibility: (status: string, inferenceTimeMs?: number) => string;
  };
  settings: {
    title: string;
    subtitle: string;
    languagesSection: string;
    nativeLanguageTitle: string;
    nativeLanguageDescription: string;
    learningLanguageTitle: string;
    learningLanguageDescription: string;
    performanceSection: string;
    performanceTitle: string;
    performanceDescription: string;
    ultraPerformanceTitle: string;
    ultraPerformanceDescription: string;
    highPerformanceTitle: string;
    highPerformanceDescription: string;
    lowDeviceTitle: string;
    lowDeviceDescription: string;
  };
}

const languageNames: Record<
  LearningLanguage,
  Record<LearningLanguage, string>
> = {
  'pt-BR': { 'pt-BR': 'Português (Brasil)', en: 'Inglês', es: 'Espanhol' },
  en: { 'pt-BR': 'Portuguese (Brazil)', en: 'English', es: 'Spanish' },
  es: { 'pt-BR': 'Portugués (Brasil)', en: 'Inglés', es: 'Español' },
};

const shortLanguageNames: Record<
  LearningLanguage,
  Record<LearningLanguage, string>
> = {
  'pt-BR': { 'pt-BR': 'Português', en: 'Inglês', es: 'Espanhol' },
  en: { 'pt-BR': 'Portuguese', en: 'English', es: 'Spanish' },
  es: { 'pt-BR': 'Portugués', en: 'Inglés', es: 'Español' },
};

const copies: Record<
  LearningLanguage,
  Omit<LearningCopy, 'languageName' | 'languageShortName'>
> = {
  'pt-BR': {
    tabs: { camera: 'Câmera', settings: 'Configurações' },
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
      detectorAccessibility: (status, time) =>
        `Detector: ${status}${
          time == null ? '' : `, inferência em ${time} milissegundos`
        }.`,
    },
    settings: {
      title: 'Configurações',
      subtitle: 'Ajuste a experiência sem sair do modo de aprendizagem.',
      languagesSection: 'IDIOMAS',
      nativeLanguageTitle: 'Seu idioma',
      nativeLanguageDescription: 'Idioma usado na interface e nas explicações.',
      learningLanguageTitle: 'Quero aprender',
      learningLanguageDescription:
        'Idioma das palavras, pronúncias e exemplos.',
      performanceSection: 'PERFORMANCE',
      performanceTitle: 'Perfil do dispositivo',
      performanceDescription:
        'Escolha o equilíbrio ideal entre velocidade e uso de recursos.',
      ultraPerformanceTitle: 'Ultra performance',
      ultraPerformanceDescription: '4 CPU + 1 GPU · consumo máximo',
      highPerformanceTitle: 'Alto desempenho',
      highPerformanceDescription: '4 workers · mais detecções por segundo',
      lowDeviceTitle: 'Dispositivo básico',
      lowDeviceDescription: '2 workers · menor uso de CPU e memória',
    },
  },
  en: {
    tabs: { camera: 'Camera', settings: 'Settings' },
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
      detectorAccessibility: (status, time) =>
        `Detector: ${status}${
          time == null ? '' : `, inference in ${time} milliseconds`
        }.`,
    },
    settings: {
      title: 'Settings',
      subtitle: 'Tune the experience without leaving learning mode.',
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
        'Choose the best balance between speed and resource usage.',
      ultraPerformanceTitle: 'Ultra performance',
      ultraPerformanceDescription: '4 CPU + 1 GPU · maximum power usage',
      highPerformanceTitle: 'High performance',
      highPerformanceDescription: '4 workers · more detections per second',
      lowDeviceTitle: 'Basic device',
      lowDeviceDescription: '2 workers · lower CPU and memory usage',
    },
  },
  es: {
    tabs: { camera: 'Cámara', settings: 'Configuración' },
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
      detectorAccessibility: (status, time) =>
        `Detector: ${status}${
          time == null ? '' : `, inferencia en ${time} milisegundos`
        }.`,
    },
    settings: {
      title: 'Configuración',
      subtitle: 'Ajusta la experiencia sin salir del modo de aprendizaje.',
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
        'Elige el mejor equilibrio entre velocidad y uso de recursos.',
      ultraPerformanceTitle: 'Rendimiento ultra',
      ultraPerformanceDescription: '4 CPU + 1 GPU · consumo máximo',
      highPerformanceTitle: 'Alto rendimiento',
      highPerformanceDescription: '4 workers · más detecciones por segundo',
      lowDeviceTitle: 'Dispositivo básico',
      lowDeviceDescription: '2 workers · menor uso de CPU y memoria',
    },
  },
};

export function getLearningCopy(language: LearningLanguage): LearningCopy {
  return {
    ...copies[language],
    languageName: target => languageNames[language][target],
    languageShortName: target => shortLanguageNames[language][target],
  };
}
