import QRCode from 'qrcode'
import print from 'print-js'
import uniqWith from 'lodash/uniqWith'
import isEqual from 'lodash/isEqual'
import { PDFDocument, StandardFonts } from 'pdf-lib'
import { peoples, reasons, attachments, times } from './data.js'

function recall(values) {
  ;[...document.querySelectorAll("#who input")].forEach(el => {
    el.checked = values.who.includes(el.id)
  })
  ;[...document.querySelectorAll("#what input")].forEach(el => {
    el.checked = values.what.includes(el.id)
  })
  const previous = document.getElementById('previous')
  if (previous) setPrevious(values.previous || "")
  ;[...document.querySelectorAll("#when input")].forEach(el => {
    if (values.date && el.id =='previous') {
      el.value = values.date
      el.checked = true
    } else {
      el.checked = (!values.date) && (values.when || el.id !='previous') && values.when==el.value
    }
  })
}
function check() {
  if (getWhen()===undefined) return false
  const data = getDocumentsData()
  if (data.length == 0) return false
  return data.reduce((prev, item) => (item.what.length > 0) ? prev : false, true)
}
function getWho() {
  return [...document.querySelectorAll("#who input:checked:not(:disabled)")].map(el => el.id)
}
function getWhat() {
  return [...document.querySelectorAll("#what input:checked:not(:disabled)")].map(el => el.id)
}
function getWhen() {
  const el = document.querySelector("#when input:checked:not(:disabled)")
  if (!el) return undefined
  if (el.value === "") return el.value
  return parseInt(el.value)
}
function getDate(when) {
  if (when === undefined) return undefined
  if (when === "") return ""
  if (when > 1000000) return new Date(when)
  return new Date(Date.now() + when * 1000 * 60)
} 
function onFormChange() {
  updateWhat()
  updateDo()
  save()
}
function updateWhat() {
  const activatedPeoples = getWho().map(id => peoples[id])
  const reasonsToKeep = reasonsForPeoples(activatedPeoples)
  ;[...document.querySelectorAll("#what input")].forEach(el => {
    el.disabled = (activatedPeoples.length > 0) && !reasonsToKeep.includes(el.id)
  })
}
function updateDo() {
  const valid = check()
  ;[...document.querySelectorAll('#do button')].forEach(button => button.disabled = (button.id != 'raz') && !valid)
}
function reasonsForPeoples(peoples) {
  return Object.values(peoples).reduce(
    (prev, people) => {
      return people.reasons.reduce(
        (prev, reason) => {
          if (!prev.includes(reason)) return prev.concat([reason])
          else return prev
        },
        prev
      )
    }, 
    []
  )
}
function monitorForm() {
  document.getElementById('form').addEventListener('change', onFormChange)
  ;[...document.querySelectorAll('#do button')].forEach(el => {
    if (el.id=='raz') {
      el.addEventListener('click', doReset)
    }
    if (el.id == 'show') {
      el.addEventListener('click', doShow)
    }
    if (el.id == 'print') {
      el.addEventListener('click', doPrint)
    }
    if (el.id == 'save') {
      el.addEventListener('click', doSave)
    }
    if (el.id == 'download') {
      el.addEventListener('click', doDownload)
    }
  })
}
function doPrint(e) {
  if (e) e.preventDefault()
  persist()
  getPDFBlob().then(URL.createObjectURL).then(print)
}
function doReset(e) {
  if (e) e.preventDefault()
  document.getElementById('form').reset()
  onFormChange()
}
function doSave(e) {
  if (e) e.preventDefault()
  persist()
}
function doDownload(e) {
  if (e) e.preventDefault()
  persist()
  getPDFBlob().then(blob => downloadBlob(blob, getFilename()))
}
function doShow(e) {
  if (e) e.preventDefault()
  const meta = e.getModifierState("Accel") || e.getModifierState("Control") || e.getModifierState("Meta")
  persist()
  getPDFBlob().then(blob => showBlob(blob, meta))
}

