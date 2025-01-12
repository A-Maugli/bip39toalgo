const {
  PDFDocument,
  StandardFonts,
  rgb
} = PDFLib
/**
 * @namespace document
 */

/**
 * @namespace mainjs
 */

/**
 * Click Event
 * @event document#click
 * @type {Object}
 * @property {HTMLElement} target
 * @property {number} which
 */

/**
 * Keyboard Event
 * @event document#keyboard
 * @type {Object}
 * @property {HTMLElement} target
 * @property {number} which
 * @property {number} keyCode
 */

/**
 * Focus Event
 * @event document#focus
 * @type {Object}
 * @property {HTMLElement} target
 */

/**
 * Change Event
 * @event document#change
 * @type {Object}
 * @property {HTMLElement} target
 */

/**
 * Window Resize
 * @event document#resize
 * @type {Object}
 * @property {window} target
 */

/**
 * Window Hash Change
 * @event document#hashchange
 * @type {Object}
 * @property {window} target
 */

/**
 * @typedef  {Object}   mainjs.WordArray
 * @memberof mainjs
 * @property {number[]} words Bytes array as signed integers
 * @property {number}   sigBytes
 */

/**
 * Default parameters
 * @typedef {{method: string, path: string, mnemonic: string, 
 * passphrase: string, client: string, mnemonicLabel: string}} mainjs.params
 * @memberof mainjs
 */

/** @type {mainjs.params} */
const DefaultParams = {
  method: 'slip10-ed25519',
  path: "m/44'/283'/0'/0/0",
  mnemonic: '',
  passphrase: '',
  client: 'coinomi',
  mnemonicLabel: 'Enter BIP39 Mnemonic (12-24 words)...'
}

/** @type {string[]} */
const clients = ['atomic', 'coinomi', 'exodus', 'ledger', 'trust', 'custom', 'search']

/**
 * @typedef {Object} Status
 * @property {number} done  Completed task
 * @property {number} wip   Work in progress
 * @property {number} err   There was an error
 */
const Status = {
  done: 31401,
  wip: 31402,
  err: 31403
}

const bk = {
  xs: 0,
  sm: 576,
  md: 768,
  lg: 992,
  xl: 1200,
  xxl: 1400
}
const vw = () => Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0)
const vh = () => Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0)

/**
 * Returns current viewport breakpoint
 * @returns {string} Abbreviated breakpoint (xs|sm|md|lg|xl|xxl)
 */
const D = () => [...Object.entries(bk)].reverse().reduce((p, [k, v], i) => {
  if (vw() >= v && p === "na") return k;
  else return p
}, "na")

// State global variable:
/** 
 * @type {{d: string, algo: Object, statusTimeoutId: number}} 
 * @memberof mainjs
 */
var S = {
  d: undefined,
  algo: undefined,
  statusTimeoutId: undefined
}

/** 
 * @type {number}
 * @memberof mainjs  
 */
var intervalId

function onDocumentReadyHandler() {
  clear('all')
  S.d = D()
  updateStatus('Ready!')
  tabSwitcher()
}
/**
 * Changes navigation tab based on window location hash
 * @memberof mainjs
 * @listens document#hashchange
 */
function tabSwitcher() {
  switch (window.location.hash) {
    case '#':
    case '':
    case undefined:
    case '#mnemoTab':
      showMnemonicTab()
      break;
    case '#addressTab':
      showAddressTab()
      break;
    case '#infoTab':
      showInfoTab()
      break;
    default:
      // do nothing
      break;
  }
}

/**
 * Generates array with numbers from 0 [+ offset] to N [+ offset]
 * @memberof mainjs  
 * @param {number} n     Size of array
 * @param {number} [o=0] Offset
 * @returns {Array} Array with N numbers
 */
const range = (n, o = 0) => Array.from(new Uint8Array(n).map((e, i) => i + o))

/**
 * Gets current parameters
 * @memberof mainjs  
 * @returns {mainjs.params} params
 */
