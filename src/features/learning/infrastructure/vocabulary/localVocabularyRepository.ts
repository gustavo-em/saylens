import type { VocabularyRepository } from '../../application/ports/VocabularyRepository';
import {
  languageBase,
  learningLanguages,
  type LanguageBase,
} from '../../domain/LearningLanguage';
import type { VocabularyEntry } from '../../domain/VocabularyEntry';

type LocalizedWord = Pick<
  VocabularyEntry,
  'word' | 'pronunciation' | 'pronunciationHint' | 'example'
>;

type VocabularyRecord = Record<LanguageBase, LocalizedWord>;

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
  'dining table': {
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
  bicycle: {
    'pt-BR': word(
      'Bicicleta',
      '/bisiˈklɛtɐ/',
      'bi-si-CLÉ-ta',
      'Eu vou de bicicleta para o trabalho.',
    ),
    en: word(
      'Bicycle',
      '/ˈbaɪ.sɪ.kəl/',
      'BÁI-si-cãl',
      'I ride my bicycle to work.',
    ),
    es: word(
      'Bicicleta',
      '/biθiˈkleta/',
      'bi-si-CLÊ-ta',
      'Voy en bicicleta al trabajo.',
    ),
  },
  motorcycle: {
    'pt-BR': word(
      'Motocicleta',
      '/motosiˈklɛtɐ/',
      'mo-to-si-CLÉ-ta',
      'A motocicleta está estacionada na rua.',
    ),
    en: word(
      'Motorcycle',
      '/ˈmoʊ.t̬ɚˌsaɪ.kəl/',
      'MÔU-tor-sai-cãl',
      'The motorcycle is parked on the street.',
    ),
    es: word(
      'Motocicleta',
      '/motoθiˈkleta/',
      'mo-to-si-CLÊ-ta',
      'La motocicleta está aparcada en la calle.',
    ),
  },
  airplane: {
    'pt-BR': word(
      'Avião',
      '/aviˈɐ̃w̃/',
      'a-vi-ÃO',
      'O avião está pronto para decolar.',
    ),
    en: word(
      'Airplane',
      '/ˈer.pleɪn/',
      'ÉR-plein',
      'The airplane is ready to take off.',
    ),
    es: word(
      'Avión',
      '/aˈbjon/',
      'a-vi-ÔN',
      'El avión está listo para despegar.',
    ),
  },
  bus: {
    'pt-BR': word(
      'Ônibus',
      '/ˈonibus/',
      'Ô-ni-bus',
      'O ônibus chega em cinco minutos.',
    ),
    en: word('Bus', '/bʌs/', 'BÂS', 'The bus arrives in five minutes.'),
    es: word(
      'Autobús',
      '/awtoˈbus/',
      'au-to-BÚS',
      'El autobús llega en cinco minutos.',
    ),
  },
  train: {
    'pt-BR': word(
      'Trem',
      '/tɾẽj̃/',
      'TRÊIN',
      'O trem parte da plataforma três.',
    ),
    en: word(
      'Train',
      '/treɪn/',
      'TRÊIN',
      'The train leaves from platform three.',
    ),
    es: word('Tren', '/tɾen/', 'TRÊN', 'El tren sale del andén tres.'),
  },
  truck: {
    'pt-BR': word(
      'Caminhão',
      '/kamiˈɲɐ̃w̃/',
      'ca-mi-NHÃO',
      'O caminhão está carregado.',
    ),
    en: word('Truck', '/trʌk/', 'TRÂK', 'The truck is loaded.'),
    es: word('Camión', '/kaˈmjon/', 'ca-mi-ÔN', 'El camión está cargado.'),
  },
  boat: {
    'pt-BR': word('Barco', '/ˈbaʁku/', 'BAR-co', 'O barco está no porto.'),
    en: word('Boat', '/boʊt/', 'BÔUT', 'The boat is at the port.'),
    es: word('Barco', '/ˈbaɾko/', 'BAR-co', 'El barco está en el puerto.'),
  },
  'traffic light': {
    'pt-BR': word(
      'Semáforo',
      '/seˈmafoɾu/',
      'se-MÁ-fo-ro',
      'O semáforo está vermelho.',
    ),
    en: word(
      'Traffic light',
      '/ˈtræf.ɪk ˌlaɪt/',
      'TRÉ-fic LÁIT',
      'The traffic light is red.',
    ),
    es: word(
      'Semáforo',
      '/seˈmafoɾo/',
      'se-MÁ-fo-ro',
      'El semáforo está en rojo.',
    ),
  },
  'fire hydrant': {
    'pt-BR': word(
      'Hidrante',
      '/iˈdɾɐ̃tʃi/',
      'i-DRÃN-tchi',
      'O hidrante fica na esquina.',
    ),
    en: word(
      'Fire hydrant',
      '/ˈfaɪr ˌhaɪ.drənt/',
      'FÁI-âr RÁI-drent',
      'The fire hydrant is on the corner.',
    ),
    es: word(
      'Hidrante',
      '/iˈðɾante/',
      'i-DRÁN-te',
      'El hidrante está en la esquina.',
    ),
  },
  'stop sign': {
    'pt-BR': word(
      'Placa de pare',
      '/ˈplakɐ dʒi ˈpaɾi/',
      'PLÁ-ca de PÁ-ri',
      'Pare na placa de pare.',
    ),
    en: word(
      'Stop sign',
      '/ˈstɑːp ˌsaɪn/',
      'STÓP SÁIN',
      'Stop at the stop sign.',
    ),
    es: word(
      'Señal de alto',
      '/seˈɲal de ˈalto/',
      'se-NHÁL de ÁL-to',
      'Detente en la señal de alto.',
    ),
  },
  'parking meter': {
    'pt-BR': word(
      'Parquímetro',
      '/paʁˈkimetɾu/',
      'par-QUÍ-me-tro',
      'Coloque moedas no parquímetro.',
    ),
    en: word(
      'Parking meter',
      '/ˈpɑːr.kɪŋ ˌmiː.t̬ɚ/',
      'PÁR-quin MÍ-târ',
      'Put coins in the parking meter.',
    ),
    es: word(
      'Parquímetro',
      '/paɾˈkimetɾo/',
      'par-QUÍ-me-tro',
      'Pon monedas en el parquímetro.',
    ),
  },
  bench: {
    'pt-BR': word('Banco', '/ˈbɐ̃ku/', 'BÃN-co', 'Vamos sentar naquele banco.'),
    en: word('Bench', '/bentʃ/', 'BÉNTCH', 'Let us sit on that bench.'),
    es: word('Banco', '/ˈbaŋko/', 'BÁN-co', 'Sentémonos en ese banco.'),
  },
  bird: {
    'pt-BR': word(
      'Pássaro',
      '/ˈpasaɾu/',
      'PÁ-sa-ro',
      'O pássaro está cantando.',
    ),
    en: word('Bird', '/bɝːd/', 'BÂRD', 'The bird is singing.'),
    es: word('Pájaro', '/ˈpaxaɾo/', 'PÁ-rra-ro', 'El pájaro está cantando.'),
  },
  horse: {
    'pt-BR': word(
      'Cavalo',
      '/kaˈvalu/',
      'ca-VÁ-lo',
      'O cavalo corre pelo campo.',
    ),
    en: word('Horse', '/hɔːrs/', 'RÓRS', 'The horse runs across the field.'),
    es: word(
      'Caballo',
      '/kaˈbaʎo/',
      'ca-BÁ-io',
      'El caballo corre por el campo.',
    ),
  },
  sheep: {
    'pt-BR': word('Ovelha', '/oˈveʎɐ/', 'o-VÊ-lha', 'A ovelha está no pasto.'),
    en: word('Sheep', '/ʃiːp/', 'CHÍP', 'The sheep is in the pasture.'),
    es: word('Oveja', '/oˈbexa/', 'o-VÊ-rra', 'La oveja está en el pasto.'),
  },
  cow: {
    'pt-BR': word('Vaca', '/ˈvakɐ/', 'VÁ-ca', 'A vaca está comendo capim.'),
    en: word('Cow', '/kaʊ/', 'CÁU', 'The cow is eating grass.'),
    es: word('Vaca', '/ˈbaka/', 'BÁ-ca', 'La vaca está comiendo hierba.'),
  },
  elephant: {
    'pt-BR': word(
      'Elefante',
      '/eleˈfɐ̃tʃi/',
      'e-le-FÃN-tchi',
      'O elefante é enorme.',
    ),
    en: word('Elephant', '/ˈel.ə.fənt/', 'É-le-fent', 'The elephant is huge.'),
    es: word(
      'Elefante',
      '/eleˈfante/',
      'e-le-FÁN-te',
      'El elefante es enorme.',
    ),
  },
  bear: {
    'pt-BR': word('Urso', '/ˈuʁsu/', 'UR-so', 'O urso vive na floresta.'),
    en: word('Bear', '/ber/', 'BÉR', 'The bear lives in the forest.'),
    es: word('Oso', '/ˈoso/', 'Ô-so', 'El oso vive en el bosque.'),
  },
  zebra: {
    'pt-BR': word(
      'Zebra',
      '/ˈzebɾɐ/',
      'ZÊ-bra',
      'A zebra tem listras pretas e brancas.',
    ),
    en: word(
      'Zebra',
      '/ˈziː.brə/',
      'ZÍ-bra',
      'The zebra has black and white stripes.',
    ),
    es: word(
      'Cebra',
      '/ˈθebɾa/',
      'SÊ-bra',
      'La cebra tiene rayas negras y blancas.',
    ),
  },
  giraffe: {
    'pt-BR': word(
      'Girafa',
      '/ʒiˈɾafɐ/',
      'ji-RÁ-fa',
      'A girafa tem o pescoço comprido.',
    ),
    en: word('Giraffe', '/dʒəˈræf/', 'je-RÉF', 'The giraffe has a long neck.'),
    es: word(
      'Jirafa',
      '/xiˈɾafa/',
      'rri-RÁ-fa',
      'La jirafa tiene el cuello largo.',
    ),
  },
  umbrella: {
    'pt-BR': word(
      'Guarda-chuva',
      '/ˈɡwaʁdɐ ˈʃuvɐ/',
      'GUAR-da-CHÚ-va',
      'Leve o guarda-chuva, vai chover.',
    ),
    en: word(
      'Umbrella',
      '/ʌmˈbrel.ə/',
      'am-BRÉ-la',
      'Take the umbrella, it will rain.',
    ),
    es: word(
      'Paraguas',
      '/paˈɾaɣwas/',
      'pa-RÁ-guas',
      'Lleva el paraguas, va a llover.',
    ),
  },
  handbag: {
    'pt-BR': word(
      'Bolsa',
      '/ˈbowsɐ/',
      'BÔU-sa',
      'A bolsa está sobre a cadeira.',
    ),
    en: word(
      'Handbag',
      '/ˈhænd.bæɡ/',
      'RÉND-bég',
      'The handbag is on the chair.',
    ),
    es: word('Bolso', '/ˈbolso/', 'BÔL-so', 'El bolso está sobre la silla.'),
  },
  tie: {
    'pt-BR': word(
      'Gravata',
      '/ɡɾaˈvatɐ/',
      'gra-VÁ-ta',
      'Ele está usando uma gravata azul.',
    ),
    en: word('Tie', '/taɪ/', 'TÁI', 'He is wearing a blue tie.'),
    es: word(
      'Corbata',
      '/koɾˈbata/',
      'cor-BÁ-ta',
      'Él lleva una corbata azul.',
    ),
  },
  suitcase: {
    'pt-BR': word(
      'Mala',
      '/ˈmalɐ/',
      'MÁ-la',
      'A mala está pronta para a viagem.',
    ),
    en: word(
      'Suitcase',
      '/ˈsuːt.keɪs/',
      'SÚT-queis',
      'The suitcase is ready for the trip.',
    ),
    es: word(
      'Maleta',
      '/maˈleta/',
      'ma-LÊ-ta',
      'La maleta está lista para el viaje.',
    ),
  },
  frisbee: {
    'pt-BR': word(
      'Frisbee',
      '/ˈfɾizbi/',
      'FRÍZ-bi',
      'Vamos jogar frisbee no parque.',
    ),
    en: word(
      'Frisbee',
      '/ˈfrɪz.bi/',
      'FRÍZ-bi',
      'Let us play frisbee in the park.',
    ),
    es: word(
      'Frisbee',
      '/ˈfɾisbi/',
      'FRÍS-bi',
      'Juguemos al frisbee en el parque.',
    ),
  },
  skis: {
    'pt-BR': word('Esquis', '/esˈkis/', 'es-QUÍS', 'Os esquis estão na neve.'),
    en: word('Skis', '/skiːz/', 'SKÍZ', 'The skis are on the snow.'),
    es: word('Esquís', '/esˈkis/', 'es-QUÍS', 'Los esquís están en la nieve.'),
  },
  snowboard: {
    'pt-BR': word(
      'Snowboard',
      '/snowˈbɔʁdʒi/',
      'snou-BÓR-de',
      'Ele desce a montanha de snowboard.',
    ),
    en: word(
      'Snowboard',
      '/ˈsnoʊ.bɔːrd/',
      'SNÔU-bord',
      'He goes down the mountain on a snowboard.',
    ),
    es: word(
      'Snowboard',
      '/esnowˈboɾð/',
      'es-nou-BÔRD',
      'Él baja la montaña en snowboard.',
    ),
  },
  'sports ball': {
    'pt-BR': word('Bola', '/ˈbɔlɐ/', 'BÓ-la', 'A bola está no gramado.'),
    en: word(
      'Sports ball',
      '/ˈspɔːrts ˌbɑːl/',
      'SPÓRTS BÓL',
      'The sports ball is on the field.',
    ),
    es: word('Pelota', '/peˈlota/', 'pe-LÔ-ta', 'La pelota está en el campo.'),
  },
  kite: {
    'pt-BR': word('Pipa', '/ˈpipɐ/', 'PÍ-pa', 'A pipa voa alto no céu.'),
    en: word('Kite', '/kaɪt/', 'CÁIT', 'The kite flies high in the sky.'),
    es: word(
      'Cometa',
      '/koˈmeta/',
      'co-MÊ-ta',
      'La cometa vuela alto en el cielo.',
    ),
  },
  'baseball bat': {
    'pt-BR': word(
      'Taco de beisebol',
      '/ˈtaku dʒi bejzeˈbɔw/',
      'TÁ-co de bei-ze-BÓL',
      'Ele segura o taco de beisebol.',
    ),
    en: word(
      'Baseball bat',
      '/ˈbeɪs.bɑːl ˌbæt/',
      'BÊIS-bol BÉT',
      'He is holding the baseball bat.',
    ),
    es: word(
      'Bate de béisbol',
      '/ˈbate de ˈbejsbol/',
      'BÁ-te de BÊIS-bol',
      'Él sostiene el bate de béisbol.',
    ),
  },
  'baseball glove': {
    'pt-BR': word(
      'Luva de beisebol',
      '/ˈluvɐ dʒi bejzeˈbɔw/',
      'LÚ-va de bei-ze-BÓL',
      'A luva de beisebol é de couro.',
    ),
    en: word(
      'Baseball glove',
      '/ˈbeɪs.bɑːl ˌɡlʌv/',
      'BÊIS-bol GLÂV',
      'The baseball glove is made of leather.',
    ),
    es: word(
      'Guante de béisbol',
      '/ˈɡwante de ˈbejsbol/',
      'GUÁN-te de BÊIS-bol',
      'El guante de béisbol es de cuero.',
    ),
  },
  skateboard: {
    'pt-BR': word(
      'Skate',
      '/ˈskejtʃi/',
      'es-QUÊI-tchi',
      'Ele anda de skate na praça.',
    ),
    en: word(
      'Skateboard',
      '/ˈskeɪt.bɔːrd/',
      'SKÊIT-bord',
      'He rides a skateboard in the square.',
    ),
    es: word(
      'Monopatín',
      '/monopaˈtin/',
      'mo-no-pa-TÍN',
      'Él anda en monopatín en la plaza.',
    ),
  },
  surfboard: {
    'pt-BR': word(
      'Prancha de surfe',
      '/ˈpɾɐ̃ʃɐ dʒi ˈsuʁfi/',
      'PRÃN-cha de SUR-fi',
      'A prancha de surfe está na areia.',
    ),
    en: word(
      'Surfboard',
      '/ˈsɝːf.bɔːrd/',
      'SÂRF-bord',
      'The surfboard is on the sand.',
    ),
    es: word(
      'Tabla de surf',
      '/ˈtabla de suɾf/',
      'TÁ-bla de SURF',
      'La tabla de surf está en la arena.',
    ),
  },
  'tennis racket': {
    'pt-BR': word(
      'Raquete de tênis',
      '/ʁaˈkɛtʃi dʒi ˈtenis/',
      'ra-QUÉ-tchi de TÊ-nis',
      'A raquete de tênis é leve.',
    ),
    en: word(
      'Tennis racket',
      '/ˈten.ɪs ˌræk.ɪt/',
      'TÉ-nis RÉ-quet',
      'The tennis racket is light.',
    ),
    es: word(
      'Raqueta de tenis',
      '/raˈketa de ˈtenis/',
      'ra-QUÊ-ta de TÊ-nis',
      'La raqueta de tenis es ligera.',
    ),
  },
  'wine glass': {
    'pt-BR': word(
      'Taça de vinho',
      '/ˈtasɐ dʒi ˈviɲu/',
      'TÁ-sa de VI-nho',
      'A taça de vinho está cheia.',
    ),
    en: word(
      'Wine glass',
      '/ˈwaɪn ˌɡlæs/',
      'UÁIN GLÉS',
      'The wine glass is full.',
    ),
    es: word(
      'Copa de vino',
      '/ˈkopa de ˈbino/',
      'CÔ-pa de BÍ-no',
      'La copa de vino está llena.',
    ),
  },
  fork: {
    'pt-BR': word(
      'Garfo',
      '/ˈɡaʁfu/',
      'GAR-fo',
      'O garfo está ao lado do prato.',
    ),
    en: word('Fork', '/fɔːrk/', 'FÓRK', 'The fork is next to the plate.'),
    es: word(
      'Tenedor',
      '/teneˈðoɾ/',
      'te-ne-DÔR',
      'El tenedor está al lado del plato.',
    ),
  },
  knife: {
    'pt-BR': word('Faca', '/ˈfakɐ/', 'FÁ-ca', 'A faca está muito afiada.'),
    en: word('Knife', '/naɪf/', 'NÁIF', 'The knife is very sharp.'),
    es: word(
      'Cuchillo',
      '/kuˈtʃiʎo/',
      'cu-CHÍ-io',
      'El cuchillo está muy afilado.',
    ),
  },
  spoon: {
    'pt-BR': word('Colher', '/koˈʎɛʁ/', 'co-LHÉR', 'Use a colher para a sopa.'),
    en: word('Spoon', '/spuːn/', 'SPÚN', 'Use the spoon for the soup.'),
    es: word(
      'Cuchara',
      '/kuˈtʃaɾa/',
      'cu-CHÁ-ra',
      'Usa la cuchara para la sopa.',
    ),
  },
  bowl: {
    'pt-BR': word(
      'Tigela',
      '/tʃiˈʒɛlɐ/',
      'tchi-JÉ-la',
      'A tigela está cheia de frutas.',
    ),
    en: word('Bowl', '/boʊl/', 'BÔUL', 'The bowl is full of fruit.'),
    es: word('Tazón', '/taˈθon/', 'ta-SÔN', 'El tazón está lleno de fruta.'),
  },
  banana: {
    'pt-BR': word('Banana', '/baˈnɐnɐ/', 'ba-NÃ-na', 'A banana está madura.'),
    en: word('Banana', '/bəˈnæn.ə/', 'ba-NÉ-na', 'The banana is ripe.'),
    es: word('Plátano', '/ˈplatano/', 'PLÁ-ta-no', 'El plátano está maduro.'),
  },
  apple: {
    'pt-BR': word('Maçã', '/maˈsɐ̃/', 'ma-SÃ', 'A maçã está sobre a mesa.'),
    en: word('Apple', '/ˈæp.əl/', 'É-pâl', 'The apple is on the table.'),
    es: word(
      'Manzana',
      '/manˈθana/',
      'man-SÁ-na',
      'La manzana está sobre la mesa.',
    ),
  },
  sandwich: {
    'pt-BR': word(
      'Sanduíche',
      '/sɐ̃duˈiʃi/',
      'san-du-Í-chi',
      'Eu quero um sanduíche no almoço.',
    ),
    en: word(
      'Sandwich',
      '/ˈsæn.wɪtʃ/',
      'SÉND-uitch',
      'I want a sandwich for lunch.',
    ),
    es: word(
      'Sándwich',
      '/ˈsanɡwitʃ/',
      'SÁN-guitch',
      'Quiero un sándwich para el almuerzo.',
    ),
  },
  orange: {
    'pt-BR': word('Laranja', '/laˈɾɐ̃ʒɐ/', 'la-RÃN-ja', 'A laranja é doce.'),
    en: word('Orange', '/ˈɔːr.ɪndʒ/', 'Ó-rinj', 'The orange is sweet.'),
    es: word('Naranja', '/naˈɾaŋxa/', 'na-RÁN-rra', 'La naranja es dulce.'),
  },
  broccoli: {
    'pt-BR': word(
      'Brócolis',
      '/ˈbɾɔkolis/',
      'BRÓ-co-lis',
      'O brócolis está no vapor.',
    ),
    en: word(
      'Broccoli',
      '/ˈbrɑː.kəl.i/',
      'BRÓ-co-li',
      'The broccoli is steamed.',
    ),
    es: word('Brócoli', '/ˈbɾokoli/', 'BRÔ-co-li', 'El brócoli está al vapor.'),
  },
  carrot: {
    'pt-BR': word(
      'Cenoura',
      '/seˈnoɾɐ/',
      'se-NÔ-ra',
      'A cenoura é boa para a visão.',
    ),
    en: word(
      'Carrot',
      '/ˈker.ət/',
      'QUÉ-ret',
      'The carrot is good for your eyes.',
    ),
    es: word(
      'Zanahoria',
      '/θanaˈoɾja/',
      'sa-na-Ô-ria',
      'La zanahoria es buena para la vista.',
    ),
  },
  'hot dog': {
    'pt-BR': word(
      'Cachorro-quente',
      '/kaˈʃoʁu ˈkẽtʃi/',
      'ca-CHÔ-rro-QUÊN-tchi',
      'Comprei um cachorro-quente na feira.',
    ),
    en: word(
      'Hot dog',
      '/ˈhɑːt ˌdɑːɡ/',
      'RÓT DÓG',
      'I bought a hot dog at the fair.',
    ),
    es: word(
      'Perrito caliente',
      '/peˈrito kaˈljente/',
      'pe-RRÍ-to ca-LIÊN-te',
      'Compré un perrito caliente en la feria.',
    ),
  },
  pizza: {
    'pt-BR': word(
      'Pizza',
      '/ˈpitsɐ/',
      'PÍ-tsa',
      'A pizza acabou de sair do forno.',
    ),
    en: word(
      'Pizza',
      '/ˈpiːt.sə/',
      'PÍT-sa',
      'The pizza just came out of the oven.',
    ),
    es: word(
      'Pizza',
      '/ˈpitsa/',
      'PÍT-sa',
      'La pizza acaba de salir del horno.',
    ),
  },
  donut: {
    'pt-BR': word(
      'Rosquinha',
      '/ʁosˈkiɲɐ/',
      'ros-QUI-nha',
      'A rosquinha tem cobertura de chocolate.',
    ),
    en: word(
      'Donut',
      '/ˈdoʊ.nʌt/',
      'DÔU-nat',
      'The donut has chocolate icing.',
    ),
    es: word(
      'Dona',
      '/ˈdona/',
      'DÔ-na',
      'La dona tiene cobertura de chocolate.',
    ),
  },
  cake: {
    'pt-BR': word(
      'Bolo',
      '/ˈbolu/',
      'BÔ-lo',
      'O bolo de aniversário está pronto.',
    ),
    en: word('Cake', '/keɪk/', 'QUÊIK', 'The birthday cake is ready.'),
    es: word(
      'Pastel',
      '/pasˈtel/',
      'pas-TÉL',
      'El pastel de cumpleaños está listo.',
    ),
  },
  'potted plant': {
    'pt-BR': word(
      'Planta em vaso',
      '/ˈplɐ̃tɐ ẽj ˈvazu/',
      'PLÃN-ta em VÁ-zo',
      'A planta em vaso fica na janela.',
    ),
    en: word(
      'Potted plant',
      '/ˈpɑː.t̬ɪd ˌplænt/',
      'PÓ-ted PLÉNT',
      'The potted plant is by the window.',
    ),
    es: word(
      'Planta en maceta',
      '/ˈplanta en maˈθeta/',
      'PLÁN-ta en ma-SÊ-ta',
      'La planta en maceta está junto a la ventana.',
    ),
  },
  bed: {
    'pt-BR': word('Cama', '/ˈkɐmɐ/', 'CÃ-ma', 'A cama já está arrumada.'),
    en: word('Bed', '/bed/', 'BÉD', 'The bed is already made.'),
    es: word('Cama', '/ˈkama/', 'CÁ-ma', 'La cama ya está hecha.'),
  },
  toilet: {
    'pt-BR': word(
      'Vaso sanitário',
      '/ˈvazu saniˈtaɾju/',
      'VÁ-zo sa-ni-TÁ-rio',
      'O vaso sanitário está limpo.',
    ),
    en: word('Toilet', '/ˈtɔɪ.lət/', 'TÓI-let', 'The toilet is clean.'),
    es: word('Inodoro', '/inoˈðoɾo/', 'i-no-DÔ-ro', 'El inodoro está limpio.'),
  },
  remote: {
    'pt-BR': word(
      'Controle remoto',
      '/kõˈtɾoli ʁeˈmɔtu/',
      'con-TRÔ-le re-MÓ-to',
      'O controle remoto está no sofá.',
    ),
    en: word('Remote', '/rɪˈmoʊt/', 'ri-MÔUT', 'The remote is on the couch.'),
    es: word(
      'Control remoto',
      '/konˈtɾol reˈmoto/',
      'con-TRÔL re-MÔ-to',
      'El control remoto está en el sofá.',
    ),
  },
  microwave: {
    'pt-BR': word(
      'Micro-ondas',
      '/mikɾoˈõdɐs/',
      'mi-cro-ÔN-das',
      'Aqueça a comida no micro-ondas.',
    ),
    en: word(
      'Microwave',
      '/ˈmaɪ.krə.weɪv/',
      'MÁI-cro-ueiv',
      'Heat the food in the microwave.',
    ),
    es: word(
      'Microondas',
      '/mikɾoˈondas/',
      'mi-cro-ÔN-das',
      'Calienta la comida en el microondas.',
    ),
  },
  oven: {
    'pt-BR': word('Forno', '/ˈfoʁnu/', 'FÔR-no', 'O pão está no forno.'),
    en: word('Oven', '/ˈʌv.ən/', 'Â-vãn', 'The bread is in the oven.'),
    es: word('Horno', '/ˈoɾno/', 'ÔR-no', 'El pan está en el horno.'),
  },
  toaster: {
    'pt-BR': word(
      'Torradeira',
      '/toʁaˈdejɾɐ/',
      'to-rra-DÊI-ra',
      'A torradeira está na bancada.',
    ),
    en: word(
      'Toaster',
      '/ˈtoʊ.stɚ/',
      'TÔUS-târ',
      'The toaster is on the counter.',
    ),
    es: word(
      'Tostadora',
      '/tostaˈðoɾa/',
      'tos-ta-DÔ-ra',
      'La tostadora está en la encimera.',
    ),
  },
  sink: {
    'pt-BR': word('Pia', '/ˈpiɐ/', 'PÍ-a', 'A pia está cheia de louça.'),
    en: word('Sink', '/sɪŋk/', 'SÍNK', 'The sink is full of dishes.'),
    es: word(
      'Fregadero',
      '/fɾeɣaˈðeɾo/',
      'fre-ga-DÊ-ro',
      'El fregadero está lleno de platos.',
    ),
  },
  refrigerator: {
    'pt-BR': word(
      'Geladeira',
      '/ʒelaˈdejɾɐ/',
      'je-la-DÊI-ra',
      'O leite está na geladeira.',
    ),
    en: word(
      'Refrigerator',
      '/rɪˈfrɪdʒ.ə.reɪ.t̬ɚ/',
      'ri-FRÍ-je-rei-târ',
      'The milk is in the refrigerator.',
    ),
    es: word(
      'Refrigerador',
      '/refɾixeɾaˈðoɾ/',
      're-fri-rre-ra-DÔR',
      'La leche está en el refrigerador.',
    ),
  },
  vase: {
    'pt-BR': word('Vaso', '/ˈvazu/', 'VÁ-zo', 'O vaso tem flores frescas.'),
    en: word('Vase', '/veɪs/', 'VÊIS', 'The vase has fresh flowers.'),
    es: word(
      'Jarrón',
      '/xaˈron/',
      'rra-RÔN',
      'El jarrón tiene flores frescas.',
    ),
  },
  scissors: {
    'pt-BR': word(
      'Tesoura',
      '/teˈzoɾɐ/',
      'te-ZÔ-ra',
      'A tesoura está na gaveta.',
    ),
    en: word(
      'Scissors',
      '/ˈsɪz.ɚz/',
      'SÍ-zârs',
      'The scissors are in the drawer.',
    ),
    es: word(
      'Tijeras',
      '/tiˈxeɾas/',
      'ti-RRÊ-ras',
      'Las tijeras están en el cajón.',
    ),
  },
  'teddy bear': {
    'pt-BR': word(
      'Ursinho de pelúcia',
      '/uʁˈsiɲu dʒi peˈlusjɐ/',
      'ur-SI-nho de pe-LÚ-sia',
      'A criança dorme com o ursinho de pelúcia.',
    ),
    en: word(
      'Teddy bear',
      '/ˈted.i ˌber/',
      'TÉ-di BÉR',
      'The child sleeps with the teddy bear.',
    ),
    es: word(
      'Osito de peluche',
      '/oˈsito de peˈlutʃe/',
      'o-SÍ-to de pe-LÚ-che',
      'El niño duerme con el osito de peluche.',
    ),
  },
  'hair drier': {
    'pt-BR': word(
      'Secador de cabelo',
      '/sekaˈdoʁ dʒi kaˈbelu/',
      'se-ca-DÔR de ca-BÊ-lo',
      'O secador de cabelo está quebrado.',
    ),
    en: word(
      'Hair drier',
      '/ˈher ˌdraɪ.ɚ/',
      'RÉR DRÁI-âr',
      'The hair drier is broken.',
    ),
    es: word(
      'Secador de pelo',
      '/sekaˈðoɾ de ˈpelo/',
      'se-ca-DÔR de PÊ-lo',
      'El secador de pelo está roto.',
    ),
  },
  toothbrush: {
    'pt-BR': word(
      'Escova de dentes',
      '/esˈkovɐ dʒi ˈdẽtʃis/',
      'es-CÔ-va de DÊN-tchis',
      'Troque a escova de dentes a cada três meses.',
    ),
    en: word(
      'Toothbrush',
      '/ˈtuːθ.brʌʃ/',
      'TÚTH-brach',
      'Change your toothbrush every three months.',
    ),
    es: word(
      'Cepillo de dientes',
      '/θeˈpiʎo de ˈdjentes/',
      'se-PÍ-io de DIÊN-tes',
      'Cambia el cepillo de dientes cada tres meses.',
    ),
  },
};

