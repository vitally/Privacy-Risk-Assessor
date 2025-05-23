/**
 * Checks if a given object is iterable.
 * An object is considered iterable if it's not null or undefined and has a [Symbol.iterator] method.
 * @param {any} obj - The object to check.
 * @returns {boolean} True if the object is iterable, false otherwise.
 */
export function isIterable(obj) {
  // checks for null and undefined
  if (obj == null) { 
    return false;
  }
  return typeof obj[Symbol.iterator] === 'function';
}