function getParams() {
  params = {
    mnemonic: $('#mnemoTxt').val(),
    method: $('#method option:checked')[0].text,
    path: getPath(),
    passphrase: $('#mnemoPass').val(),
    client: $('#clients option:checked').val(),
    mnemonicLabel: $('#mnemoLbl').html(),
  }
  return params
}
/**
 * Gets current selected path
 * @memberof mainjs  
 * @returns {string} path
 */
function getPath() {
  path = "m"
  ip = $('.deriv-path')
  ip.map(i => {
    path += '/' + (parseInt(ip[i].value) ? parseInt(ip[i].value) : 0)
    if (i < 3) path += "'"
  })
  return path
}
/**
 * Clears form fields and reset to defaults
 * @memberof mainjs  
 * @param {string} include - Section to include while clearing
 */
function clear(include) {
  $('#bip39seed').val('')
  $('#algoAddress').val('')
  $('#algoKey').val('')
  $('#qrcode').html('')
  $('#qrcode2').html('')
  $('.algo-secret').hide()
  $('#algoMnemonic').html('')
  S.algo = undefined
  if (include == 'mnemonic' || include == 'all') $('#mnemoTxt').val('')
  if (include == 'lookup' || include == 'all') {
    $('#lookupWhat').val('')
    $('#lookupWhat').removeClass('is-valid')
    $('#lookupWhat').removeClass('is-invalid')
    $('#lookupFeedback').html('')
  }
  if (include == 'search' || include == 'all') {
    $('#searchAddress').val('')
    $('#searchAddress').removeClass('is-valid')
    $('#searchAddress').removeClass('is-invalid')
    $('#searchFeedback').html('')
  }
  if (include == 'all') {
    // $('#coinomi')[0].checked = true
    changeWalletClient(DefaultParams.client)
  }
}
/**
 * Switches navigation to the Mnemonic tab
 * @memberof mainjs  
 * @returns {void} Nothing
 */
function showMnemonicTab() {
  $('#mainTitle').html('BIP39 to Algorand Mnemonic')
  $('.mnemo-tab').show()
  $('.address-tab').hide()
  $('.info-tab').hide()
  $('.tools-tab').show()
  $('#mnemoTab').addClass('active')
  $('#addressTab').removeClass('active')
  $('#infoTab').removeClass('active')
  $('#searchSection').hide()
  clear()
  changeWalletClient(getParams().client)
}
/**
 * Switches navigation to the My Cool Address tab
 * @memberof mainjs  
 * @returns {void} Nothing
 */
function showAddressTab() {
  $('#mainTitle').html('Find Me a Cool Address')
  $('.mnemo-tab').hide()
  $('.address-tab').show()
  $('.info-tab').hide()
  $('.tools-tab').show()
  $('#mnemoTab').removeClass('active')
  $('#addressTab').addClass('active')
  $('#infoTab').removeClass('active')
  clear('lookup')
}
/**
 * Switches navigation to the More Info tab
 * @memberof mainjs
 * @returns {void} Nothing
 */
function showInfoTab() {
  $('#mainTitle').html('')
  $('.mnemo-tab').hide()
  $('.address-tab').hide()
  $('.info-tab').show()
  $('.tools-tab').hide()
  $('#mnemoTab').removeClass('active')
  $('#addressTab').removeClass('active')
  $('#infoTab').addClass('active')
  // clear('lookup')
}
/**
 * Displays a status message
 * @memberof mainjs  
 * @param {string} m - Message to display in status
 * @param {Status} s - Status of the task, if done it wil auto clear
 * @returns {void}
 */
function updateStatus(m, s = Status.done) {
  if (S.statusTimeoutId) clearTimeout(S.statusTimeoutId)
  clearStatus()
  if (s === Status.done) {
    S.statusTimeoutId = setTimeout(() => clearStatus(), 3000)
    $("#status").addClass("text-white bg-success")
  } else if (s === Status.wip) {
    $("#status").addClass("text-dark bg-warning")
  } else if (s === Status.err) {
    S.statusTimeoutId = setTimeout(() => clearStatus(), 3000)
    $("#status").addClass("text-white bg-danger")
  } else return
  $("#status").addClass('shadow-sm px-3 py-1')
  $("#status > small").html(m)
}
/**
 * Clears status message
 * @memberof mainjs
 * @returns {void}
 */
