const bip39words = require('./bip39-en').words
const utils = require('./utils')
const hmacSHA512 = require('crypto-js/hmac-sha512')
const hmacSHA256 = require('crypto-js/hmac-sha256')
const PBKDF2 = require('crypto-js/pbkdf2')
const cp = require('crypto-js');
const EC = require('elliptic').ec;
const EdDSA = require('elliptic').eddsa;
const ecEd25519 = new EdDSA('ed25519');
const ecSECP256 = new EC('secp256k1');
const ecCurve25519 = new EC('ed25519');
const {sha512_256} = require('js-sha512'); 

const BIP32KEY_HARDEN = 0x80000000
const ed25519_n = 2n**252n + 27742317777372353535851937790883648493n
const _ = undefined

const hexilify   = cp.enc.Hex.stringify
const unhexilify = cp.enc.Hex.parse

const _hmac512  = (message, secret) => hmacSHA512(message, secret)
const _hmac256  = (message, secret) => hmacSHA256(message, secret)
const _getBit   = (character, pattern) => (character &  pattern) >>> 0
const _setBit   = (character, pattern) => (character |  pattern) >>> 0
const _clearBit = (character, pattern) => (character & ~pattern) >>> 0

// In JS, to do bitwise operations with unsigned ints, follow these rules:
// 1. Always end bitwise operations with >>> 0 so the result gets interpreted
//    as unsigned.
// 2. Don't use >>. If the left-most bit is 1 it will try to preseve the sign and 
//    thus will introduce 1's to the left. Always use >>>.
// 3. Only if the last op is >>>, >>> 0 is not necessary.
// Source: https://stackoverflow.com/questions/6798111/bitwise-operations-on-32-bit-unsigned-ints
const _OR  = (x,y) => (x | y) >>> 0
const _AND = (x,y) => (x & y) >>> 0
const _XOR = (x,y) => (x ^ y) >>> 0

// Source: https://en.wikipedia.org/wiki/ANSI_escape_code#Colors
const RED     = s => `\x1b[40m\x1b[31m${s}\x1b[0m`  //black background, red text
const YELLOW  = s => `\x1b[40m\x1b[93m${s}\x1b[0m`  //black background, yellow text
const GREEN   = s => `\x1b[40m\x1b[92m${s}\x1b[0m`  //black background, green text
const GREENBG = s => `\x1b[102m\x1b[30m${s}\x1b[0m` //green background, black text

const _DBUG = false
const TRACE = (k,v, debug=_DBUG) => {
    if(debug) console.log(k.padEnd(12),v)
}
const ENTER = (g   , debug=_DBUG) => { if(debug) console.group(YELLOW('ENTER ' + g)) }
const LEAVE = (g='', debug=_DBUG) => { if(debug) {console.groupEnd(); console.log(YELLOW('LEAVE ' + g))} }

/** @namespace bip39toalgo */

/**
 * @typedef  {Object}   bip39toalgo.WordArray
 * @memberof bip39toalgo
 * @property {number[]} words Bytes array as signed integers
 * @property {number}   sigBytes
 */
 
 /**
 * Stores order of elliptic curve and 
 * {@link https://github.com/satoshilabs/slips/blob/master/slip-0010.md|SLIP10}
 * modifier for master key generation.
 * @typedef  {Object} bip39toalgo.CurveParams
 * @memberof bip39toalgo
 * @property {string} name      Name of elliptic curve
 * @property {string} modifier  Key to use in HMAC-SHA512 as per SLIP10
 * @property {BigInt} order     Order of the elliptic curve
 */

/** 
 * @typedef  {Object}   bip39toalgo.AlgoData
 * @memberof bip39toalgo
 * @property {Object}   algo
 * @property {string}   algo.key        Algorand private key in hexadecimal
 * @property {address}  algo.address    Algorand public wallet address
 * @property {string[]} algo.words      Algorand mnemonic (25 words)
 * @property {string}   algo.pub        Algorand public key in hexadecimal
 * @property {string=}  algo.chk1       Public key cheksum
 * @property {string=}  algo.chk2       Mnemonic cheksum
 */

/**
 * @typedef  {Object}              bip39toalgo.DerivationNode
 * @memberof bip39toalgo
 * @property {(string|bip39toalgo.WordArray)}  kL    Leftmost 32 bytes of private key
 * @property {(string|bip39toalgo.WordArray)}  kR    Rightmost 32 bytes of private Key
 * @property {(string|bip39toalgo.WordArray)=} A     32 bytes public key (y coordinatte only)
 * @property {(string|bip39toalgo.WordArray)=} c     32 bytes chain code
 * @property {(string|bip39toalgo.WordArray)=} P     32 bytes public key
 * @property {bip39toalgo.AlgoData=}           algo
 */

/**
 * Algorand secret mnemonic (25 BIP39 words)
 * @typedef {string[]} bip39toalgo.AlgoSecretWords
 * @memberof bip39toalgo
 */