/**
 * What the object is, written in the language the learner already speaks.
 * Kept apart from the word entries because a definition describes the object,
 * not the word, so it does not change with the language being studied.
 */
const definitions: Record<string, Record<LanguageBase, string>> = {
  person: {
    'pt-BR': 'Ser humano, homem, mulher ou criança.',
    en: 'A human being, man, woman or child.',
    es: 'Ser humano, hombre, mujer o niño.',
  },
  bicycle: {
    'pt-BR': 'Veículo de duas rodas movido a pedais.',
    en: 'A two-wheeled vehicle moved by pedals.',
    es: 'Vehículo de dos ruedas movido con pedales.',
  },
  car: {
    'pt-BR': 'Veículo de quatro rodas para poucas pessoas.',
    en: 'A four-wheeled vehicle for a few people.',
    es: 'Vehículo de cuatro ruedas para pocas personas.',
  },
  motorcycle: {
    'pt-BR': 'Veículo de duas rodas com motor.',
    en: 'A two-wheeled vehicle with an engine.',
    es: 'Vehículo de dos ruedas con motor.',
  },
  airplane: {
    'pt-BR': 'Aeronave com asas que voa com motores.',
    en: 'An aircraft with wings that flies using engines.',
    es: 'Aeronave con alas que vuela con motores.',
  },
  bus: {
    'pt-BR': 'Veículo grande que transporta muitos passageiros.',
    en: 'A large vehicle that carries many passengers.',
    es: 'Vehículo grande que transporta muchos pasajeros.',
  },
  train: {
    'pt-BR': 'Composição de vagões que anda sobre trilhos.',
    en: 'A line of carriages that runs on rails.',
    es: 'Conjunto de vagones que circula sobre rieles.',
  },
  truck: {
    'pt-BR': 'Veículo grande usado para transportar carga.',
    en: 'A large vehicle used to carry cargo.',
    es: 'Vehículo grande usado para transportar carga.',
  },
  boat: {
    'pt-BR': 'Embarcação que se desloca sobre a água.',
    en: 'A vessel that travels on water.',
    es: 'Embarcación que se desplaza sobre el agua.',
  },
  'traffic light': {
    'pt-BR': 'Sinal luminoso que controla o trânsito.',
    en: 'A light signal that controls traffic.',
    es: 'Señal luminosa que controla el tránsito.',
  },
  'fire hydrant': {
    'pt-BR': 'Ponto de água na rua para combater incêndios.',
    en: 'A street water outlet used to fight fires.',
    es: 'Toma de agua en la calle para combatir incendios.',
  },
  'stop sign': {
    'pt-BR': 'Placa que obriga o veículo a parar.',
    en: 'A sign that requires a vehicle to stop.',
    es: 'Señal que obliga al vehículo a detenerse.',
  },
  'parking meter': {
    'pt-BR': 'Aparelho que cobra pelo tempo de estacionamento.',
    en: 'A device that charges for parking time.',
    es: 'Aparato que cobra por el tiempo de estacionamiento.',
  },
  bench: {
    'pt-BR': 'Assento comprido para mais de uma pessoa.',
    en: 'A long seat for more than one person.',
    es: 'Asiento largo para más de una persona.',
  },
  bird: {
    'pt-BR': 'Animal com penas, bico e asas.',
    en: 'An animal with feathers, a beak and wings.',
    es: 'Animal con plumas, pico y alas.',
  },
  cat: {
    'pt-BR': 'Animal doméstico de pelo macio que mia.',
    en: 'A soft-furred domestic animal that meows.',
    es: 'Animal doméstico de pelo suave que maúlla.',
  },
  dog: {
    'pt-BR': 'Animal doméstico que late e acompanha pessoas.',
    en: 'A domestic animal that barks and keeps people company.',
    es: 'Animal doméstico que ladra y acompaña a las personas.',
  },
  horse: {
    'pt-BR': 'Animal grande de quatro patas usado para montar.',
    en: 'A large four-legged animal used for riding.',
    es: 'Animal grande de cuatro patas usado para montar.',
  },
  sheep: {
    'pt-BR': 'Animal criado pela lã e pela carne.',
    en: 'An animal raised for wool and meat.',
    es: 'Animal criado por su lana y su carne.',
  },
  cow: {
    'pt-BR': 'Animal de fazenda que fornece leite.',
    en: 'A farm animal that gives milk.',
    es: 'Animal de granja que da leche.',
  },
  elephant: {
    'pt-BR': 'Animal enorme com tromba e orelhas grandes.',
    en: 'A huge animal with a trunk and large ears.',
    es: 'Animal enorme con trompa y orejas grandes.',
  },
  bear: {
    'pt-BR': 'Animal grande e peludo que vive em florestas.',
    en: 'A large furry animal that lives in forests.',
    es: 'Animal grande y peludo que vive en bosques.',
  },
  zebra: {
    'pt-BR': 'Animal africano com listras pretas e brancas.',
    en: 'An African animal with black and white stripes.',
    es: 'Animal africano con rayas negras y blancas.',
  },
  giraffe: {
    'pt-BR': 'Animal africano de pescoço muito comprido.',
    en: 'An African animal with a very long neck.',
    es: 'Animal africano de cuello muy largo.',
  },
  backpack: {
    'pt-BR': 'Bolsa levada nas costas por duas alças.',
    en: 'A bag carried on the back by two straps.',
    es: 'Bolsa que se lleva en la espalda con dos correas.',
  },
  umbrella: {
    'pt-BR': 'Objeto aberto sobre a cabeça para proteger da chuva.',
    en: 'An object opened overhead to keep off rain.',
    es: 'Objeto que se abre sobre la cabeza para protegerse de la lluvia.',
  },
  handbag: {
    'pt-BR': 'Bolsa de mão para objetos pessoais.',
    en: 'A small bag carried by hand for personal items.',
    es: 'Bolso de mano para objetos personales.',
  },
  tie: {
    'pt-BR': 'Faixa de tecido usada no colarinho da camisa.',
    en: 'A strip of cloth worn around a shirt collar.',
    es: 'Tira de tela que se lleva en el cuello de la camisa.',
  },
  suitcase: {
    'pt-BR': 'Mala rígida para levar roupas em viagens.',
    en: 'A stiff case for carrying clothes when travelling.',
    es: 'Maleta rígida para llevar ropa en los viajes.',
  },
  frisbee: {
    'pt-BR': 'Disco de plástico lançado entre pessoas.',
    en: 'A plastic disc thrown between people.',
    es: 'Disco de plástico que se lanza entre personas.',
  },
  skis: {
    'pt-BR': 'Par de pranchas finas para deslizar na neve.',
    en: 'A pair of thin boards for sliding on snow.',
    es: 'Par de tablas delgadas para deslizarse en la nieve.',
  },
  snowboard: {
    'pt-BR': 'Prancha única para descer montanhas de neve.',
    en: 'A single board for riding down snowy slopes.',
    es: 'Tabla única para bajar laderas nevadas.',
  },
  'sports ball': {
    'pt-BR': 'Bola usada em jogos e esportes.',
    en: 'A ball used in games and sports.',
    es: 'Pelota usada en juegos y deportes.',
  },
  kite: {
    'pt-BR': 'Armação leve que voa presa por uma linha.',
    en: 'A light frame flown at the end of a string.',
    es: 'Armazón ligero que vuela sujeto a un hilo.',
  },
  'baseball bat': {
    'pt-BR': 'Bastão usado para rebater a bola no beisebol.',
    en: 'A club used to hit the ball in baseball.',
    es: 'Palo usado para golpear la pelota en el béisbol.',
  },
  'baseball glove': {
    'pt-BR': 'Luva de couro para pegar a bola no beisebol.',
    en: 'A leather glove for catching the ball in baseball.',
    es: 'Guante de cuero para atrapar la pelota en el béisbol.',
  },
  skateboard: {
    'pt-BR': 'Prancha com rodas para deslizar em pé.',
    en: 'A board on wheels ridden standing up.',
    es: 'Tabla con ruedas para deslizarse de pie.',
  },
  surfboard: {
    'pt-BR': 'Prancha usada para deslizar sobre as ondas.',
    en: 'A board used to ride ocean waves.',
    es: 'Tabla usada para deslizarse sobre las olas.',
  },
  'tennis racket': {
    'pt-BR': 'Raquete com cordas para rebater a bola.',
    en: 'A strung racket used to hit the ball.',
    es: 'Raqueta con cuerdas para golpear la pelota.',
  },
  bottle: {
    'pt-BR': 'Recipiente alto e estreito para líquidos.',
    en: 'A tall narrow container for liquids.',
    es: 'Recipiente alto y estrecho para líquidos.',
  },
  'wine glass': {
    'pt-BR': 'Copo com haste usado para beber vinho.',
    en: 'A stemmed glass used for drinking wine.',
    es: 'Copa con tallo usada para beber vino.',
  },
  cup: {
    'pt-BR': 'Recipiente pequeno para beber.',
    en: 'A small container for drinking.',
    es: 'Recipiente pequeño para beber.',
  },
  fork: {
    'pt-BR': 'Talher de dentes usado para levar comida à boca.',
    en: 'A pronged utensil used to lift food.',
    es: 'Cubierto con púas usado para llevar comida a la boca.',
  },
  knife: {
    'pt-BR': 'Utensílio de lâmina usado para cortar.',
    en: 'A bladed utensil used for cutting.',
    es: 'Utensilio con hoja usado para cortar.',
  },
  spoon: {
    'pt-BR': 'Talher de concha para líquidos e sopas.',
    en: 'A utensil with a shallow bowl for liquids.',
    es: 'Cubierto con cuenco para líquidos y sopas.',
  },
  bowl: {
    'pt-BR': 'Recipiente fundo e redondo para alimentos.',
    en: 'A deep round container for food.',
    es: 'Recipiente hondo y redondo para alimentos.',
  },
  banana: {
    'pt-BR': 'Fruta alongada de casca amarela.',
    en: 'A long fruit with a yellow skin.',
    es: 'Fruta alargada de cáscara amarilla.',
  },
  apple: {
    'pt-BR': 'Fruta redonda e firme, vermelha ou verde.',
    en: 'A round firm fruit, red or green.',
    es: 'Fruta redonda y firme, roja o verde.',
  },
  sandwich: {
    'pt-BR': 'Recheio servido entre duas fatias de pão.',
    en: 'A filling served between two slices of bread.',
    es: 'Relleno servido entre dos rebanadas de pan.',
  },
  orange: {
    'pt-BR': 'Fruta cítrica redonda de casca alaranjada.',
    en: 'A round citrus fruit with an orange skin.',
    es: 'Fruta cítrica redonda de cáscara anaranjada.',
  },
  broccoli: {
    'pt-BR': 'Legume verde em forma de pequenas árvores.',
    en: 'A green vegetable shaped like small trees.',
    es: 'Verdura verde con forma de arbolitos.',
  },
  carrot: {
    'pt-BR': 'Raiz alaranjada e alongada usada na comida.',
    en: 'A long orange root eaten as a vegetable.',
    es: 'Raíz anaranjada y alargada que se come.',
  },
  'hot dog': {
    'pt-BR': 'Salsicha servida dentro de um pão comprido.',
    en: 'A sausage served in a long bread roll.',
    es: 'Salchicha servida dentro de un pan alargado.',
  },
  pizza: {
    'pt-BR': 'Massa assada coberta com molho e queijo.',
    en: 'Baked dough topped with sauce and cheese.',
    es: 'Masa horneada cubierta con salsa y queso.',
  },
  donut: {
    'pt-BR': 'Massa doce frita em formato de anel.',
    en: 'A sweet fried dough ring.',
    es: 'Masa dulce frita con forma de anillo.',
  },
  cake: {
    'pt-BR': 'Massa doce assada servida em fatias.',
    en: 'A sweet baked dish served in slices.',
    es: 'Masa dulce horneada que se sirve en porciones.',
  },
  chair: {
    'pt-BR': 'Móvel com assento e encosto para uma pessoa.',
    en: 'A seat with a back for one person.',
    es: 'Mueble con asiento y respaldo para una persona.',
  },
  couch: {
    'pt-BR': 'Assento estofado e comprido para várias pessoas.',
    en: 'A long padded seat for several people.',
    es: 'Asiento acolchado y largo para varias personas.',
  },
  'potted plant': {
    'pt-BR': 'Planta cultivada dentro de um vaso.',
    en: 'A plant grown inside a pot.',
    es: 'Planta cultivada dentro de una maceta.',
  },
  bed: {
    'pt-BR': 'Móvel onde se dorme.',
    en: 'A piece of furniture for sleeping.',
    es: 'Mueble donde se duerme.',
  },
  'dining table': {
    'pt-BR': 'Móvel de tampo plano onde se faz as refeições.',
    en: 'A flat-topped piece of furniture used for meals.',
    es: 'Mueble de superficie plana donde se come.',
  },
  toilet: {
    'pt-BR': 'Peça sanitária usada no banheiro.',
    en: 'A bathroom fixture used for waste.',
    es: 'Pieza sanitaria usada en el baño.',
  },
  tv: {
    'pt-BR': 'Aparelho que exibe imagens e som.',
    en: 'A device that shows pictures and sound.',
    es: 'Aparato que muestra imágenes y sonido.',
  },
  laptop: {
    'pt-BR': 'Computador portátil com tela e teclado.',
    en: 'A portable computer with a screen and keyboard.',
    es: 'Computadora portátil con pantalla y teclado.',
  },
  mouse: {
    'pt-BR': 'Dispositivo de mão que move o cursor.',
    en: 'A hand-held device that moves the cursor.',
    es: 'Dispositivo de mano que mueve el cursor.',
  },
  remote: {
    'pt-BR': 'Aparelho que controla um dispositivo à distância.',
    en: 'A device that controls another one from a distance.',
    es: 'Aparato que controla otro dispositivo a distancia.',
  },
  keyboard: {
    'pt-BR': 'Conjunto de teclas usado para digitar.',
    en: 'A set of keys used for typing.',
    es: 'Conjunto de teclas usado para escribir.',
  },
  'cell phone': {
    'pt-BR': 'Telefone portátil que também acessa a internet.',
    en: 'A portable phone that also reaches the internet.',
    es: 'Teléfono portátil que también accede a internet.',
  },
  microwave: {
    'pt-BR': 'Forno que aquece comida com ondas.',
    en: 'An oven that heats food with waves.',
    es: 'Horno que calienta comida con ondas.',
  },
  oven: {
    'pt-BR': 'Compartimento fechado usado para assar.',
    en: 'A closed compartment used for baking.',
    es: 'Compartimento cerrado usado para hornear.',
  },
  toaster: {
    'pt-BR': 'Aparelho que tosta fatias de pão.',
    en: 'A device that toasts slices of bread.',
    es: 'Aparato que tuesta rebanadas de pan.',
  },
  sink: {
    'pt-BR': 'Bacia com torneira usada para lavar.',
    en: 'A basin with a tap used for washing.',
    es: 'Fregadero con grifo usado para lavar.',
  },
  refrigerator: {
    'pt-BR': 'Aparelho que conserva alimentos no frio.',
    en: 'An appliance that keeps food cold.',
    es: 'Aparato que conserva alimentos en frío.',
  },
  book: {
    'pt-BR': 'Conjunto de páginas com texto, lido para estudar ou se informar.',
    en: 'A set of pages with text, read to study or learn.',
    es: 'Conjunto de páginas con texto, leído para estudiar o informarse.',
  },
  clock: {
    'pt-BR': 'Aparelho que mostra as horas.',
    en: 'A device that shows the time.',
    es: 'Aparato que muestra la hora.',
  },
  vase: {
    'pt-BR': 'Recipiente usado para guardar flores.',
    en: 'A container used to hold flowers.',
    es: 'Recipiente usado para poner flores.',
  },
  scissors: {
    'pt-BR': 'Ferramenta de duas lâminas usada para cortar.',
    en: 'A two-bladed tool used for cutting.',
    es: 'Herramienta de dos hojas usada para cortar.',
  },
  'teddy bear': {
    'pt-BR': 'Urso de pelúcia usado como brinquedo.',
    en: 'A soft toy bear.',
    es: 'Oso de peluche usado como juguete.',
  },
  'hair drier': {
    'pt-BR': 'Aparelho que seca o cabelo com ar quente.',
    en: 'A device that dries hair with hot air.',
    es: 'Aparato que seca el cabello con aire caliente.',
  },
  toothbrush: {
    'pt-BR': 'Escova pequena usada para limpar os dentes.',
    en: 'A small brush used to clean teeth.',
    es: 'Cepillo pequeño usado para limpiar los dientes.',
  },
};