function getFilename() {
  const date = getDate(getWhen()) || new Date()
  const time = getFormattedDate(date, '-') + '-' + getFormattedTime(date, 'h') + "m" + date.getSeconds().toString(10).padStart(2, '0')
  return `certificate-${time}.pdf`
}
function getPDFBlob() {
  const data = getDocumentsData()
  return getPDF(data).then(pdf2bytes).then(bytes2blob)
}

function fillForm() {
  const who = document.getElementById('who')
  Object.keys(peoples).forEach(id => {
    who.appendChild(createInput({id, type: 'checkbox'}))
    who.appendChild(createLabel({id, emoji: peoples[id].emoji}))
  })
  const what = document.getElementById('what')
  reasonsForPeoples(peoples).forEach(id => {
    what.appendChild(createInput({id, type: 'checkbox'}))
    what.appendChild(createLabel({id, emoji: reasons[id]}))
  })
  const when = document.getElementById('when')
  Object.entries(times).forEach(([emoji, value], idx) => {
    const id = (value === undefined) ? 'previous' : ('time' + idx)
    when.appendChild(createInput({id, value: (value !== undefined) ? value.toString(10) : "", type: 'radio', name: "time"}))
    const label = createLabel({id, emoji})
    if (value === undefined) label.title = "Dernière date/heure générée"
    else if (value === 0) label.title = "Maintenant !"
    else if (value === "") label.title = "Laisser la date/heure libre"
    else if (value < 0) label.title = value.toString(10) + " minutes"
    else if (value > 0) label.title = "+" + value.toString(10) + " minutes"
    when.appendChild(label)
  })
}
function getHistory() {
  return JSON.parse(localStorage.getItem('history') || "[]")
}
const monthes = [
  'jan.',
  'fev.',
  'mars',
  'avr.',
  'mai',
  'jun',
  'jul',
  'aout',
  'sep.',
  'oct.',
  'nov.',
  'dec.',
]
function removeHistory(e) {
  e.preventDefault()
  const trash = e.target
  const link = trash.previousSibling
  const data = JSON.parse(link.getAttribute('data-value'))
  const history = getHistory()
  const json = JSON.stringify(history.filter(v => !isEqual(v, data)))
  localStorage.setItem('history', json)
  fillHistory()
}
function fillHistory() {
  const history = document.getElementById('history')
  history.innerHTML = ""
  const values = getHistory()
  values.forEach(value => {
    const date = (value.when !== "") ? getDate(value.when) : false
    const dateLabel = date ? (date.getDay() + " " + monthes[date.getMonth()] + " " + getFormattedTime(date, 'h')) : "(date libre)"
    const label = dateLabel + " : " + value.who.concat(value.what).join(', ').replace('sport_animaux', 'exercice')
    const li = document.createElement('li')
    const link = document.createElement('button')
    link.className = 'recallhistory'
    link.appendChild(document.createTextNode(label))
    link.setAttribute('data-value', JSON.stringify(value))
    link.addEventListener('click', recallHistory)
    const trash = document.createElement('button')
    trash.addEventListener('click', removeHistory)
    trash.className = 'trashhistory'
    trash.appendChild(document.createTextNode('🗑'))
    li.appendChild(link)
    li.appendChild(trash)
    history.appendChild(li)
  })  
}
function recallHistory(e) {
  const target = e.target
  const json = target.getAttribute('data-value')
  const value = JSON.parse(json)
  recall(value)
  onFormChange()
}
function initForm() {
  fillForm()
  monitorForm()
  recall(getPreviousValues())
  onFormChange()
  fillHistory()
}
function createInput({id, value, name, type}) {
  const input = document.createElement('input')
  input.setAttribute('type', type)
  input.id = id
  if (name) input.name = name
  if (value !== undefined) input.value = value
  return input
}
function createLabel({id, emoji}) {
  const label = document.createElement('label')
  label.setAttribute('for', id)
  label.appendChild(document.createTextNode(emoji))
  return label
}
function setPrevious(time, checked) {
  const previous = document.getElementById('previous')
  if (previous && time) {
    previous.value = time.toString(10)
    const date = new Date(parseInt(previous.value))
    previous.nextSibling.title = date.getDay() + " " + monthes[date.getMonth()] + " " + getFormattedTime(date, 'h')
    if (checked !== undefined) previous.checked = checked
  }
}
function persist() {
  const previous = document.getElementById('previous')
  if (previous) {
    const when = getWhen()
    if (when!=="" && when!==undefined) {
      const time = getDate(when).getTime()
      setPrevious(time, true)
    }
  }
  const data = { 
    who: getWho(),
    what: getWhat(),
    when: getWhen(),
    previous: previous && previous.value || "",
  }
  const history = getHistory()
  history.unshift({...data, date: data.when ? getDate(data.when).getTime() : ""})
  const json = JSON.stringify(uniqWith(history,isEqual).slice(0,10))
  localStorage.setItem('history', json)
  fillHistory()
}
function save() {
  const previous = document.getElementById('previous')
  const data = { 
    who: getWho(),
    what: getWhat(),
    when: getWhen(),
    previous: previous && previous.value || "",
  }
  localStorage.setItem('previousValue', JSON.stringify(data))
}
function getPreviousValues() {
  const data = localStorage.getItem('previousValue')
  return data ? JSON.parse(data) : {who:[], what:[], when:"0", previous: Date.now()}
}