/**
 * @typedef  {Object}           bip39toalgo.AlgoAddressData
 * @memberof bip39toalgo
 * @property {string}           key
 * @property {string}           pub
 * @property {string}           address
 * @property {string=}          chk
 * @property {bip39toalgo.AlgoSecretWords=} words       Algorand secret words
 */

 /**
 * @typedef  {Object}           bip39toalgo.AlgoMnemonicData
 * @memberof bip39toalgo
 * @property {bip39toalgo.AlgoSecretWords}  words       Algorand secret words  
 * @property {string}           chk         Mnemonic checksum
 */

 /**
 * @typedef  {Object}           bip39toalgo.AlgoParsedMnemonicData
 * @memberof bip39toalgo
 * @property {string}           mnemonic    Parsed Algorand mnemonic
 * @property {string}           original    Original mnemonic normalized (NFKD)
 * @property {bip39toalgo.AlgoSecretWords}  words       Algorand secret words
 * @property {string}           key         Private key in hexadecimal
 * @property {string}           checksum    Mnemonic checksum
 * @property {boolean}          valid       Mnemonic validity
 */

  /**
 * @typedef  {Object}    bip39toalgo.Bip39ParsedMnemonicData
 * @memberof bip39toalgo
 * @property {string}    mnemonic    Parsed Algorand mnemonic
 * @property {string}    original    Original mnemonic normalized (NFKD)
 * @property {string[]}  words       Algorand secret words
 * @property {string}    checkbits   Checksum bits
 * @property {boolean}   valid       Mnemonic validity
 */

/**
 * Returns {@link bip39toalgo.DerivationNode} from arguments
 * @memberof bip39toalgo
 * @param {(string|bip39toalgo.WordArray)} kL   Leftmost 32 bytes of private key
 * @param {(string|bip39toalgo.WordArray)} kR   Rightmost 32 bytes of private Key
 * @param {{A: (string|bip39toalgo.WordArray), 
 *  c: (string|bip39toalgo.WordArray), 
 *  p: (string|bip39toalgo.WordArray)}} args
 * @returns {bip39toalgo.DerivationNode} Derivation node
 */
const _NODE = (kL,kR, ...args) => { 
    [ A, c, p ] = args
    o = { kL, kR, A, c, p }
    var dumps = () => kL.toString()
    return o
}
/** Assertion utility function
 * @returns {boolean}
 */
function _assert(x, y, op='eq'){
    // console.log(x, op, y)
    exp = false
    exp ^= op === 'eq' & x === y
    exp ^= op === 'gt' & x >   y
    exp ^= op === 'ge' & x >=  y
    exp ^= op === 'lt' & x <   y
    exp ^= op === 'le' & x <=  y
    if(exp) return true
    else throw EvalError(RED(`\n${x}\nNOT ${op}\n${y}`))
}
/**
 * Convert integers to BIP39 words
 * @memberof bip39toalgo
 * @param {number[]} nums 11-bit unsigned integers
 * @returns {string[]} List of BIP39 words
 */
const numsToWords = nums => nums.reduce((p,c) => [...p, bip39words[c]],[])
/**
 * Convert {@link https://github.com/bitcoin/bips/blob/master/bip-0039.mediawiki#from-mnemonic-to-seed|BIP39} mnemonic to seed
 * @memberof bip39toalgo
 * @param {string} mnemonic    Mnemonic (12-24 words delimited by single space)
 * @param {string} passphrase  Passphrase as suffix for the salt
 * @param {string=} prefix     Modifier as prefix for the salt
 * @returns {bip39toalgo.WordArray} Seed
 */
function bip39seed(mnemonic, passphrase='',prefix='mnemonic'){
    return new Promise(function(resolve,reject){
        seed = cp.PBKDF2(mnemonic.normalize('NFKD'), prefix+passphrase,{
            hasher: cp.algo.SHA512,
            keySize: 512 / 32,
            iterations: 2048
        })
        if (seed.length === 0) reject('Error: empty seed')
        TRACE('bip39seed',seed.toString())
        resolve(seed)
    })
}
/**
 * Get elliptic curve parameters
 * @memberof bip39toalgo
 * @param {string} curveName Name of the elliptic curve
 * @returns {bip39toalgo.CurveParams} Curve parameters
 */
function curveInfo(curveName){
    curves = {
    secp256k1: {
                name:'secp256k1',
                modifier: 'Bitcoin seed',
                order: BigInt('0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141')
            },
    nist256p1: {
                name:'nist256p1',
                modifier: 'Nist256p1 seed',
                order: BigInt('0xffffffff00000000ffffffffffffffffbce6faada7179e84f3b9cac2fc632551')
            },
    ed25519: {
                name:'ed25519',
                modifier: 'ed25519 seed',
            }
    }
    return curves[curveName]

}
/**
 * Derive root key (master node) using SLIP10 specs or
 * implementing paper from D. Khovratovich and J. Law
 * "BIP32-Ed25519: Hierarchical Deterministic Keys over a Non-linear Keyspace"
 * @memberof bip39toalgo
 * @param {bip39toalgo.WordArray}   seed Entropy to derive root key
 * @param {bip39toalgo.CurveParams} curve Curve parameters
 * @param {string}      [method='slip10'] Derivation method (slip10|kholaw)
 * @returns {Promise<bip39toalgo.DerivationNode>} Promise with derivation node
 */