function clearStatus() {
  c = ['shadow-sm', 'px-3', 'py-1', 'text-white', 'text-dark',
    'bg-success', 'bg-warning', 'bg-danger'
  ]
  $("#status").removeClass(c)
  $("#status > small").html('')
  S.statusTimeoutId = undefined
}
/**
 * Generates random BIP39 mnemonic
 * @memberof mainjs
 * @returns {void}
 */
function generateMnemonic() {
  w = parseInt($('#mnemoRandSize option:selected').val())
  s = (w * 11 - (w * 11) % 32) / 8
  bip39toalgo.randomWords(s).then(random => {
    $('#mnemoTxt').val(random)
    checkMnemonic()
  })
}
/**
 * Clears mnemonic and (in)valid feedback
 * @memberof mainjs
 * @returns {void}
 */
function clearMnemonic() {
  clear('all')
  $('#mnemoTxt').removeClass('is-valid')
  $('#mnemoTxt').removeClass('is-invalid')
}
/**
 * Verifies if BIP39 mnemonic is valid
 * @memberof mainjs
 * @returns {void}
 */
function checkMnemonic() {
  sel = getParams()
  parsedMnemonic = bip39toalgo.parseMnemonic(sel.mnemonic)
  if (!sel.mnemonic || sel.mnemonic == '') {
    $('#mnemoTxt').removeClass('is-valid')
    $('#mnemoTxt').removeClass('is-invalid')
  } else if (parsedMnemonic.valid) {
    $('#mnemoTxt').addClass('is-valid')
    $('#mnemoTxt').removeClass('is-invalid')
    // $('#mnemoLbl').html('invalid mnemonic')
  } else {
    $('#mnemoTxt').addClass('is-invalid')
    $('#mnemoTxt').removeClass('is-valid')
  }
}
/**
 * Updates path fields in form
 * @memberof mainjs
 * @param {string} path Full derivation path
 * @param {number} disableIndex Disable input for all path index less than this
 * @returns {void}
 */
function printPath(path, disableIndex = -1) {
  ip = $('.deriv-path')
  ip.map(i => {
    if (path) ip[i].value = parseInt(path.split('/')[i + 1])
    else ip[i].value = ''
    if (i < disableIndex) ip[i].disabled = true
    else ip[i].disabled = false
  })
}
/**
 * Changes selected derivation method in dropdown
 * @memberof mainjs
 * @param {string} method Derivation method
 * @returns {void}
 */
function changeMethod(method) {
  mt = $('#method option')
  mt.map(i => {
    if (mt[i].text == method) mt[i].selected = true
  })
}
/**
 * Changes selected wallet client in dropdown
 * @memberof mainjs
 * @param {string} client Wallet client
 * @returns {void}
 */
function changeWalletClient(client) {
  idx = clients.indexOf(client)
  if (idx === -1) throw new Error(`Client "${client}" not supported!`)
  $('#clients')[0].selectedIndex = idx
  if (client != 'custom' && client != 'search') {
    wallet = bip39toalgo.wallets[client]
    $('#searchSection').hide()
    $('#method').prop('disabled', true)
    if (client == 'atomic') printPath(wallet.path, 999)
    else printPath(wallet.path, 2)
    changeMethod(wallet.method)
  } else if (client == 'custom') {
    printPath(DefaultParams.path)
    $('#method').prop('disabled', false)
    $('#searchSection').hide()
  } else if (client == 'search') {
    printPath(DefaultParams.path, 999)
    $('#method').prop('disabled', true)
    $('#searchSection').show()
    $('#startBtn').prop('disabled', true)
  }
  if(client != "search") $('#startBtn').prop('disabled', false)
}
/**
 * Handles change wallet client event and calls {@link mainjs.changeWalletClient}
 * @memberof mainjs
 * @param {document#event:change} e Change event
 * @listens document#change
 */
