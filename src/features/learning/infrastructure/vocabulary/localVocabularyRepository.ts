import type { VocabularyRepository } from '../../application/ports/VocabularyRepository';
import type { LearningLanguage } from '../../domain/LearningLanguage';
import type { VocabularyEntry } from '../../domain/VocabularyEntry';

type LocalizedWord = Pick<
  VocabularyEntry,
  'word' | 'pronunciation' | 'pronunciationHint' | 'example'
>;

type VocabularyRecord = Record<LearningLanguage, LocalizedWord>;

function word(
  value: string,
  pronunciation: string,
  pronunciationHint: string,
  example: string,
): LocalizedWord {
  return { word: value, pronunciation, pronunciationHint, example };
}

const entries: Record<string, VocabularyRecord> = {
  person: {
    'pt-BR': word(
      'Pessoa',
      '/peˈsoɐ/',
      'pe-SÔ-a',
      'Aquela pessoa é minha amiga.',
    ),
    en: word('Person', '/ˈpɝː.sən/', 'PÂR-sân', 'That person is my friend.'),
    es: word('Persona', '/peɾˈsona/', 'per-SÔ-na', 'Esa persona es mi amiga.'),
  },
  bottle: {
    'pt-BR': word(
      'Garrafa',
      '/ɡaˈʁafɐ/',
      'ga-RÁ-fa',
      'Esta é minha garrafa de água.',
    ),
    en: word('Bottle', '/ˈbɑː.t̬əl/', 'BÓ-tl', 'This is my water bottle.'),
    es: word('Botella', '/boˈteʎa/', 'bo-TÊ-ia', 'Esta es mi botella de agua.'),
  },
  cup: {
    'pt-BR': word('Copo', '/ˈkopu/', 'CÔ-po', 'O copo está sobre a mesa.'),
    en: word('Cup', '/kʌp/', 'CÂP', 'The cup is on the table.'),
    es: word('Taza', '/ˈtasa/', 'TÁ-sa', 'La taza está sobre la mesa.'),
  },
  chair: {
    'pt-BR': word(
      'Cadeira',
      '/kaˈdejɾɐ/',
      'ca-DÊI-ra',
      'Por favor, sente na cadeira.',
    ),
    en: word('Chair', '/tʃer/', 'TCHÉR', 'Please sit on the chair.'),
    es: word('Silla', '/ˈsiʎa/', 'SÍ-ia', 'Por favor, siéntate en la silla.'),
  },
  couch: {
    'pt-BR': word('Sofá', '/soˈfa/', 'so-FÁ', 'O sofá é muito confortável.'),
    en: word('Couch', '/kaʊtʃ/', 'CÁUTCH', 'The couch is very comfortable.'),
    es: word('Sofá', '/soˈfa/', 'so-FÁ', 'El sofá es muy cómodo.'),
  },
  table: {
    'pt-BR': word(
      'Mesa',
      '/ˈmezɐ/',
      'MÊ-za',
      'Suas chaves estão sobre a mesa.',
    ),
    en: word('Table', '/ˈteɪ.bəl/', 'TÊI-bâl', 'Your keys are on the table.'),
    es: word('Mesa', '/ˈmesa/', 'MÊ-sa', 'Tus llaves están sobre la mesa.'),
  },
  book: {
    'pt-BR': word('Livro', '/ˈlivɾu/', 'LÍ-vro', 'Estou lendo um bom livro.'),
    en: word('Book', '/bʊk/', 'BUK', 'I am reading a good book.'),
    es: word('Libro', '/ˈliβɾo/', 'LÍ-bro', 'Estoy leyendo un buen libro.'),
  },
  laptop: {
    'pt-BR': word(
      'Notebook',
      '/ˈnoʊt.bʊk/',
      'NÔUT-buk',
      'Meu notebook está na mesa.',
    ),
    en: word('Laptop', '/ˈlæp.tɑːp/', 'LÉP-top', 'My laptop is on the desk.'),
    es: word(
      'Portátil',
      '/poɾˈtatil/',
      'por-TÁ-til',
      'Mi portátil está sobre el escritorio.',
    ),
  },
  keyboard: {
    'pt-BR': word(
      'Teclado',
      '/teˈkladu/',
      'te-CLÁ-do',
      'Eu digito no teclado.',
    ),
    en: word('Keyboard', '/ˈkiː.bɔːrd/', 'KÍ-bórd', 'I type on the keyboard.'),
    es: word('Teclado', '/teˈklaðo/', 'te-CLÁ-do', 'Escribo en el teclado.'),
  },
  mouse: {
    'pt-BR': word('Mouse', '/maʊs/', 'MÁUS', 'Mova o mouse para a esquerda.'),
    en: word('Mouse', '/maʊs/', 'MÁUS', 'Move the mouse to the left.'),
    es: word('Ratón', '/raˈton/', 'ra-TÓN', 'Mueve el ratón a la izquierda.'),
  },
  'cell phone': {
    'pt-BR': word(
      'Celular',
      '/seluˈlaʁ/',
      'se-lu-LAR',
      'Meu celular está carregando.',
    ),
    en: word(
      'Cell phone',
      '/ˈsel ˌfoʊn/',
      'SÉL fôun',
      'My cell phone is charging.',
    ),
    es: word(
      'Teléfono',
      '/teˈlefono/',
      'te-LÊ-fo-no',
      'Mi teléfono se está cargando.',
    ),
  },
  tv: {
    'pt-BR': word(
      'Televisão',
      '/televiˈzɐ̃w/',
      'te-le-vi-ZÃO',
      'A televisão fica na sala.',
    ),
    en: word('TV', '/ˌtiːˈviː/', 'TÍ-VÍ', 'The TV is in the living room.'),
    es: word(
      'Televisión',
      '/teleβiˈsjon/',
      'te-le-bi-SIÓN',
      'La televisión está en la sala.',
    ),
  },
  clock: {
    'pt-BR': word(
      'Relógio',
      '/ʁeˈlɔʒju/',
      're-LÓ-jio',
      'O relógio está na parede.',
    ),
    en: word('Clock', '/klɑːk/', 'CLÓK', 'The clock is on the wall.'),
    es: word('Reloj', '/reˈlox/', 're-LÓRR', 'El reloj está en la pared.'),
  },
  backpack: {
    'pt-BR': word(
      'Mochila',
      '/moˈʃilɐ/',
      'mo-CHÍ-la',
      'Minha mochila está sob a cadeira.',
    ),
    en: word(
      'Backpack',
      '/ˈbæk.pæk/',
      'BÉK-pék',
      'My backpack is under the chair.',
    ),
    es: word(
      'Mochila',
      '/moˈtʃila/',
      'mo-TCHÍ-la',
      'Mi mochila está debajo de la silla.',
    ),
  },
  car: {
    'pt-BR': word(
      'Carro',
      '/ˈkaʁu/',
      'CÁ-rro',
      'O carro está estacionado lá fora.',
    ),
    en: word('Car', '/kɑːr/', 'CÁR', 'The car is parked outside.'),
    es: word(
      'Coche',
      '/ˈkotʃe/',
      'CÔ-tche',
      'El coche está estacionado afuera.',
    ),
  },
  dog: {
    'pt-BR': word(
      'Cachorro',
      '/kaˈʃoʁu/',
      'ca-CHÔ-rro',
      'O cachorro está brincando lá fora.',
    ),
    en: word('Dog', '/dɔːɡ/', 'DÓG', 'The dog is playing outside.'),
    es: word('Perro', '/ˈpero/', 'PÊ-rro', 'El perro está jugando afuera.'),
  },
  cat: {
    'pt-BR': word('Gato', '/ˈɡatu/', 'GÁ-to', 'O gato está dormindo.'),
    en: word('Cat', '/kæt/', 'KÉT', 'The cat is sleeping.'),
    es: word('Gato', '/ˈɡato/', 'GÁ-to', 'El gato está durmiendo.'),
  },
};

