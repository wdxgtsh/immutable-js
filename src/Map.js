var Sequence = require('./Sequence').Sequence;


class Map extends Sequence {

  // @pragma Construction

  constructor(object) {
    if (!object) {
      return Map.empty();
    }
    return Map.fromObject(object);
  }

  static empty() {
    return __EMPTY_MAP || (__EMPTY_MAP = Map._make(0, null));
  }

  static fromObject(object) {
    var map = Map.empty().asTransient();
    for (var k in object) if (object.hasOwnProperty(k)) {
      map = map.set(k, object[k]);
    }
    return map.asPersistent();
  }

  toString() {
    return this.__toString('Map {', '}');
  }

  // @pragma Access

  has(k) {
    return this.get(k, __SENTINEL) !== __SENTINEL;
  }

  get(k, undefinedValue) {
    if (k == null || this._root == null) {
      return undefinedValue;
    }
    return this._root.get(0, hashValue(k), k, undefinedValue);
  }

  getIn(keyPath, pathOffset) {
    pathOffset = pathOffset || 0;
    var nested = this.get(keyPath[pathOffset]);
    if (pathOffset === keyPath.length - 1) {
      return nested;
    }
    if (nested && nested.getIn) {
      return nested.getIn(keyPath, pathOffset + 1);
    }
  }

  // @pragma Modification

  clear() {
    if (this._ownerID) {
      this.length = 0;
      this._root = null;
      return this;
    }
    return Map.empty();
  }

  set(k, v) {
    if (k == null) {
      return this;
    }
    var newLength = this.length;
    var newRoot;
    if (this._root) {
      var didAddLeaf = BoolRef();
      newRoot = this._root.set(this._ownerID, 0, hashValue(k), k, v, didAddLeaf);
      didAddLeaf.value && newLength++;
    } else {
      newLength++;
      newRoot = makeNode(this._ownerID, 0, hashValue(k), k, v);
    }
    if (this._ownerID) {
      this.length = newLength;
      this._root = newRoot;
      return this;
    }
    return newRoot === this._root ? this : Map._make(newLength, newRoot);
  }

  setIn(keyPath, v, pathOffset) {
    pathOffset = pathOffset || 0;
    if (pathOffset === keyPath.length - 1) {
      return this.set(keyPath[pathOffset], v);
    }
    var k = keyPath[pathOffset];
    var nested = this.get(k, __SENTINEL);
    if (nested === __SENTINEL || !nested.setIn) {
      if (typeof k === 'number') {
        nested = require('./Vector').empty();
      } else {
        nested = Map.empty();
      }
    }
    return this.set(k, nested.setIn(keyPath, v, pathOffset + 1));
  }

  delete(k) {
    if (k == null || this._root == null) {
      return this;
    }
    if (this._ownerID) {
      var didRemoveLeaf = BoolRef();
      this._root = this._root.delete(this._ownerID, 0, hashValue(k), k, didRemoveLeaf);
      didRemoveLeaf.value && this.length--;
      return this;
    }
    var newRoot = this._root.delete(this._ownerID, 0, hashValue(k), k);
    return !newRoot ? Map.empty() : newRoot === this._root ? this : Map._make(this.length - 1, newRoot);
  }

  deleteIn(keyPath, pathOffset) {
    pathOffset = pathOffset || 0;
    if (pathOffset === keyPath.length - 1) {
      return this.delete(keyPath[pathOffset]);
    }
    var k = keyPath[pathOffset];
    var nested = this.get(k);
    if (!nested || !nested.deleteIn) {
      return this;
    }
    return this.set(k, nested.deleteIn(keyPath, pathOffset + 1));
  }

  // @pragma Composition

  merge(seq) {
    if (seq == null) {
      return this;
    }
    if (!seq.forEach) {
      seq = Sequence(seq);
    }
    var newMap = this.asTransient();
    seq.forEach((value, key) => {
      newMap = newMap.set(key, value);
    });
    return this.isTransient() ? newMap : newMap.asPersistent();
  }

  // @pragma Mutability

  isTransient() {
    return !!this._ownerID;
  }

  asTransient() {
    return this._ownerID ? this : Map._make(this.length, this._root, new OwnerID());
  }

  asPersistent() {
    this._ownerID = undefined;
    return this;
  }

  clone() {
    return Map._make(this.length, this._root, this._ownerID && new OwnerID());
  }

  // @pragma Iteration

  toMap() {
    return this.isTransient() ? this.clone().asPersistent() : this;
  }

  cacheResult() {
    return this;
  }

  __deepEqual(other) {
    var is = require('./Persistent').is;
    // Using Sentinel here ensures that a missing key is not interpretted as an
    // existing key set to be null.
    var self = this;
    return other.every((v, k) => is(v, self.get(k, __SENTINEL)));
  }