function handleChangeWalletClient(e) {
  client = e.target.selectedOptions[0].value
  changeWalletClient(client)
}
/**
 * Derives BIP39 mnemonic with selected params and computes related Algorand's mnenomic
 * @memberof mainjs
 * @listens document#click
 * @returns {void}
 */
function startMnemonicDerivation() {
  sel = getParams()
  parsedMnemonic = bip39toalgo.parseMnemonic(sel.mnemonic)
  if (parsedMnemonic.valid) {
    $('#mnemoTxt').removeClass('is-invalid')
    $('#mnemoTxt').addClass('is-valid')
    bip39toalgo.deriveMnemonic(sel.mnemonic, sel.method, sel.path, sel.passphrase)
      .then(node => {
        // console.log(node)
        $('#bip39seed').val(node.bip39seed)
        $('#algoAddress').val(node.algo.address)
        $('#algoKey').val(node.algo.key)
        $('#mnemoTxt').val(parsedMnemonic.mnemonic)
        printWords(node.algo.words)
        printQR(node.algo.words)
        S.algo = node.algo
        updateStatus('done!')
      })
  } else {
    $('#mnemoTxt').removeClass('is-valid')
    $('#mnemoTxt').addClass('is-invalid')
  }
}
/**
 * Displays Alorand secret words section
 * @memberof mainjs
 * @param {string[]} words
 * @returns {void}
 */
function printWords(words) {
  $('.algo-secret').show()
  o = $('#algoMnemonic')
  o.html('')
  s = (D() === 'xs' || D() === 'sm') ? 2 : 5
  cols = range(s).map(i => {
    let div = document.createElement('div')
    div.classList.add('col')
    return div
  })
  idx = 0
  words.map((w, i) => {
    let div = document.createElement('div')
    let pre = document.createElement('pre')
    let span = document.createElement('span')
    div.classList.add('row')
    pre.innerHTML = `${(i+1).toString().padStart(2,' ')}. `
    span.innerHTML = w
    span.style.color = '#d63384' //pink
    pre.appendChild(span)
    div.appendChild(pre)
    cols[idx].appendChild(div)
    if (s == 2 && i == 12) idx++
    if (s == 5 && i % 5 == 4) idx++
  })
  cols.forEach(c => o.append(c))
}

/**
 * Re-print words if viewport crosses one of the defined breakpoints
 * @memberof mainjs
 * @listens document#resize
 * @returns {void}
 */
function rePrintWords() {
  if (D() !== S.d) {
    S.d = D()
    if (S.algo) printWords(S.algo.words)
  }
}
/**
 * Generates and prints QR code with words data
 * @memberof mainjs
 * @param {string[]} words Algorand secret words
 * @returns {void}
 */
function printQR(words) {
  algoMnemonic = {
    version: '1.0',
    mnemonic: words.join(' ')
  }
  $('#qrcode').html('')
  $('#qrcode').qrcode({
    text: JSON.stringify(algoMnemonic),
    width: 296,
    height: 296,
  })
}
/**
 * Generates and prints QR code witl wallet address
 * @memberof mainjs
 * @param {string} address Algorand wallet address
 * @returns {void}
 */
function printAddressQR(address) {
  // txt = {version:'1.0',address: address}
  $('#qrcode2').html('')
  $('#qrcode2').qrcode({
    text: address,
    width: 296,
    height: 296,
  })
}
/**
 * Copies to clipboard the value of clicked element
 * @param {document#event:click} e Click event
 * @listens document#click
 * @returns {void}
 */
