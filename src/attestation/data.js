import ecolePapa from './ecole-papa.pdf'
import travailMaman from './travail-maman.pdf'

const peoples = {
  papa: {
    emoji: "🧔🏻",
    lastname: "Papa",
    firstname: "Papa",
    birthday: "31/12/1970",
    placeofbirth: "Mexico",
    address: "1 rue de la Paix",
    zipcode: "01000",
    city: "Abondance",
    reasons: ['achats', 'sante', 'sport_animaux', 'enfants'],
  },
  maman: {
    emoji: "👩🏻",
    lastname: "Maman",
    firstname: "Maman",
    birthday: "31/12/1970",
    placeofbirth: "Mexico",
    address: "1 rue de la Paix",
    zipcode: "01000",
    city: "Abondance",
    reasons: ['travail', 'achats', 'sante', 'sport_animaux', 'enfants'],
  },
  enfant: {
    emoji: "👦🏻",
    lastname: "Enfant",
    firstname: "Enfant",
    birthday: "31/12/2010",
    placeofbirth: "Mexico",
    address: "1 rue de la Paix",
    zipcode: "01000",
    city: "Abondance",
    reasons: ['achats', 'sante', 'sport_animaux', 'enfants'],
  }
}
const times = {
  "🔄": undefined,
  "◀️": -10,
  "⏰": 0,
  "▶️": +10,
  "⏩": +30,
  "📝": "",
}
const reasons = {
  travail: "🏭",
  achats: "🛒",
  sante: "🌡",
  famille: "👨‍👩‍👦",
  handicap: "🧑‍🦽",
  sport_animaux: "🏃",
  convocation: "👮",
  missions: "🏛",
  enfants: "🏫",
}
const attachments = [
  { profile: 'papa', reason: 'enfants', file: ecolePapa },
]

export { peoples, reasons, attachments, times }