  __iterate(fn) {
    return this._root ? this._root.iterate(this, fn) : 0;
  }

  __reverseIterate(fn) {
    return this._root ? this._root.reverseIterate(this, fn): 0;
  }

  // @pragma Private

  static _make(length, root, ownerID) {
    var map = Object.create(Map.prototype);
    map.length = length;
    map._root = root;
    map._ownerID = ownerID;
    return map;
  }
}


class OwnerID {
  constructor() {}
}

function makeNode(ownerID, shift, hash, key, valOrNode) {
  var idx = (hash >>> shift) & MASK;
  var keys = [];
  var values = [];
  values[idx] = valOrNode;
  key != null && (keys[idx] = key);
  return new BitmapIndexedNode(ownerID, 1 << idx, keys, values);
}


class BitmapIndexedNode {

  constructor(ownerID, bitmap, keys, values) {
    this.ownerID = ownerID;
    this.bitmap = bitmap;
    this.keys = keys;
    this.values = values;
  }

  get(shift, hash, key, notFound) {
    var idx = (hash >>> shift) & MASK;
    if ((this.bitmap & (1 << idx)) === 0) {
      return notFound;
    }
    var keyOrNull = this.keys[idx];
    var valueOrNode = this.values[idx];
    if (keyOrNull == null) {
      return valueOrNode.get(shift + SHIFT, hash, key, notFound);
    }
    return key === keyOrNull ? valueOrNode : notFound;
  }

  set(ownerID, shift, hash, key, value, didAddLeaf) {
    var editable;
    var idx = (hash >>> shift) & MASK;
    var bit = 1 << idx;
    if ((this.bitmap & bit) === 0) {
      didAddLeaf && (didAddLeaf.value = true);
      editable = this.ensureOwner(ownerID);
      editable.keys[idx] = key;
      editable.values[idx] = value;
      editable.bitmap |= bit;
      return editable;
    }
    var keyOrNull = this.keys[idx];
    var valueOrNode = this.values[idx];
    var newNode;
    if (keyOrNull == null) {
      newNode = valueOrNode.set(ownerID, shift + SHIFT, hash, key, value, didAddLeaf);
      if (newNode === valueOrNode) {
        return this;
      }
      editable = this.ensureOwner(ownerID);
      editable.values[idx] = newNode;
      return editable;
    }
    if (key === keyOrNull) {
      if (value === valueOrNode) {
        return this;
      }
      editable = this.ensureOwner(ownerID);
      editable.values[idx] = value;
      return editable;
    }
    var originalHash = hashValue(keyOrNull);
    if (hash === originalHash) {
      newNode = new HashCollisionNode(ownerID, hash, [keyOrNull, key], [valueOrNode, value]);
    } else {
      newNode = makeNode(ownerID, shift + SHIFT, originalHash, keyOrNull, valueOrNode)
        .set(ownerID, shift + SHIFT, hash, key, value);
    }
    didAddLeaf && (didAddLeaf.value = true);
    editable = this.ensureOwner(ownerID);
    delete editable.keys[idx];
    editable.values[idx] = newNode;
    return editable;
  }

  delete(ownerID, shift, hash, key, didRemoveLeaf) {
    var editable;
    var idx = (hash >>> shift) & MASK;
    var bit = 1 << idx;
    var keyOrNull = this.keys[idx];
    if ((this.bitmap & bit) === 0 || (keyOrNull != null && key !== keyOrNull)) {
      return this;
    }
    if (keyOrNull == null) {
      var node = this.values[idx];
      var newNode = node.delete(ownerID, shift + SHIFT, hash, key, didRemoveLeaf);
      if (newNode === node) {
        return this;
      }
      if (newNode) {
        editable = this.ensureOwner(ownerID);
        editable.values[idx] = newNode;
        return editable;
      }
    } else {
      didRemoveLeaf && (didRemoveLeaf.value = true);
    }
    if (this.bitmap === bit) {
      return null;
    }
    editable = this.ensureOwner(ownerID);
    delete editable.keys[idx];
    delete editable.values[idx];
    editable.bitmap ^= bit;
    return editable;
  }

  ensureOwner(ownerID) {
    if (ownerID && ownerID === this.ownerID) {
      return this;
    }
    return new BitmapIndexedNode(ownerID, this.bitmap, this.keys.slice(), this.values.slice());
  }

  iterate(map, fn) {
    for (var ii = 0; ii < this.values.length; ii++) {
      var key = this.keys[ii];
      var valueOrNode = this.values[ii];
      if (key != null) {
        if (fn(valueOrNode, key, map) === false) {
          return false;
        }
      } else if (valueOrNode && !valueOrNode.iterate(map, fn)) {
        return false;
      }
    }
    return true;
  }