function copyTargetValue(e) {
  if (e.target.value || e.target.value !== '') {
    e.target.select()
    e.target.setSelectionRange(0, 99999) /* For mobile devices */
    document.execCommand('copy')
    updateStatus('Copied')
  }
}
/**
 * Searches for Algorand wallet address that starts with given prefix
 * @memberof mainjs
 * @param {string} prefix Beginning sequence of characters to search
 * @param {boolean} alive Active process indicator
 * @param {number} id Interval Id
 * @param {number} tick Initial timestampt
 */
function findMyCoolAddress(prefix, alive, id, tick) {
  bip39toalgo.randomAlgoAddress()
    .then(algo => {
      alive = !algo.address.startsWith(prefix.toUpperCase())
      if (!alive) {
        if (algo) $('#algoAddress').val(algo.address)
        clearInterval(id)
        tock = Date.now()
        $('#lookupFeedback').html('<br>Address found in ' + (tock - tick) / 1000 + ' seconds')
        $('#lookupBtn').prop('disabled', false)
        $('#lookupBtnSpinner').hide()
        $('#algoKey').val(algo.key)
        bip39toalgo.algoWords(algo.key).then(algo => {
          printWords(algo.words)
          printQR(algo.words)
          S.algo = algo
          updateStatus('done!')
        })
      }
    })
}
/**
 * Starts search for wallet address that begins with prefix
 * @memberof mainjs
 * @param {string} prefix Beginning sequence of characters to search
 * @param {boolean} alive Active process indicator
 * @returns {number} Interval Id
 */
function startMyCoolAddressLookup(prefix, alive) {
  clear()
  tick = Date.now()
  updateStatus('Working...', Status.wip)
  id = setInterval(() => {
    findMyCoolAddress(prefix, alive, id, tick)
  }, 10)
  return id
}
/**
 * Handles click address lookup and calls
 * {@link mainjs.startMyCoolAddressLookup}
 * @memberof mainjs
 * @listens document#click
 * @returns {void}
 */
function handleMyCoolAddressLookup() {
  where = 'prefix'
  what = $('#lookupWhat').val()
  check = checkBase32Input('#lookupWhat', '#lookupInvalid', 6)
  if (check > 0) {
    $('#lookupFeedback').html('')
    $('#lookupBtn').prop('disabled', true)
    $('#lookupBtnSpinner').show()
    intervalId = startMyCoolAddressLookup(what, true)
  }
}
/**
 * Kills address lookup process
 * @memberof mainjs
 * @listens document#click
 */
function killMyCoolAddressLookup() {
  clearInterval(intervalId)
  updateStatus('Canceled', Status.err)
  $('#lookupBtn').prop('disabled', false)
  $('#lookupBtnSpinner').hide()
}
/**
 * Derives mnemonic for given field and evaluates if 
 * derived Algorand address matches given address
 * @memberof mainjs
 * @param {string} address Algorand wallet address to search
 * @param {mainjs.WordArray} seed BIP39 seed WordArray
 * @param {string[]} field Search field with derivation method/path combinations
 * @param {number} id Interval Id that started the process
 * @returns {void}
 */
function derivationSearch(address, seed, field, id) {
  if (field.length == 0) {
    // done searching entire derivation method/path field
    return bip39toalgo.deriveBip39Seed(seed, 'bip39-seed', "m/0'/0'/0'/0/0")
      .then(node => {
        $('#bip39seed').val(node.bip39seed)
        $('#algoAddress').val('Not found')
        $('#algoKey').val('Not found')
        updateStatus('Not found!', Status.err)
        return true
      })
      .then(done => endDerivationSearch(done, id))
  }
  method = field[0][0]
  path = field[0][1]
  field.shift()
  ip.map(i => {
    ip[i].value = parseInt(path.split('/')[i + 1])
  })
  mt = $('#method option')
  mt.map(i => {
    if (mt[i].text == method) mt[i].selected = true
  })

  return bip39toalgo.deriveBip39Seed(seed, method, path)
    .then(node => {
      $('#bip39seed').val(node.bip39seed)
      $('#algoAddress').val(node.algo.address)
      $('#algoKey').val(node.algo.key)
      ip = $('.deriv-path')
      if (address == node.algo.address) {
        printWords(node.algo.words)
        printQR(node.algo.words)
        S.algo = node.algo
        updateStatus('done!')
        return true
      } else return false
    })
    .then(done => endDerivationSearch(done, id))
}
/**
 * Starts derivation search process
 * @memberof mainjs
 * @param {string} address Algorand wallet address to search
 * @returns {void}
 */