function rootKey(seed, curve, method='slip10'){
    return new Promise((res,error)=>{
        ENTER('ROOT KEY')
        if(method==='slip10'){
            isAlive = true
            while(isAlive){
                h = hmacSHA512(seed,curve.modifier).toString()
                kL = unhexilify(h.substr(0,64))
                kR = unhexilify(h.substr(64))
                if(curve.name == 'ed25519') isAlive=false
                a = BigInt('0x'+kL)
                if(a<curve.order && a != 0) isAlive=false
                seed = unhexilify(h)
            TRACE('kL',kL.toString())
            TRACE('kR',kR.toString())
            LEAVE()
            res(_NODE(kL,kR))
            }
        } else if(method==='kholaw'){
            c = _hmac256(unhexilify('01'+seed),curve.modifier)
            I = _hmac512(seed, curve.modifier).toString()
            kL = unhexilify(I.substr(0,64))
            kR = unhexilify(I.substr(64))
            kLb = utils.hexToBytes(kL.toString())
            while (_getBit(kLb[31], 0b00100000) !=0){
                seed = unhexilify(I)
                I = _hmac512(seed, curve.modifier).toString()
                kL = unhexilify(I.substr(0,64))
                kR = unhexilify(I.substr(64))
                kLb = utils.hexToBytes(kL.toString())
            }

            kLb[0]  = _clearBit( kLb[0], 0b00000111)
            kLb[31] = _clearBit(kLb[31], 0b10000000)
            kLb[31] =   _setBit(kLb[31], 0b01000000)

            kL = unhexilify(utils.bytesToHex(kLb))
            kLr = utils.bytesToHex(kLb.reverse())

            pub  = ecCurve25519.keyFromPrivate(kLr).getPublic()
            x = pub.getX().toString('hex')
            y = pub.getY().toString('hex')
            A = encodeXY(x,y)

            TRACE('scalar', BigInt('0x'+kLr).toString(10))
            TRACE('x',x)
            TRACE('y',y)

            TRACE('kL',kL.toString())
            TRACE('kR',kR.toString())
            TRACE('A',A)
            TRACE('c',c.toString())
            LEAVE()

            res(_NODE(kL,kR,A,c))
        }
    })
}
/**
 * Computes public key for given curve
 * @memberof bip39toalgo
 * @param {(string|bip39toalgo.WordArray)} key Private key
 * @param {bip39toalgo.CurveParams} curve Curve parameters
 * @returns {string} Public key in hexadecimal
 */
function getPublicKey(key,curve){
    if (curve.name == 'ed25519'){
        k = '00' + utils.bytesToHex(ecEd25519.keyFromSecret(key.toString()).getPublic())
    }
    else if(curve.name == 'secp256k1'){
        pub  = ecSECP256.keyFromPrivate(key.toString()).getPublic()
        x    = pub.getX().toString('hex') // BN -> hex
        y    = pub.getY().toString('hex') // BN -> hex
        padx = x.padStart(64,'0')
        pady = y.padStart(64,'0')
        if (BigInt('0x' + y) & 1n) {
            k = '03' + padx
        } else{
            k = '02' + padx
        }
}
    return k
}
/**
 * Derives child key from parent key data using SLIP10 specs
 * @memberof bip39toalgo
 * @param {(string|bip39toalgo.WordArray)} parentKey    Parent node private key
 * @param {bip39toalgo.WordArray} parentChaincode       Parent node chain code
 * @param {number} i                        Current path index
 * @param {bip39toalgo.CurveParams} curve               Curve params
 * @returns {Promise<bip39toalgo.DerivationNode>}       Child node
 */
function deriveChild(parentKey, parentChaincode, i, curve){
    return new Promise((res,error)=>{
        ENTER('DERIVE CHILD SLIP10')
        data = ''
        if(_AND(i, BIP32KEY_HARDEN)){
            data = '00' + parentKey.toString()
        } else {
            data = getPublicKey(parentKey, curve)
        }
        data += i.toString(16).padStart(8,0) //padded 4 bytes

        while(true){
            h = hmacSHA512(unhexilify(data), parentChaincode).toString()
            kL = unhexilify(h.substr(0,64))
            kR = unhexilify(h.substr(64))
            if(curve.name == 'ed25519') break
            a = BigInt('0x'+kL)
            key = (a + BigInt('0x' + parentKey)) % curve.order

            if(a<curve.order &&  key!= 0){
                kL = unhexilify(key.toString(16).padStart(64,0))
                break
            }
            data = '01' + hexilify(kR) +  i.toString(16).padStart(8,0)
        }

        pub = getPublicKey(kL,curve)

        o = _NODE(kL,kR,_,_,pub)

        TRACE('private',o.kL.toString().padStart(64,0))
        TRACE('chain',o.kR.toString().padStart(64,0))
        TRACE('public',o.p)
        LEAVE()
        res(o)
    })
}
/**
 * Encodes elliptic curve X-coordinate into Y-coordinate
 * @memberof bip39toalgo
 * @param {string} x X-coordinate bytes in hexadecimal
 * @param {string} y Y-coordinate bytes in hexadecimal
 */
