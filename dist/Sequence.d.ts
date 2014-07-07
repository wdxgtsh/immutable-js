import Vector = require('./Vector');
import Map = require('./Map');
import Set = require('./Set');

export declare function Sequence<V, C>(seq: IndexedSequence<V, C>): IndexedSequence<V, C>;
export declare function Sequence<K, V, C>(seq: Sequence<K, V, C>): Sequence<K, V, C>;
export declare function Sequence<T>(array: Array<T>): IndexedSequence<T, Array<T>>;
export declare function Sequence<T>(obj: {[key: string]: T}): Sequence<string, T, {[key: string]: T}>;
export declare function Sequence<T>(...values: Array<T>): IndexedSequence<T, Array<T>>;
export declare function Sequence(): Sequence<any, any, any>;

/**
 * TODO
 */
export interface Sequence<K, V, C> {

  /**
   * Some sequences can describe their length lazily. When this is the case,
   * length will be set to an integer. Otherwise it will be undefined.
   *
   * For example, the new IndexedSequences returned from map() or reverse()
   * preserve the length of the original sequence.
   */
  length?: number;

  toString(): string;

  isTransient(): boolean;

  asPersistent(): Sequence<K, V, C>;

  /**
   * Converts this to a JavaScript native equivalent. IndexedSequence and Set
   * returns an Array while other Sequences return an Object.
   */
  toJS(): any;

  toArray(): Array<V>;

  toObject(): Object;

  toVector(): Vector<V>;

  toMap(): Map<K, V>;

  toSet(): Set<V>;

  equals(other: Sequence<K, V, C>): boolean;

  join(separator?: string): string;

  reverse(): Sequence<K, V, C>;

  keys(): IndexedSequence<K, C>;

  values(): IndexedSequence<V, C>;

  entries(): IndexedSequence</*(K, V)*/Array<any>, C>;

  forEach(
    sideEffect: (value?: V, key?: K, collection?: C) => any,
    context?: Object
  ): void;

  first(
    predicate?: (value?: V, index?: number, collection?: C) => boolean,
    context?: Object
  ): V;

  last(
    predicate?: (value?: V, index?: number, collection?: C) => boolean,
    context?: Object
  ): V;

  reduce<R>(
    reducer: (reduction?: R, value?: V, key?: K, collection?: C) => R,
    initialReduction?: R,
    context?: Object
  ): R;

  reduceRight<R>(
    reducer: (reduction?: R, value?: V, key?: K, collection?: C) => R,
    initialReduction: R,
    context?: Object
  ): R;

  every(
    predicate: (value?: V, key?: K, collection?: C) => boolean,
    context?: Object
  ): boolean;

  some(
    predicate: (value?: V, key?: K, collection?: C) => boolean,
    context?: Object
  ): boolean;

  get(key: K, notFoundValue?: V): V;

  find(
    predicate: (value?: V, key?: K, collection?: C) => boolean,
    context?: Object,
    notFoundValue?: V
  ): V;

  findKey(
    predicate: (value?: V, key?: K, collection?: C) => boolean,
    context?: Object
  ): K;

  findLast(
    predicate: (value?: V, key?: K, collection?: C) => boolean,
    context?: Object,
    notFoundValue?: V
  ): V;

  findLastKey(
    predicate: (value?: V, key?: K, collection?: C) => boolean,
    context?: Object
  ): K;

  flip(): Sequence<V, K, C>;

  map<M>(
    mapper: (value?: V, key?: K, collection?: C) => M,
    context?: Object
  ): Sequence<K, M, C>;

  filter(
    predicate: (value?: V, key?: K, collection?: C) => boolean,
    context?: Object
  ): Sequence<K, V, C>;

  slice(start: number, end?: number): Sequence<K, V, C>;

  take(amount: number): Sequence<K, V, C>;

  takeLast(amount: number): Sequence<K, V, C>;

  takeWhile(
    predicate: (value?: V, key?: K, collection?: C) => boolean,
    context?: Object
  ): Sequence<K, V, C>;

  takeUntil(
    predicate: (value?: V, key?: K, collection?: C) => boolean,
    context?: Object
  ): Sequence<K, V, C>;

  skip(amount: number): Sequence<K, V, C>;

  skipLast(amount: number): Sequence<K, V, C>;

  skipWhile(
    predicate: (value?: V, key?: K, collection?: C) => boolean,
    context?: Object
  ): Sequence<K, V, C>;

  skipUntil(
    predicate: (value?: V, key?: K, collection?: C) => boolean,
    context?: Object
  ): Sequence<K, V, C>;