function startDerivationSearch(address) {
  clear()
  tick = Date.now()
  sel = getParams()
  updateStatus('Working...', Status.wip)
  bip39toalgo.bip39seed(sel.mnemonic, sel.passphrase, )
    .then(seed => {
      methods = ['slip10-ed25519', 'slip10-secp256k1', 'kholaw-ed25519']
      paths = []
      field = [
        ['bip39-seed', "m/0'/0'/0'/0/0"]
      ]
      range(10).map(i => range(10).map(j => paths.push("m/44'/283'/" + i + "'/0/" + j)))
      methods.forEach(m => paths.forEach(p => field.push([m, p])))
      i = 0
      id = setInterval(() => {
        derivationSearch(address, seed, field, id)
      }, 10)
      intervalId = id
    })
}
/**
 * Handles derivation search click event
 * and calls {@link mainjs.startDerivationSearch}
 * @memberof mainjs
 * @listens document#click
 */
function handleDerivationSearch() {
  check = checkBase32Input('#searchAddress', '#searchInvalid', 58, false)
  if (check > 0) {
    sel = getParams()
    parsedMnemonic = bip39toalgo.parseMnemonic(sel.mnemonic)
    if (parsedMnemonic.valid) {
      $('#searchBtn').prop('disabled', true)
      $('#searchBtnSpinner').show()
      address = $('#searchAddress').val()
      startDerivationSearch(address)
    } else {
      $('#mnemoTxt').removeClass('is-valid')
      $('#mnemoTxt').addClass('is-invalid')
    }
  }
}
/**
 * Ends derivation search
 * @memberof mainjs
 * @param {boolean} done Complete indicator
 * @param {number} id Interval Id to clear
 * @returns {void}
 */
function endDerivationSearch(done, id) {
  if (done) {
    clearInterval(id)
    $('#searchBtn').prop('disabled', false)
    $('#searchBtnSpinner').hide()
  }
}
/**
 * Handles cancel derivation search click event
 * @memberof mainjs
 * @listens document#click
 */
function killDerivationSearch(){
  updateStatus('Canceled', Status.err)
  endDerivationSearch(true, intervalId)
}
/**
 * Handles mnemonic input keyboard event,
 * provides auto-complete suggestions
 * and validates word to BIP39 wordlist
 * @memberof mainjs
 * @param {document#event:keyboard} e Keyboard event
 * @listens document#keyboard
 */
function mnemonicKeyboardEventHandler(e) {
  keyCode = e.keyCode || e.which
  m = e.target.value.trim().toLowerCase().normalize('NFKD').split(' ')
  w = m.slice(-1)[0]
  // bw = undefined
  if (e.type == 'keyup' && keyCode != 9) {
    bw = bip39toalgo.findBip39Word(w)
    if (bw) {
      $('#mnemoLbl').html(bw)
      $('#mnemoTxt').removeClass('is-invalid')
    } else if (w.length > 2) {
      w = m.slice(-1)[0]
      $('#mnemoLbl').html('invalid word "' + w + '"')
      $('#mnemoTxt').addClass('is-invalid')
      $('#mnemoTxt').removeClass('is-valid')
    }
  } else if (keyCode == 9) {
    e.preventDefault()
    w = m.slice(-1)[0]
    bw = bip39toalgo.findBip39Word(w)
    if (bw) e.target.value = (m.slice(0, -1).join(' ') + ' ' + bw).trim()
  }
}
/**
 * Handles mnemonic input focusout event
 * @memberof mainjs
 * @param {document#event:focus} e Focusout event
 * @listens document#focus
 * @returns {void}
 */