function encodeXY(x,y){
    xb = utils.hexToBytes(x)
    yb = utils.hexToBytes(y)
    if(_AND(xb[31],1)){
        yb[0] = (yb[0] | 0x80) >>> 0
    }
    return utils.bytesToHex(yb.reverse())
}
/**
 * Derive child key by implementing paper from D. Khovratovich and J. Law
 * "BIP32-Ed25519: Hierarchical Deterministic Keys over a Non-linear Keyspace"
 * @memberof bip39toalgo
 * @param {bip39toalgo.DerivationNode} node         Parent node
 * @param {number} i                    Current path index
 * @returns {Promise<bip39toalgo.DerivationNode>}   Child node
 */
function deriveChildKhoLaw(node, i){
    ENTER('DERIVE CHILD KHO-LAW')
    return new Promise((res,error)=>{
        kLP = node.kL
        kRP = node.kR
        AP = node.A
        cP = node.c

        ib = utils.reverseHex(i.toString(16).padStart(4*2,'0'))
        
        // TRACE('\nDERIVE CHILD KEY:','')
        TRACE('kLP',hexilify(kLP))
        TRACE('kRP',hexilify(kRP))
        TRACE('AP',AP)
        TRACE('cP',hexilify(cP))
        TRACE('i',i)
        TRACE('ib',ib)

        if(i < 2**31){
            // regular child
            Zi = '02' + AP + ib
            ci = '03' + AP + ib
            Z = _hmac512(unhexilify(Zi), cP).toString()
            c = _hmac512(unhexilify(ci), cP).toString().substr(-32*2)
            TRACE('Zi reg',Zi)
            TRACE('ci reg',ci)
        } else{
            // hardened child
            Zi = '00' + hexilify(kLP) + hexilify(kRP) + ib
            ci = '01' + hexilify(kLP) + hexilify(kRP) + ib
            Z = _hmac512(unhexilify(Zi), cP).toString().toString()
            c = _hmac512(unhexilify(ci), cP).toString().substr(-32*2)
            TRACE('Zi hard',Zi)
            TRACE('ci hard',ci)
        }
        TRACE('Z',Z)
        TRACE('c',c)

        ZL = unhexilify(Z.substr(0,28*2))
        ZR = unhexilify(Z.substr(32*2))

        // compute KRi
        kLn = BigInt('0x'+utils.reverseHex(hexilify(ZL))) * 8n 
            + BigInt('0x'+utils.reverseHex(hexilify(kLP)))
        
        TRACE('ZL',ZL.toString())
        TRACE('ZR',ZR.toString())
        TRACE('kLn',kLn.toString(16))

        if(kLn % ed25519_n == 0n){
            TRACE('kLn is 0','kLn % ed25519')
            res()
        }

        // compute KLi
        kRn = (
            BigInt('0x'+utils.reverseHex(hexilify(ZR)))
          + BigInt('0x'+utils.reverseHex(hexilify(kRP)))
             ) % 2n**256n

        TRACE('kRn',kRn.toString(16))

        kL = utils.reverseHex(kLn.toString(16))
        kR = utils.reverseHex(kRn.toString(16))
        TRACE('kL',kL.toString(16))
        TRACE('kR',kR.toString(16))

        pub  = ecCurve25519.keyFromPrivate(utils.reverseHex(kL)).getPublic()

        x = pub.getX().toString('hex')
        y = pub.getY().toString('hex')
        A = encodeXY(x,y)

        TRACE('scalar', BigInt('0x'+utils.reverseHex(kL)).toString(10))
        TRACE('x',x)
        TRACE('y',y)
        TRACE('A',A)
        LEAVE()

        o =_NODE(unhexilify(kL),unhexilify(kR),A,unhexilify(c))
        res(o)
    })
}

 /**
  * Computes Algorand address and mnemonic from {@link bip39toalgo.DerivationNode}
  * @memberof bip39toalgo
  * @param {bip39toalgo.DerivationNode} node
  * @returns {Promise<bip39toalgo.DerivationNode>} Derivation node with Algorand's secret 
  */
function algoSecret(node){
    ENTER('ALGORAND SECRET')
    return new Promise((res,error)=>{
        var { key, pub, address, chk } = algoAddress(node.kL)
        chk1 = chk
        var { words, chk } = algoMnemonic(key)
        chk2 = chk
        TRACE('key',key)
        TRACE('pub',pub)
        TRACE('pub_chk',chk1)
        TRACE('addr',address)
        TRACE('mnemo_chk',chk2)
        TRACE('words',words)
        LEAVE()
        node.algo = { key,address,words,pub,chk1,chk2 }
        res(node)
    })
}

/**
 * Derives Algorand's public key from private key
 * @memberof bip39toalgo
 * @param {(string|bip39toalgo.WordArray)} key
 * @returns {bip39toalgo.AlgoAddressData} Algorand's address data
 */