  reverseIterate(map, fn) {
    for (var ii = this.values.length - 1; ii >= 0; ii--) {
      var key = this.keys[ii];
      var valueOrNode = this.values[ii];
      if (key != null) {
        if (fn(valueOrNode, key, map) === false) {
          return false;
        }
      } else if (valueOrNode && !valueOrNode.iterate(map, fn)) {
        return false;
      }
    }
    return true;
  }
}


class HashCollisionNode {

  constructor(ownerID, collisionHash, keys, values) {
    this.ownerID = ownerID;
    this.collisionHash = collisionHash;
    this.keys = keys;
    this.values = values;
  }

  get(shift, hash, key, notFound) {
    var idx = this.keys.indexOf(key);
    return idx === -1 ? notFound : this.values[idx];
  }

  set(ownerID, shift, hash, key, value, didAddLeaf) {
    if (hash !== this.collisionHash) {
      didAddLeaf && (didAddLeaf.value = true);
      return makeNode(ownerID, shift, hash, null, this)
        .set(ownerID, shift, hash, key, value);
    }
    var idx = this.keys.indexOf(key);
    if (idx >= 0 && this.values[idx] === value) {
      return this;
    }
    var editable = this.ensureOwner(ownerID);
    if (idx === -1) {
      editable.keys.push(key);
      editable.values.push(value);
      didAddLeaf && (didAddLeaf.value = true);
    } else {
      editable.values[idx] = value;
    }
    return editable;
  }

  delete(ownerID, shift, hash, key, didRemoveLeaf) {
    var idx = this.keys.indexOf(key);
    if (idx === -1) {
      return this;
    }
    didRemoveLeaf && (didRemoveLeaf.value = true);
    if (this.values.length > 1) {
      var editable = this.ensureOwner(ownerID);
      editable.keys[idx] = editable.keys.pop();
      editable.values[idx] = editable.values.pop();
      return editable;
    }
  }

  ensureOwner(ownerID) {
    if (ownerID && ownerID === this.ownerID) {
      return this;
    }
    return new HashCollisionNode(ownerID, this.collisionHash, this.keys.slice(), this.values.slice());
  }

  iterate(map, fn) {
    for (var ii = 0; ii < this.values.length; ii++) {
      if (fn(this.values[ii], this.keys[ii], map) === false) {
        return false;
      }
    }
    return true;
  }

  reverseIterate(map, fn) {
    for (var ii = this.values.length - 1; ii >= 0; ii--) {
      if (fn(this.values[ii], this.keys[ii], map) === false) {
        return false;
      }
    }
    return true;
  }
}

var __BOOL_REF = {value: false};
function BoolRef(value) {
  __BOOL_REF.value = value;
  return __BOOL_REF;
}

function hashValue(o) {
  if (!o) { // false, 0, and null
    return 0;
  }
  if (o === true) {
    return 1;
  }
  if (typeof o.hash === 'function') {
    return o.hash();
  }
  var type = typeof o;
  if (type === 'number') {
    return Math.floor(o) % 2147483647; // 2^31-1
  }
  if (type === 'string') {
    return hashString(o);
  }
  throw new Error('Unable to hash');
}

// http://jsperf.com/string-hash-to-int
function hashString(string) {
  var hash = STRING_HASH_CACHE[string];
  if (hash == null) {
    // This is the hash from JVM
    // The hash code for a string is computed as
    // s[0] * 31 ^ (n - 1) + s[1] * 31 ^ (n - 2) + ... + s[n - 1],
    // where s[i] is the ith character of the string and n is the length of
    // the string. We mod the result to make it between 0 (inclusive) and 2^32
    // (exclusive).
    hash = 0;
    for (var ii = 0; ii < string.length; ii++) {
      hash = (31 * hash + string.charCodeAt(ii)) % STRING_HASH_MAX_VAL;
    }
    if (STRING_HASH_CACHE_SIZE === STRING_HASH_CACHE_MAX_SIZE) {
      STRING_HASH_CACHE_SIZE = 0;
      STRING_HASH_CACHE = {};
    }
    STRING_HASH_CACHE_SIZE++;
    STRING_HASH_CACHE[string] = hash;
  }
  return hash;
}

var STRING_HASH_MAX_VAL = 0x100000000; // 2^32
var STRING_HASH_CACHE_MAX_SIZE = 255;
var STRING_HASH_CACHE_SIZE = 0;
var STRING_HASH_CACHE = {};


var SHIFT = 5; // Resulted in best performance after ______?
var SIZE = 1 << SHIFT;
var MASK = SIZE - 1;
var __SENTINEL = {};
var __EMPTY_MAP;

module.exports = Map;