const fallbackMeaning: Record<LearningLanguage, string> = {
  'pt-BR': 'Objeto reconhecido pelo modelo visual.',
  en: 'Object recognized by the visual model.',
  es: 'Objeto reconocido por el modelo visual.',
};

const fallbackExamples: Record<LearningLanguage, (label: string) => string> = {
  'pt-BR': label => `Consigo ver: ${label}.`,
  en: label => `I can see a ${label}.`,
  es: label => `Puedo ver: ${label}.`,
};

function titleCase(label: string) {
  return label.replace(/\b\w/g, character => character.toUpperCase());
}

export const localVocabularyRepository: VocabularyRepository = {
  findByLabel(label, languageSettings) {
    const normalizedLabel = label.trim().toLowerCase();
    const entry = entries[normalizedLabel];

    if (entry != null) {
      return {
        ...entry[languageSettings.learningLanguage],
        meaning: entry[languageSettings.nativeLanguage].word,
      };
    }

    const targetLabel = titleCase(normalizedLabel);
    return {
      word: targetLabel,
      pronunciation: fallbackMeaning[languageSettings.nativeLanguage],
      pronunciationHint: normalizedLabel.toUpperCase(),
      meaning: fallbackMeaning[languageSettings.nativeLanguage],
      example: fallbackExamples[languageSettings.learningLanguage](targetLabel),
    };
  },
};