function algoAddress(key){
    key = key.toString().padStart(64,'0')
    pub = utils.bytesToHex(ecEd25519.keyFromSecret(key).getPublic())
    chk = (sha512_256(Buffer.from(pub, "hex"))).substr(-8)
    address = utils.hex2b32(pub+chk).replace(/=/g,'')
    return { key, pub, address, chk }
}
/**
 * Translates Algorand private key to mnemonic words
 * @memberof bip39toalgo
 * @param {string} key Private key in hexadecimal
 * @returns {bip39toalgo.AlgoMnemonicData} Algorand's mnemonic data
 */
function algoMnemonic(key){
    nums = utils.bytes2b11(utils.hexToBytes(key))
    words = numsToWords(nums)
    chk = sha512_256(Buffer.from(key, 'hex')).substr(0,2*2)
    chkN = utils.bytes2b11(utils.hexToBytes(chk))
    chkW = numsToWords(chkN)[0]
    words.push(chkW)
    return { words, chk }
}
/**
 * Generates random Algorand address
 * @memberof bip39toalgo
 * @returns {bip39toalgo.AlgoAddressData} Algorand's address data
 */
const randomAlgoAddress = () => utils.randomHex(32).then(ent => algoAddress(ent))

/**
 * Translates Algorand mnemonic to private key
 * @memberof bip39toalgo
 * @param {string} mnemonic 
 * @returns {bip39toalgo.AlgoParsedMnemonicData} Algorand's parsed mnemonic data
 */
function algoKeyFromMnemonic(mnemonic){
    mnemonic = mnemonic.trim().toLowerCase().normalize('NFKD').split(' ')
    if(mnemonic.length !== 25) throw new Error('Invalid mnemonic length: expected 25 words')
    words = mnemonic.map(w => bip39words.find(bw => bw.substr(0,4)==w.substr(0,4)))
    nums = words.map(w => bip39words.findIndex(bw => bw==w))
    if(nums.length !== 25) throw new Error('Invalid mnemonic: one or more words not valid')
    // last word is the checksum:
    csN1 = nums.slice(-1)[0]
    cs1 = csN1.toString(16)
    // convert 11-bit numbers (little endian) to bits:
    bits = nums.slice(0,24).map((e,i) => e.toString(2).padStart(11,'0')).reverse().join('')
    key = utils.reverseHex(utils.bits2hex(bits)).substr(0,64)
    // compute the checksum to verify mnemonic:
    cs2 = sha512_256(key).substr(0,2*2)
    csN2 = utils.bytes2b11(utils.hexToBytes(cs2))[0]
    isValid = csN1 === csN2
    parsed = { 
        mnemonic:words.join(' '),
        original: mnemonic.join(' '),
        words:words,
        key:key,
        checksum:cs1, 
        valid:isValid,
    }
    return parsed
}
/**
 * Derives Algorand public key and address
 * @memberof bip39toalgo
 * @param {string} mnemonic Algorand mnemonic
 * @returns {bip39toalgo.AlgoAddressData} Algorand's address data
 */
function algoAddressFromMnemonic(mnemonic){
    var { key, words, valid } = algoKeyFromMnemonic(mnemonic)
    if(!valid) throw new Error('Invalid mnemonic checksum')
    var { pub, address } = algoAddress(key)
    return { key, pub, address, words }
}
/**
 * Generates N random addresses and counts occurrences of last character
 * @memberof bip39toalgo
 * @param {number} [n=1000] Number of addresses to generate
 * @returns {void} Nothing
 */
function countAddressEnding(n=1000){
    let b32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'.split('')
    let b32map = Object.fromEntries(new Map(b32.map(e => [e,0])))
    let endChars = utils.range(n).map((e,i,a) => randomAlgoAddress().then(algo => {
        if((i+1)%1000==0) console.log(i, algo.address)
        return algo.address.substr(-1)
    }))
    Promise.all(endChars).then(chars => {
        for (let i = chars.length - 1; i >= 0; i--) {
            let c = chars[i]
            b32map[c]++
        }
        console.log(b32map)
    })
}
/**
 * Computes Algorand address and mnemonic from private key
 * @memberof bip39toalgo
 * @param {string} key Private key in hexadecimal
 * @returns {bip39toalgo.AlgoAddressData} Algorand's address data
 */
function algoWords(key){
    return new Promise((res,error)=>{
        var { pub, address } = algoAddress(key)
        var { words } = algoMnemonic(key)
        algo = { key, pub, address, words }
        res(algo)
    })
}
/**
 * Derives Algorand's secret from BIP39 seed and using given method and path
 * @memberof bip39toalgo
 * @param {bip39toalgo.WordArray}   seed    BIP39 seed bytes
 * @param {string}      method  Derivation method
 * @param {string=}     path    Derivation path
 * @returns {Promise<bip39toalgo.DerivationNode>} Derivation node with Algorand's secret
 */