const fallbackMeaning: Record<LanguageBase, string> = {
  'pt-BR': 'Objeto reconhecido pelo modelo visual.',
  en: 'Object recognized by the visual model.',
  es: 'Objeto reconocido por el modelo visual.',
};

const fallbackExamples: Record<LanguageBase, (label: string) => string> = {
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

    const learning = languageBase(languageSettings.learningLanguage);
    const native = languageBase(languageSettings.nativeLanguage);

    if (entry != null) {
      const otherBases = learningLanguages
        .map(languageBase)
        .filter(
          (base, index, bases) =>
            base !== learning && bases.indexOf(base) === index,
        );

      return {
        ...entry[learning],
        definition: definitions[normalizedLabel]?.[native] ?? '',
        meaning: entry[native].word,
        translations: otherBases.map(base => entry[base].word),
      };
    }

    // iOS recognizes far more labels than this catalog curates, so this path
    // is ordinary rather than exceptional. The card shows the word and says
    // plainly that there is nothing else yet; an invented transcription in the
    // pronunciation slot would be worse than an empty one.
    const targetLabel = titleCase(normalizedLabel);
    return {
      word: targetLabel,
      pronunciation: '',
      pronunciationHint: normalizedLabel.toUpperCase(),
      definition: fallbackMeaning[native],
      meaning: fallbackMeaning[native],
      translations: [],
      example: fallbackExamples[learning](targetLabel),
    };
  },
};
