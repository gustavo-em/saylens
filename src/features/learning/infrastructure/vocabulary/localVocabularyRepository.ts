import type { VocabularyRepository } from '../../application/ports/VocabularyRepository';
import type { VocabularyEntry } from '../../domain/VocabularyEntry';

const entries: Record<string, Omit<VocabularyEntry, 'word'>> = {
  person: {
    pronunciation: '/ˈpɝː.sən/',
    pronunciationHint: 'PÂR-sân',
    meaning: 'pessoa',
    example: 'That person is my friend.',
  },
  bottle: {
    pronunciation: '/ˈbɑː.t̬əl/',
    pronunciationHint: 'BÓ-tl',
    meaning: 'garrafa',
    example: 'This is my water bottle.',
  },
  cup: {
    pronunciation: '/kʌp/',
    pronunciationHint: 'CÂP',
    meaning: 'xícara ou copo',
    example: 'The cup is on the table.',
  },
  chair: {
    pronunciation: '/tʃer/',
    pronunciationHint: 'TCHÉR',
    meaning: 'cadeira',
    example: 'Please sit on the chair.',
  },
  couch: {
    pronunciation: '/kaʊtʃ/',
    pronunciationHint: 'CÁUTCH',
    meaning: 'sofá',
    example: 'The couch is very comfortable.',
  },
  table: {
    pronunciation: '/ˈteɪ.bəl/',
    pronunciationHint: 'TÊI-bâl',
    meaning: 'mesa',
    example: 'Your keys are on the table.',
  },
  book: {
    pronunciation: '/bʊk/',
    pronunciationHint: 'BUK',
    meaning: 'livro',
    example: 'I am reading a good book.',
  },
  laptop: {
    pronunciation: '/ˈlæp.tɑːp/',
    pronunciationHint: 'LÉP-top',
    meaning: 'notebook ou computador portátil',
    example: 'My laptop is on the desk.',
  },
  keyboard: {
    pronunciation: '/ˈkiː.bɔːrd/',
    pronunciationHint: 'KÍ-bórd',
    meaning: 'teclado',
    example: 'I type on the keyboard.',
  },
  mouse: {
    pronunciation: '/maʊs/',
    pronunciationHint: 'MÁUS',
    meaning: 'mouse ou rato',
    example: 'Move the mouse to the left.',
  },
  'cell phone': {
    pronunciation: '/ˈsel ˌfoʊn/',
    pronunciationHint: 'SÉL fôun',
    meaning: 'celular',
    example: 'My cell phone is charging.',
  },
  tv: {
    pronunciation: '/ˌtiːˈviː/',
    pronunciationHint: 'TÍ-VÍ',
    meaning: 'televisão',
    example: 'The TV is in the living room.',
  },
  clock: {
    pronunciation: '/klɑːk/',
    pronunciationHint: 'CLÓK',
    meaning: 'relógio',
    example: 'The clock is on the wall.',
  },
  backpack: {
    pronunciation: '/ˈbæk.pæk/',
    pronunciationHint: 'BÉK-pék',
    meaning: 'mochila',
    example: 'My backpack is under the chair.',
  },
  car: {
    pronunciation: '/kɑːr/',
    pronunciationHint: 'CÁR',
    meaning: 'carro',
    example: 'The car is parked outside.',
  },
  dog: {
    pronunciation: '/dɔːɡ/',
    pronunciationHint: 'DÓG',
    meaning: 'cachorro',
    example: 'The dog is playing outside.',
  },
  cat: {
    pronunciation: '/kæt/',
    pronunciationHint: 'KÉT',
    meaning: 'gato',
    example: 'The cat is sleeping.',
  },
};

function titleCase(label: string) {
  return label.replace(/\b\w/g, character => character.toUpperCase());
}

export const localVocabularyRepository: VocabularyRepository = {
  findByLabel(label) {
    const normalizedLabel = label.trim().toLowerCase();
    const entry = entries[normalizedLabel];

    if (entry != null) {
      return { word: titleCase(normalizedLabel), ...entry };
    }

    return {
      word: titleCase(normalizedLabel),
      pronunciation: 'Pronúncia em revisão',
      pronunciationHint: normalizedLabel.toUpperCase(),
      meaning: 'Objeto reconhecido pelo modelo visual.',
      example: `I can see a ${normalizedLabel}.`,
    };
  },
};