function deriveBip39Seed(seed, method, path="m/44'/283'/0'/0/0"){
    TRACE('method',method)
    TRACE('path',path)

    if(method==='bip39-seed'){
        let o = _NODE()
        o.seed = seed
        o.bip39seed = seed.toString()
        o.kL = unhexilify(seed.toString().substr(0,32*2))
        TRACE('kL',o.kL.toString().padStart(64,0))
        return algoSecret(o)
    }

    curve = curveInfo(method.split('-')[1])
    method = method.split('-')[0]

    return rootKey(seed,curve,method)
    .then(root => {
        TRACE('m_private',root.kL.toString())
        TRACE('m_chain',root.kR.toString())

        path = path.split('/')
        // path.shift(0)
        if(path.indexOf('m') === 0) [ignore, ...path] = path

        return path.reduce((p,c,i,a) => {
            return p.then(o=>{
                idx = parseInt(c)
                if (c.substr(-1) === "'") idx = _OR(idx, BIP32KEY_HARDEN)
                if (curve.name === 'ed25519' && method == 'slip10') idx = _OR(idx, BIP32KEY_HARDEN)
                currPath = a.slice(0,i+1).join('/')
                ENTER(currPath)
                TRACE('parent key',o.kL.toString())
                if(method=='slip10') return deriveChild(o.kL, o.kR, idx, curve).then(o=>{ LEAVE(''); return o })
                if(method=='kholaw') return deriveChildKhoLaw(o, idx).then(o=>{ LEAVE(''); return o })
            })
        }, Promise.resolve(root))
        .then(o=>{
            o.seed = seed
            o.bip39seed = seed.toString()
            return o
        })
    })
    .then(node => algoSecret(node))
}
/**
 * Derives Algorand's secret from BIP39 mnemonic and using given method and path
 * @memberof bip39toalgo
 * @param   {string}    mnemonic    BIP39 mnemonic
 * @param   {string}    method      Derivation method
 * @param   {string=}   path        Derivation path
 * @param   {string=}   passphrase  BIP39 mnemonic passphrase
 * @returns {Promise<bip39toalgo.DerivationNode>} Derivation node with Algorand secret
 * @example
 * // Returns:
 * // 7b6ec191cb3b77f6593cefaddf0489af47bb65e0f4480391bcedd00caa822d11
 * // NMRBZNN2RXUNVLVVPVD53GJV6A2A55QWJXMD2KG42N7NQZB67WXYFGONVA
 * //  1. sorry       6. laugh      11. setup      16. employ     21. favorite   
 * //  2. aisle       7. tissue     12. kit        17. call       22. gaze       
 * //  3. similar     8. upset      13. isolate    18. venture    23. maximum    
 * //  4. royal       9. volcano    14. bonus      19. item       24. abandon    
 * //  5. unveil     10. beach      15. poem       20. snack      25. leave
 * mnemonic = 'all all all all all all all all all all all all all all all all all all all all all all all feel'
 * deriveMnemonic(mnemonic,"slip10-ed25519", "m/44'/283'/0'/0/0")
 * .then(node => {
 *     console.log(node.algo.key)
 *     console.log(node.algo.address)
 *     words = prettifyWordsTTB(node.algo.words)
 *     console.log(words)
 * })
 */
function deriveMnemonic(mnemonic, method, path, passphrase=''){
    return bip39seed(mnemonic,passphrase).then(seed => deriveBip39Seed(seed, method, path))
}
/**
 * Formats list of 25 words in a 5x5 grid, indexed Left-to-Right
 * @memberof bip39toalgo
 * @param {bip39toalgo.AlgoSecretWords} words - Algorand secret words
 * @returns {string} Formatted words list with line breaks
 */
function prettifyWordsLTR(words){
    prettyWords = []
    row = []
    words.map((w,i)=>{
            w = ((i+1).toString().padStart(2) + '. ' + w).padEnd(15)
            row.push(w)
            if((i+1)%5==0) {
                prettyWords.push(row.join(''))
                row = []
            }
        })
    return prettyWords.join('\n')
}
/**
 * Formats list of 25 words in a 5x5 grid, indexed Top-to-Bottom
 * @memberof bip39toalgo
 * @param {bip39toalgo.AlgoSecretWords} words - Algorand secret words
 * @returns {string} Formatted words list with line breaks
 */
function prettifyWordsTTB(words){
    prettyWords = words.map((w,i)=>{
        w = ((i+1).toString().padStart(2) + '. ' + w).padEnd(15)
        if(i>=20) w += '\n'
        return w
    }).map((w,i,a)=>{
        return a[5*(i%5) + Math.floor(i/5)]
    })
    return prettyWords.join('')
}
/**
 * Computes BIP39 checksum bits for given entropy
 * @memberof bip39toalgo
 * @param {string} ent Entropy bytes in hexadecimal
 * @param {number} cs  Checksum length in bits
 * @returns {string} Checksum bits
 */
function entCheckBits(ent, cs){
    chk = cp.SHA256(unhexilify(ent)).toString().substr(0,2) //get first byte
    return utils.hex2bits(chk).substr(0,cs).padStart(cs)
}
/**
 * Translates entropy into BIP39 mnemonic words
 * @memberof bip39toalgo
 * @param   {string}   ent 
 * @returns {string[]} BI39 words list
 */