  cacheResult(): Sequence<K, V, C>;
}


/**
 * TODO
 */
export interface IndexedSequence<V, C> extends Sequence<number, V, C> {

  __reversedIndices: boolean;

  /**
   * When IndexedSequence is converted to an array, the index keys are
   * maintained. This differs from the behavior of Sequence which
   * simply makes a dense array of all values.
   * @override
   */
  toArray(): Array<V>;

  /**
   * This has the same altered behavior as `toArray`.
   * @override
   */
  toVector(): Vector<V>;

  /**
   * If this is a sequence of entries (key-value tuples), it will return a
   * sequence of those entries.
   */
  fromEntries(): Sequence<any, any, C>;

  /**
   * This new behavior will not only iterate through the sequence in reverse,
   * but it will also reverse the indices so the last value will report being
   * at index 0. If you wish to preserve the original indices, set
   * maintainIndices to true.
   * @override
   */
  reverse(maintainIndices?: boolean): IndexedSequence<V, C>;

  /**
   * Indexed sequences have a different `filter` behavior, where the filtered
   * values have new indicies incrementing from 0. If you want to preserve the
   * original indicies, set maintainIndices to true.
   * @override
   */
  filter(
    predicate: (value?: V, index?: number, collection?: C) => boolean,
    context?: Object,
    maintainIndices?: boolean
  ): IndexedSequence<V, C>;

  /**
   * Returns the first index at which a given value can be found in the
   * sequence, or -1 if it is not present.
   */
  indexOf(searchValue: V): number;

  /**
   * Returns the last index at which a given value can be found in the
   * sequence, or -1 if it is not present.
   */
  lastIndexOf(searchValue: V): number;

  /**
   * Returns the first index in the sequence where a value satisfies the
   * provided predicate function. Otherwise -1 is returned.
   */
  findIndex(
    predicate: (value?: V, index?: number, collection?: C) => boolean,
    context?: Object
  ): number;

  /**
   * Returns the last index in the sequence where a value satisfies the
   * provided predicate function. Otherwise -1 is returned.
   */
  findLastIndex(
    predicate: (value?: V, index?: number, collection?: C) => boolean,
    context?: Object
  ): number;

  slice(start: number, end?: number, maintainIndices?: boolean): IndexedSequence<V, C>;

  /**
   * Indexed sequences have a different `take` behavior. The amount to take is
   * based on indicies, rather than set values, which means it takes unset
   * indicies as well as set ones.
   * @override
   */
  take(amount: number, maintainIndices?: boolean): IndexedSequence<V, C>;

  takeLast(amount: number, maintainIndices?: boolean): IndexedSequence<V, C>;

  takeWhile(
    predicate: (value?: V, index?: number, collection?: C) => boolean,
    context?: Object,
    maintainIndices?: boolean
  ): IndexedSequence<V, C>;

  takeUntil(
    predicate: (value?: V, index?: number, collection?: C) => boolean,
    context?: Object,
    maintainIndices?: boolean
  ): IndexedSequence<V, C>;

  /**
   * Indexed sequences have a different `skip` behavior. The amount to skip is
   * based on indicies, rather than set values, which means it skips over unset
   * indicies as well as set ones. Has the same altered behavior as `skipWhile`.
   * @override
   */
  skip(amount: number, maintainIndices?: boolean): IndexedSequence<V, C>;

  skipLast(amount: number, maintainIndices?: boolean): IndexedSequence<V, C>;

  /**
   * Indexed sequences have a different `skipWhile` behavior. The first
   * non-skipped value will have an index of 0. If you want to preserve the
   * original indicies, set maintainIndices to true.
   * @override
   */
  skipWhile(
    predicate: (value?: V, index?: number, collection?: C) => boolean,
    context?: Object,
    maintainIndices?: boolean
  ): IndexedSequence<V, C>;

  /**
   * Has the same altered behavior as `skipWhile`.
   * @override
   */
  skipUntil(
    predicate: (value?: V, index?: number, collection?: C) => boolean,
    context?: Object,
    maintainIndices?: boolean
  ): IndexedSequence<V, C>;

  // All below methods have identical behavior as Sequence,
  // except they take a function with index: number instead of key: K
  // and return an IndexedSequence.

  asPersistent(): IndexedSequence<V, C>;

  map<M>(
    mapper: (value?: V, index?: number, collection?: C) => M,
    context?: Object
  ): IndexedSequence<M, C>;



  cacheResult(): IndexedSequence<V, C>;
}