function getDocumentsData() {
  const who = getWho()
  const what = getWhat()
  const when = getWhen()
  return who.map(profile => {
    const localWhat = what.filter(w => peoples[profile].reasons.includes(w))
    return { who: profile, what: localWhat, when }
  })
}
async function getPDF(data) {
  const pdfs = await Promise.all(
    data.map(({who, what, when}) => {
      return generatePdf(peoples[who], what, getDate(when))
    })
  )
  const attach = await Promise.all(
      attachments.filter(a => 
      data.reduce(
        (prev, {who, what}) => {
          if (who.includes(a.profile) && what.includes(a.reason)) return true
          return prev
        },
        false
      )
    ).map(a => {
      return a.file
    }).map(file => {
      return loadFile(file).then(bytes => {
        return PDFDocument.load(bytes)
      })
    })
  )
  const combined = pdfs.concat(attach)
  pdfs.concat(attach)
  return (combined.length == 1) ? combined[0] : await mergePDF(combined)
}
initForm()
/*******/

const ys = {
  travail: 578,
  achats: 533,
  sante: 477,
  famille: 435,
  handicap: 396,
  sport_animaux: 358,
  convocation: 295,
  missions: 255,
  enfants: 211,
}

export async function generatePdf(profile, reasons, date) {
  const now = new Date()
  const creationInstant = date ? ((date.getTime() > now.getTime()) ? now : date) : now
  const creationDate = creationInstant.toLocaleDateString('fr-FR')
  const creationHour = creationInstant
    .toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    .replace(':', 'h')

  const datesortie = getFormattedDate(date, "/")
  const heuresortie = getFormattedTime(date, ":")
  const {
    lastname,
    firstname,
    birthday,
    placeofbirth,
    address,
    zipcode,
    city,
  } = profile

  const data = [
    `Cree le: ${creationDate} a ${creationHour}`,
    `Nom: ${lastname}`,
    `Prenom: ${firstname}`,
    `Naissance: ${birthday} a ${placeofbirth}`,
    `Adresse: ${address} ${zipcode} ${city}`,
    `Sortie: ${datesortie} a ${heuresortie}`,
    `Motifs: ${reasons.join(', ')}`,
  ].join(';\n ')

  const pdfBase = document.querySelector("link[rel=certificate]").href
  const existingPdfBytes = await loadFile(pdfBase)
  const pdfDoc = await PDFDocument.load(existingPdfBytes)
  const page1 = pdfDoc.getPages()[0]

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const drawText = (text, x, y, size = 11) => {
    page1.drawText(text, { x, y, size, font })
  }

  drawText(`${firstname} ${lastname}`, 119, 696)
  drawText(birthday, 119, 674)
  drawText(placeofbirth, 297, 674)
  drawText(`${address} ${zipcode} ${city}`, 133, 652)

  reasons.forEach(reason => {
    drawText('x', 78, ys[reason], 18)
  })

  let locationSize = getIdealFontSize(font, city, 83, 7, 11)

  if (!locationSize) {
    locationSize = 7
  }

  drawText(city, 105, 177, locationSize)
  drawText(datesortie, 91, 153, 11)
  drawText(heuresortie, 264, 153, 11)

  const generatedQR = await generateQR(data)

  const qrImage = await pdfDoc.embedPng(generatedQR)

  page1.drawImage(qrImage, {
    x: page1.getWidth() - 156,
    y: 100,
    width: 92,
    height: 92,
  })

  pdfDoc.addPage()
  const page2 = pdfDoc.getPages()[1]
  page2.drawImage(qrImage, {
    x: 50,
    y: page2.getHeight() - 350,
    width: 300,
    height: 300,
  })
  return pdfDoc;
}