function ent2bip39words(ent){
    cs = ent.length*8/2/32
    entChecked = utils.hex2bits(ent).substr(0,ent.length*8/2+cs)+entCheckBits(ent,cs)
    nums = utils.bits2uintN(11,entChecked)
    wlist = numsToWords(nums)
    return wlist
}
/**
 * Generates random BIP39 words
 * @memberof bip39toalgo
 * @param {number} size Entropy size in bytes (16|20|24|28|32)
 * @returns {string} Mnemonic words
 */
const randomWords = size => utils.randomHex(size).then(r => ent2bip39words(r)).then(w => w.join(' '))
/**
 * Find word in BIP39 wordlist
 * @memberof bip39toalgo
 * @param {string} word BIP39 word to search
 * @returns {(string|undefined)} Found word
 */
function findBip39Word(word){
    w = word.trim().toLowerCase().normalize('NFKD').substr(0,4)
    return bip39words.find(bw => bw.substr(0,4)==w)
}
/**
 * Parses BIP39 mnemonic and verifies validity
 * @memberof bip39toalgo
 * @param {string} mnemonic 
 * @returns {bip39toalgo.Bip39ParsedMnemonicData}
 */
function parseMnemonic(mnemonic){
    mnemonic = mnemonic.trim().toLowerCase().normalize('NFKD').split(' ')
    words = mnemonic.map(w => bip39words.find(bw => bw.substr(0,4)==w.substr(0,4)))
    nums = words.map(w => bip39words.findIndex(bw => bw==w))
    bits = utils.uintN2bits(11,nums)
    cs = bits.length % 32
    ent = utils.bits2hex(bits.substr(0,bits.length-cs))
    chkBits1 = bits.substr(-cs)
    chkBits2 = entCheckBits(ent, cs)
    isValid = chkBits1 === chkBits2
    parsed = { 
        mnemonic:words.join(' '),
        original: mnemonic.join(' '),
        words:words, 
        checkbits:chkBits1, 
        valid:isValid,
    }
    return parsed
}
/**
 * Generate dummy BIP39 mnemonic for testing
 * @memberof bip39toalgo
 * @param {string} [word='all'] Dummy BIP39 word to repeat 
 * @param {number} [size=24]    Number of words (12|15|18|21|24)
 * @example
 * // returns "dog dog dog dog dog dog dog dog dog dog dog dose"
 * console.log(testMnemonicWords('dog',12).join(' '))
 * @example
 * // returns "boy boy boy boy boy boy boy boy boy boy boy boy boy boy boss"
 * console.log(testMnemonicWords('boy',15).join(' '))
 * @example
 * // returns "bar bar bar bar bar bar bar bar bar bar bar bar bar bar bar bar bar bar bar bar bar bar bar anxiety"
 * console.log(testMnemonicWords('bar',24).join(' '))
 */
function testMnemonicWords(word='all',size=24){
    dummyMnemonic = `${word.trim()} `.repeat(size).trim()
    mnemonic = dummyMnemonic.trim().toLowerCase().normalize('NFKD').split(' ')
    words = mnemonic.map(w => bip39words.find(bw => bw.substr(0,4)==w.substr(0,4)))
    nums = words.map(w => bip39words.findIndex(bw => bw==w))
    bits = utils.uintN2bits(11,nums)
    cs = bits.length % 32
    ent = utils.bits2hex(bits.substr(0,bits.length-cs))
    // chkBits = entCheckBits(ent, cs)
    return ent2bip39words(ent)
}
/**
 * Derive mnemonic for given test vector
 * @memberof bip39toalgo
 * @param {{ no: number, mnemonic: string, 
 *  method: string, path: string, key: string, 
 *  address: string }} testVector
 * @returns {void} Nothing
 */
function deriveMnemonicTest({ no, mnemonic, method, path, key, address }) {
    ENTER(`Test #${no}: ${method}`, true)
    return deriveMnemonic(mnemonic, method, path)
    .then(o=>{
        // console.log(o.algo)
        TRACE('test key', key, true)
        TRACE('test address', address, true)
        let { valid } = parseMnemonic(mnemonic)
        _assert(valid, true)
        _assert(o.algo.key, key)
        _assert(o.algo.address, address)
        console.log(prettifyWordsLTR(o.algo.words))
        TRACE(GREENBG('assertion'), GREENBG('OK'), true)
        return true
    })
    .then(done => LEAVE('', true))
}
/**
 * Run tests and log to console
 * @memberof bip39toalgo
 * @returns {void} Nothing
 */