function mnemonicFocusoutHangler(e) {
  $('#mnemoLbl').html(DefaultParams.mnemonicLabel)
  checkMnemonic()
}
/**
 * Checks if input is a valid base32 string,
 * meets given length/range criteria
 * and is a valid Algorand address
 * @memberof mainjs
 * @param {string} inputFieldId 
 * @param {string} invalidFeedbackId 
 * @param {number} maxLength 
 * @param {boolean} [range=true]
 * @returns {number}
 */
function checkBase32Input(inputFieldId, invalidFeedbackId, maxLength, range = true) {
  b32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
  inputField = $(inputFieldId)
  invalidFeedback = $(invalidFeedbackId)
  m = inputField.val().trim().toUpperCase().normalize('NFKD').split('')
  isValid = true
  if (!range && m.length != maxLength) {
    inputField.removeClass('is-valid')
    inputField.addClass('is-invalid')
    invalidFeedback.html('Invalid search: please input ' + maxLength + ' characters (A-Z and 2-7)')
    return -1
  }
  // out of bounds
  if (m.length == 0 || m.length > maxLength) {
    inputField.removeClass('is-valid')
    inputField.addClass('is-invalid')
    invalidFeedback.html('Invalid search: please input 1 to ' + maxLength + ' characters (A-Z and 2-7)')
    return -1
  }
  // Algorand addresses have length of 58 chars
  if (maxLength == 58 && m.length == 58) {
    b32endings = b32.split('').reduce((p, c, i) => {
      if (i % 4 == 0) p.push(c);
      return p
    }, [])
    validEnding = b32endings.indexOf(m.splice(-1)[0]) >= 0
    if (!validEnding) {
      inputField.removeClass('is-valid')
      inputField.addClass('is-invalid')
      invalidFeedback.html('Invalid Algorand address, last character should be A,E,I,M,Q,U,Y or 4')
      return -1
    }
  }

  m.map((e, i, a) => {
    isValid &= b32.search(e) >= 0
  })

  if (!isValid) {
    inputField.removeClass('is-valid')
    inputField.addClass('is-invalid')
    invalidFeedback.html('Invalid search: valid characters are A-Z and 2-7')
    return -1
  } else {
    inputField.removeClass('is-invalid')
    inputField.addClass('is-valid')
    return 1
  }
}

/**
 * Formats list of 25 words in a 5x5 grid, indexed Top-to-Bottom
 * @memberof mainjs
 * @param {string[]} words - List of Algorand's 25 secret words
 * @returns {string} Formatted string
 */
function prettifyWords(words) {
  prettyWords = words.map((w, i) => {
    w = ((i + 1).toString().padStart(2) + '. ' + w).padEnd(15)
    if (i >= 20) w += '\n'
    return w
  }).map((w, i, a) => {
    return a[5 * (i % 5) + Math.floor(i / 5)]
  })
  return prettyWords.join('')
}
/**
 * Creates PDF file on-the-fly (i.e. offline, 
 * all done in the browser) with Algorand Wallet and Secret
 * @memberof mainjs
 * @listens document#click
 */