function pdf2bytes(pdf) {
  return pdf.save()
}

function bytes2blob(bytes, type='application/pdf') {
  return new Blob([bytes], { type: 'application/pdf' })
}

function getIdealFontSize (font, text, maxWidth, minSize, defaultSize) {
  let currentSize = defaultSize
  let textWidth = font.widthOfTextAtSize(text, defaultSize)

  while (textWidth > maxWidth && currentSize > minSize) {
    textWidth = font.widthOfTextAtSize(text, --currentSize)
  }

  return textWidth > maxWidth ? null : currentSize
}

function generateQR (text) {
  const opts = {
    errorCorrectionLevel: 'M',
    type: 'image/png',
    quality: 0.92,
    margin: 1,
  }
  return QRCode.toDataURL(text, opts)
}

function pad2Zero(str) {
  return String(str).padStart(2, '0')
}

function getFormattedDate(date, sep="-") {
  if (!date) return ""
  const year = date.getFullYear()
  const month = pad2Zero(date.getMonth() + 1)
  const day = pad2Zero(date.getDate())
  if (sep==='-') return `${year}${sep}${month}${sep}${day}`
  if (sep==='/') return `${day}${sep}${month}${sep}${year}`
}

function getFormattedTime(date, sep=":") {
  if (!date) return ""
  const hours = pad2Zero(date.getHours())
  const minutes = pad2Zero(date.getMinutes())
  return `${hours}${sep}${minutes}`
}
function loadFile(path) {
  return fetch(path).then((res) => res.arrayBuffer())
}
async function mergePDF(pdfs) {
  const doc = await PDFDocument.create()
  for (const pdf of pdfs) {
    await doc.copyPages(pdf, pdf.getPageIndices()).then(pages => 
      Promise.all(
        pages.map(
          async page => await doc.addPage(page)
        )
      )
    )
  }
  return doc
}
function clearBlobsLinks() {
  [...document.querySelectorAll("body > a[href^='blob:']")].forEach(
    link => {
      URL.revokeObjectURL(link.href)
      document.body.removeChild(link)
    }
  )
}
function downloadBlob(blob, fileName) {
  clearBlobsLinks()
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.href = url
  link.download = fileName
  link.setAttribute('style', 'display=none')
  document.body.appendChild(link)
  link.click()
}
function showBlob(blob, blank) {
  clearBlobsLinks()
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.href = url
  if (blank) link.target = '_blank'
  link.setAttribute('style', 'display=none')
  document.body.appendChild(link)
  link.click()
}