function tests() {
    vectors = [
        { 
            no:         1,
            mnemonic:   'all all all all all all all all all all all all all all all all all all all all all all all feel',
            method:     wallets.ledger.method,
            path:       wallets.ledger.path,
            key:        '1075ab5e3fcedcb69eef77974b314cc0cbc163c01a0c354989dc70b8789a194f',
            address:    'NVGXFOROGBDBUW6CEQDX6V742PWFPLXUDKW6V7HOZHFD7GSQEB556GUZII'
        },
        { 
            no:         2,
            mnemonic:   'all all all all all all all all all all all all all all all all all all all all all all all feel',
            method:     wallets.coinomi.method,
            path:       wallets.coinomi.path,
            key:        '7b6ec191cb3b77f6593cefaddf0489af47bb65e0f4480391bcedd00caa822d11',
            address:    'NMRBZNN2RXUNVLVVPVD53GJV6A2A55QWJXMD2KG42N7NQZB67WXYFGONVA'
        },
        { 
            no:         3,
            mnemonic:   'all all all all all all all all all all all all',
            method:     wallets.exodus.method,
            path:       wallets.exodus.path,
            key:        '0c9b6a753e82afef190302853c14cdadc8d229cec3196ee464e41f0bc5c2519e',
            address:    'ZXLNDDUAYCYFXJI33HXUXLNVUTMQMSG6HRXV6JT2KNSU2SP4J7GUZG5BWU'
        },
        { 
            no:         4,
            mnemonic:   'all all all all all all all all all all all all',
            method:     wallets.atomic.method,
            path:       wallets.atomic.path,
            key:        'c76c4ac4f4e4a00d6b274d5c39c700bb4a7ddc04fbc6f78e85ca75007b5b495f',
            address:    'YQDDGDM3BKPQ5RAIYGCT7JX6DCIMVQHTHITSPJWKNLIPETB2JR6MPKC43A'
        },
        { 
            no:         5,
            mnemonic:   'bar bar bar bar bar bar bar bar bar bar bar bar bar bar bar bar bar bar bar bar bar bar bar anxiety',
            method:     wallets.ledger.method,
            path:       wallets.ledger.path,
            key:        'c896059cbb23f5e29692ce23c5c56aeea6376ae63dfb513e03e42b75be51e646',
            address:    'KS4ACRBVNAKFAEKK5XWV5HV355FDPBRNG37VTJYU646WLAGWD26L6FSIRA'
        },
        { 
            no:         6,
            mnemonic:   'bar bar bar bar bar bar bar bar bar bar bar bar bar bar bar bar bar bar bar bar bar bar bar anxiety',
            method:     wallets.trust.method,
            path:       wallets.trust.path,
            key:        '83fffaec238ae65b1ef4195d01d6c670348335f78ee6407e70c07cd356cd462e',
            address:    'DDVQJSNA7KMZAR3WTZXQHB53KKXHI7AGQOQSPLQL4Y5PTY7IMNTATQMTAE'
        },
        { 
            no:         7,
            mnemonic:   'dog dog dog dog dog dog dog dog dog dog dog dose',
            method:     wallets.exodus.method,
            path:       wallets.exodus.path,
            key:        '9bcbf75ea8b0997771c19e8440e3bce7675374bbe926f608cdbf671d42171966',
            address:    'QKYJ7CY3ZDJZ7GZE7FJ6S5WK5MKKTNBJBS2L7B2LUKSHSMEJWFG4KIS3FI'
        },
        { 
            no:         8,
            mnemonic:   'dog dog dog dog dog dog dog dog dog dog dog dose',
            method:     wallets.atomic.method,
            path:       wallets.atomic.path,
            key:        '0eed13381c206469210932dd7f58b0a84b9d44b1b63e9f963b0d4c4d1baead3f',
            address:    'CWEAA3OJTGY2IJOACHISLWAJNR6XMFNRLCD7MXRPFUBESTMMKSQ42XRBOI'
        },
        

    ]
    vectors.reduce((p, v, arr) => {
        return p.then(() => deriveMnemonicTest(v))
    },Promise.resolve())
    .catch(console.log)
}

const wallets = {
        atomic  :{ method: 'bip39-seed'      ,path: undefined           },
        coinomi :{ method: 'slip10-ed25519'  ,path: "m/44'/283'/0'/0/0" },
        exodus  :{ method: 'slip10-secp256k1',path: "m/44'/283'/0'/0/0" },
        ledger  :{ method: 'kholaw-ed25519'  ,path: "m/44'/283'/0'/0/0" },
        trust   :{ method: 'slip10-ed25519'  ,path: "m/44'/283'/0'/0/0" },
    }


//-------------------------------------------------------
//::EXAMPLE::
//-------------------------------------------------------
// mnemonic = 'all all all all all all all all all all all all all all all all all all all all all all all feel'
// deriveMnemonic(mnemonic, wallets.ledger.method, wallets.ledger.path)
// .then(node => {
//     console.log(node.algo.key)
//     console.log(node.algo.address)
//     words = prettifyWordsTTB(node.algo.words)
//     console.log(words)
// })

//-------------------------------------------------------
//::GENERATE DUMMY MNEMONICS FOR TESTING::
//-------------------------------------------------------
// console.log(testMnemonicWords('dog',12).join(' '))
// console.log(testMnemonicWords('boy',15).join(' '))
// console.log(testMnemonicWords('bar',24).join(' '))

//-------------------------------------------------------
//::RUN TEST VECTORS::
//-------------------------------------------------------
// tests()

module.exports = {
    algoWords,
    algoAddressFromMnemonic,
    bip39seed,
    deriveBip39Seed,
    deriveMnemonic,
    findBip39Word,
    parseMnemonic,
    prettifyWordsTTB,
    randomAlgoAddress,
    randomWords,
    tests,
    wallets,
}