async function createPdf() {
  const pdfDoc = await PDFDocument.create()
  const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman)
  const courierFont = await pdfDoc.embedFont(StandardFonts.Courier)
  const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica)

  const page = pdfDoc.addPage()

  printAddressQR(S.algo.address)
  const addressCanvas = $("#qrcode2 > canvas")[0]
  const addressCanvasImageData = addressCanvas ? addressCanvas.toDataURL() : undefined
  const addressCanvasImage = await pdfDoc.embedPng(addressCanvasImageData)
  $('#qrcode2').html('')

  const secretCanvas = $("#qrcode > canvas")[0]
  const secretCanvasImageData = secretCanvas ? secretCanvas.toDataURL() : undefined
  const secretCanvasImage = await pdfDoc.embedPng(secretCanvasImageData)

  const addressCanvasDims = addressCanvasImage.scale(0.5)
  const secretCanvasDims = secretCanvasImage.scale(0.7)

  const fontSize = 11

  height = page.getHeight() - 4 * fontSize
  txt = `ALGORAND OFFLINE PAPER WALLET
Use this wallet as a cold storage option. Import the wallet address as a view-only account in
the official Algorand app. Your secret will be completely offline. Store in a secure place!`

  page.drawText(txt, {
    x: 50,
    y: height,
    size: fontSize,
    font: helveticaFont,
    color: rgb(0, 0, 0)
  })

  txt = `Wallet Address\n`
  height -= 8 * fontSize
  page.drawText(txt, {
    x: 50,
    y: height,
    size: fontSize,
    font: helveticaFont,
    color: rgb(0, 0, 0)
  })

  txt = `${S.algo.address}\n`
  height -= 2 * fontSize
  page.drawText(txt, {
    x: 50,
    y: height,
    size: fontSize,
    font: courierFont,
    color: rgb(214 / 255, 51 / 255, 132 / 255) // magenta
  })

  height -= 2 * fontSize + addressCanvasDims.height
  page.drawImage(addressCanvasImage, {
    x: page.getWidth() / 2 - addressCanvasDims.width / 2, // center horizontally
    y: height,
    width: addressCanvasDims.width,
    height: addressCanvasDims.height,
  })

  txt = `Wallet Secret\n`
  height -= 4 * fontSize
  page.drawText(txt, {
    x: 50,
    y: height,
    size: fontSize,
    font: helveticaFont,
    color: rgb(0, 0, 0)
  })

  txt = prettifyWords(S.algo.words)
  height -= 2 * fontSize
  page.drawText(txt, {
    x: 50,
    y: height,
    size: fontSize,
    font: courierFont,
    color: rgb(214 / 255, 51 / 255, 132 / 255) // magenta
  })

  height -= 11 * fontSize + secretCanvasDims.height
  page.drawImage(secretCanvasImage, {
    x: page.getWidth() / 2 - secretCanvasDims.width / 2, // center horizontally
    y: height,
    width: secretCanvasDims.width,
    height: secretCanvasDims.height,
  })

  // Serialize the PDFDocument to bytes (a Uint8Array)
  const pdfBytes = await pdfDoc.save()

  // Trigger the browser to download the PDF document
  download(pdfBytes, `${S.algo.address}.pdf`, "application/pdf");
}

$(document).ready(onDocumentReadyHandler)
$(window).on('hashchange', tabSwitcher)
$(window).resize(rePrintWords)

// $('#mnemoTab').on('click', showMnemonicTab)
// $('#addressTab').on('click', showAddressTab)
// $('#infoTab').on('click', showInfoTab)

$('#mnemoClear').on('click', clearMnemonic)
$('#mnemoRand').on('click', generateMnemonic)
$('#clearResultsBtn').on('click', clear)
$('#bip39seed, #algoAddress, #algoKey').on('click', copyTargetValue)

$('#startBtn').on('click', startMnemonicDerivation)
$('#clients').on('change', handleChangeWalletClient)

$('#searchBtn').on('click', handleDerivationSearch)
$('#searchKill').on('click', killDerivationSearch)
$('#searchClear').on('click', () => clear('search'))

$('#lookupBtn').on('click', handleMyCoolAddressLookup)
$('#lookupKill').on('click', killMyCoolAddressLookup)
$('#lookupClear').on('click', () => clear('lookup'))

$('#mnemoTxt').on('keyup keydown', mnemonicKeyboardEventHandler)
$('#mnemoTxt').on('focusout', mnemonicFocusoutHangler)

$('#searchAddress').on('keyup', function (e) {
  checkBase32Input('#searchAddress', '#searchInvalid', 58)
})
$('#lookupWhat').on('keyup', function (e) {
  checkBase32Input('#lookupWhat', '#lookupInvalid', 6)
})

$('#btnPDF').on('click', () => createPdf())
