/**
 * Created by ksinger on 01.09.2015.
 */
import GeoPoint from "geopoint";
import Immutable from "immutable";

/**
 * Attaches the contents of `attachments` to `target` using the constiable names from `names`
 * @param target the object
 * @param names array of constiable names
 * @param attachments array of objects/values
 */
export function attach(target, names, attachments) {
  const pairs = zipWith(
    (name, attachment) => [name, attachment],
    names,
    attachments
  );
  for (const [name, attachment] of pairs) {
    target[name] = attachment;
  }
}

export function dispatchEvent(elem, eventName, eventData) {
  let event = undefined;
  if (eventData) {
    event = new CustomEvent(eventName, { detail: eventData });
  } else {
    event = new Event(eventName);
  }
  elem.dispatchEvent(event);
}

/*
 * Freezes an object recursively.
 *
 * Taken from:
 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/freeze
 */
export function deepFreeze(obj) {
  // Retrieve the property names defined on obj
  const propNames = Object.getOwnPropertyNames(obj);

  // Freeze properties before freezing self
  propNames.forEach(function(name) {
    const prop = obj[name];

    // Freeze prop if it is an object
    if (typeof prop == "object" && !Object.isFrozen(prop)) deepFreeze(prop);
  });

  // Freeze self
  return Object.freeze(obj);
}

export function delay(milliseconds) {
  return new Promise(resolve =>
    window.setTimeout(() => resolve(), milliseconds)
  );
}

/**
 * Generate string of [a-z0-9] with specified length
 * @param length
 * @returns {*}
 */
export function generateIdString(length) {
  const characters = "abcdefghijklmnopqrstuvwxyz0123456789";

  const arrayOfRandoms = length =>
    Array.apply(null, Array(length)).map(() => Math.random());

  return arrayOfRandoms(length)
    .map(randomFloat => Math.floor(randomFloat * characters.length))
    .map(randomPosition => characters.charAt(randomPosition))
    .join("");
}

export function readAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject("Something exploded in the FileReader");

    reader.readAsDataURL(file);
  });
}

/**
 * Stable method of determining the type
 * taken from http://bonsaiden.github.io/JavaScript-Garden/
 *
 * NOTE: `NaN` has a type of "Number". Use `isValidNumber` to
 * catch those as well.
 *
 * @param type
 * @param obj
 * @return {boolean}
 */
export function is(type, obj) {
  const clas = Object.prototype.toString.call(obj).slice(8, -1);
  return obj !== undefined && obj !== null && clas === type;
}

export function isValidNumber(num) {
  // isNaN accepts string-numbers, `is` catches that
  return !isNaN(num) && is("Number", num);
}

export function msStringToDate(ts) {
  if (is("String", ts)) {
    ts = Number.parseInt(ts);
  }
  return new Date(ts);
}

/**
 * Searches the nominatim address-lookup service and
 * returns a list with the search results.
 */
export function searchNominatim(searchStr) {
  const url =
    "https://nominatim.openstreetmap.org/search" +
    "?q=" +
    encodeURIComponent(searchStr) +
    "&format=json";
  return fetchJSON(url);
}

export function reverseSearchNominatim(lat, lon, zoom) {
  let url =
    "https://nominatim.openstreetmap.org/reverse" +
    "?lat=" +
    lat +
    "&lon=" +
    lon +
    "&format=json";

  if (isValidNumber(zoom)) {
    url += "&zoom=" + Math.max(0, Math.min(zoom, 18));
  }

  let json = fetchJSON(url).catch(function() {
    const distance = 0.2;
    const gp = new GeoPoint(lat, lon);
    const bBox = gp.boundingCoordinates(distance, true);
    return {
      display_name: "-",
      lat: lat,
      lon: lon,
      boundingbox: [
        bBox[0]._degLat,
        bBox[1]._degLat,
        bBox[0]._degLon,
        bBox[1]._degLon,
      ],
    };
  });
  return json;
}

/**
 * drop info not stored in rdf, thus info that we
 * couldn't restore for previously used locations
 */
export function nominatim2draftLocation(searchResult) {
  const b = searchResult.boundingbox;
  return {
    name: searchResult.display_name,
    lng: Number.parseFloat(searchResult.lon),
    lat: Number.parseFloat(searchResult.lat),
    //importance: searchResult.importance,
    nwCorner: {
      lat: Number.parseFloat(b[0]),
      lng: Number.parseFloat(b[2]),
    },
    seCorner: {
      lat: Number.parseFloat(b[1]),
      lng: Number.parseFloat(b[3]),
    },
    //bounds: [
    //    [ Number.parseFloat(b[0]), Number.parseFloat(b[2]) ], //north-western point
    //    [ Number.parseFloat(b[1]), Number.parseFloat(b[3]) ] //south-eastern point
    //],
  };
}

function fetchJSON(url) {
  return fetch(url, {
    method: "get",
    //credentials: "same-origin",
    headers: { Accept: "application/json" },
  }).then(resp => {
    /*
             * handle errors and read json-data
             */
    const errorMsg =
      "GET to " +
      url +
      " failed with (" +
      resp.status +
      "): " +
      resp.statusText +
      "\n" +
      resp;
    if (resp.status !== 200) {
      throw new Error(errorMsg);
    } else {
      try {
        return resp.json();
      } catch (jsonParseError) {
        // nominatim responded with an HTTP-200 with an error html-page m(
        const e = new Error(errorMsg);
        e.originalErr = jsonParseError;
        throw e;
      }
    }
  });
}

/**
 * Deep clone. Don't feed it recurrent structures!
 * Thanks to A. Levy at <http://stackoverflow.com/questions/728360/how-do-i-correctly-clone-a-javascript-object>
 * @param obj
 * @return {*}
 */
export function clone(obj) {
  let copy;

  // Handle the 3 simple types, and null or undefined
  if (null == obj || "object" != typeof obj) return obj;

  // Handle Date
  if (obj instanceof Date) {
    copy = new Date();
    copy.setTime(obj.getTime());
    return copy;
  }

  // Handle Array
  if (obj instanceof Array) {
    copy = [];
    obj.map(subobj => clone(subobj));
    return copy;
  }

  // Handle Object
  if (obj instanceof Object) {
    copy = {};
    for (const attr in obj) {
      if (obj.hasOwnProperty(attr)) copy[attr] = clone(obj[attr]);
    }
    return copy;
  }

  throw new Error("Unable to copy obj! Its type isn't supported.");
}

/**
 * Returns a property of a given object, no matter whether
 * it's a normal or an immutable-js object.
 * @param obj
 * @param property
 */
export function get(obj, property) {
  if (!obj) {
    return undefined;
  } else if (obj.get) {
    /* obj is an immutabljs-object
           * NOTE: the canonical check atm would be `Immutable.Iterable.isIterable(obj)`
           * but that would require including immutable as dependency her and it'd be better
           * to keep this library independent of anything.
           */
    return obj.get(property);
  } else {
    /* obj is a vanilla object */
    return obj[property];
  }
}

/**
 * Tries to look up a property-path on a nested object-structure.
 * Where `obj.x.y` would throw an error if `x` wasn't defined
 * `get(obj, ['x','y'])` would return undefined.
 * @param obj
 * @param path
 * @return {*}
 */
export function getIn(obj, path) {
  if (!path || !obj || path.length === 0) {
    return undefined;
  } else {
    const child = get(obj, path[0]);
    // let child;
    // if (obj.toJS && obj.get) {
    //   /* obj is an immutabljs-object
    //          * NOTE: the canonical check atm would be `Immutable.Iterable.isIterable(obj)`
    //          * but that would require including immutable as dependency her and it'd be better
    //          * to keep this library independent of anything.
    //          */
    //   child = obj.get(path[0]);
    // } else {
    //   /* obj is a vanilla object */
    //   child = obj[path[0]];
    // }
    if (path.length === 1) {
      /* end of the path */
      return child;
    } else {
      /* recurse */
      return getIn(child, path.slice(1));
    }
  }
}

/**
 * Like `getIn` but allows passing a context
 * that's used for prefix resolution (i.e. it
 * checks both the prefixed and expanded version
 * of that path-step).
 * ```js
 * getInFromJsonLd(
 *   {'ex:foo': { 'http://example.org/bar' : 42 }},
 *   ['ex:foo', 'ex:bar'],
 *   {'ex': 'http://example.org/'}
 * ) // => 42
 * ```
 * @param obj
 * @param path
 * @param context a standard json-ld style context. Note, that
 * only prefix-definitions will be minded.
 */
export function getInFromJsonLd(obj, path, context) {
  if (!path || !obj || path.length === 0) {
    return undefined;
  } else {
    const child = getFromJsonLd(obj, path[0], context);
    if (path.length === 1) {
      /* end of the path */
      return child;
    } else {
      /* recurse */
      return getInFromJsonLd(child, path.slice(1), context);
    }
  }
}
window.getInFromJsonLd4dbg = getInFromJsonLd;

/**
 * Like `get` but allows passing a context
 * that's used for prefix resolution (i.e. it
 * checks both the prefixed and expanded version
 * of that path-step).
 *
 * @param obj a json-ld object
 * @param path an array used for traversal, e.g. `[0, "ex:foo", "ex:bar", "@value"]`. Use
 *   the shortened form of prefixes -- full URLs won't be compacted, only prefixes expanded.
 * @param context a standard json-ld style context. Note, that
 * only prefix-definitions will be minded.
 */
export function getFromJsonLd(obj, predicate, context) {
  if (!obj) {
    return undefined;
  } else {
    // e.g. "ex:foo:bar".replace(/([^:]*):.*/, '$1') => "ex"
    const prefixShort = predicate.replace(/^([^:]*):.*/, "$1");
    const prefixLong = context && context[prefixShort];
    let expandedPredicate;

    if (prefixShort && prefixLong && is("String", prefixLong)) {
      // ^ the string-check is because contexts can also have other
      // fields beside prefix-definitions

      // "ex:foo:bar:ex".replace('ex:', 'http://example.org/') => "http://example.org/foo:bar:ex"
      expandedPredicate = predicate.replace(prefixShort + ":", prefixLong);
    }

    return get(obj, predicate) || get(obj, expandedPredicate);
  }
}

/**
 * zipWith :: (a -> b -> c) -> [a] -> [b] -> [c]
 * e.g. zipWith((x,y)=>x-y, [8,9,3], [3,2]) // => [5,7]
 * @param f
 * @param xs
 * @param ys
 */
export function zipWith(f, xs, ys) {
  return Array.from(
    {
      length: Math.min(xs.length, ys.length),
    },
    (_, i) => f(xs[i], ys[i])
  );
}

/**
 * Sorts the elements by Date (default order is descending)
 * @param elementsImm elements from state that need to be returned as a sorted array
 * @param selector selector for the date that will be used to sort the elements (default is "lastUpdateDate")
 * @param order if "ASC" then the order will be ascending, everything else resorts to the default sort of descending order
 * @returns {*} sorted Elements array
 */
export function sortByDate(
  elementsImm,
  selector = "lastUpdateDate",
  order = "DESC"
) {
  let sortedElements = elementsImm && elementsImm.toArray();

  if (sortedElements) {
    sortedElements.sort(function(a, b) {
      const bDate = b.get(selector) && b.get(selector).getTime();
      const aDate = a.get(selector) && a.get(selector).getTime();

      if (order === "ASC") {
        return aDate - bDate;
      } else {
        return bDate - aDate;
      }
    });
  }

  return sortedElements;
}

/**
 * Sorts the elements by Selector (default order is ascending)
 * @param elementsImm elements from state that need to be returned as a sorted array
 * @param selector selector for the date that will be used to sort the elements (default is "lastUpdateDate")
 * @param order if "ASC" then the order will be ascending, everything else resorts to the default sort of descending order
 * @returns {*} sorted Elements array
 */
export function sortBy(elementsImm, selector = elem => elem, order = "ASC") {
  let sortedElements = elementsImm && elementsImm.toArray();

  if (sortedElements) {
    sortedElements.sort(function(a, b) {
      const bValue = b && selector(b);
      const aValue = a && selector(a);

      if (order === "ASC") {
        if (aValue < bValue) return -1;
        if (aValue > bValue) return 1;
        return 0;
      } else {
        if (bValue < aValue) return -1;
        if (bValue > aValue) return 1;
        return 0;
      }
    });
  }

  return sortedElements;
}

export function generateHexColor(text) {
  let hash = 0;

  if (text) {
    for (const char of text.split("")) {
      hash = char.charCodeAt(0) + ((hash << 5) - hash);
    }
  }

  const c = (hash & 0x00ffffff).toString(16);

  return "#" + ("00000".substring(0, 6 - c.length) + c);
}

export function generateRgbColorArray(text) {
  if (!text) return [0, 0, 0];
  const hexStr = generateHexColor(text);
  const colorArray = [
    // ignore first char, as that's the `#`
    hexStr.slice(1, 3),
    hexStr.slice(3, 5),
    hexStr.slice(5, 7),
  ].map(hexColor => parseInt(hexColor, 16));
  return colorArray;
}

/**
 * Returns the URL if it's already absolute,
 * otherwise prepends window.location.origin.
 *
 * e.g.
 * ```
 * toAbsoluteURL("/somepath/")
 * // => URL("http://example.org/somepath/")
 *
 * toAbsoluteURL("http://example.org/anotherpath/")
 * // => URL("http://example.org/anotherpath/")
 * ```
 * @param {*} pathOrURL
 */
export function toAbsoluteURL(pathOrURL) {
  if (pathOrURL.match(/^https?:\/\//)) {
    return new URL(pathOrURL);
  } else {
    return new URL(pathOrURL, window.location.origin);
  }
}

/**
 * Splits a string of TRIG into prefixes and body (e.g. to allow hiding either)
 * Also adds some empty lines to the body, so it stays readable when
 * the lines wrap.
 * @param {*} trigString
 */
export function trigPrefixesAndBody(trigString) {
  const lines = (trigString || "").split("\n");

  //seperating off header/@prefix-statements, so they can be folded in
  const prefixes = lines.filter(line => line.startsWith("@prefix")).join("\n");

  const body = lines
    .filter(line => !line.startsWith("@prefix"))
    .map(line =>
      line
        // add some extra white-space between statements, so they stay readable even when they wrap.
        .replace(/\.$/, ".\n")
        .replace(/;$/, ";\n")
        .replace(/\{$/, "{\n")
        .replace(/^\}$/, "\n}")
    )
    .join("\n")
    .trim();

  return { trigPrefixes: prefixes, trigBody: body };
}

export function scrubSearchResults(searchResults) {
  return (
    Immutable.fromJS(searchResults.map(nominatim2draftLocation))
      /*
       * filter "duplicate" results (e.g. "Wien"
       *  -> 1x waterway, 1x boundary, 1x place)
       */
      .groupBy(r => r.get("name"))
      .map(sameNamedResults => sameNamedResults.first())
      .toList()
      .toJS()
  );
}

/**
 * NOTE: don't pass recursive structures!
 * NOTE: don't pass immutablejs structures
 * @param {*} fieldName
 * @param {*} obj a (nested) json-structure
 * @param {*} _acc array that's used as accumulator.
 * @returns an array with the values of all occurances of `obj[fieldName]`, `obj[...][fieldNamE]` etc.
 */
export function findAllFieldOccurancesRecursively(fieldName, obj, _acc = []) {
  if (!obj) {
    return _acc;
  }
  if (obj["@type"] === fieldName && obj["@value"]) {
    _acc.push(obj["@value"]);
    console.debug(
      'obj["@type"] is ',
      fieldName,
      " and value present push value to _acc",
      _acc
    );
    return _acc;
  }
  if (obj.toJS && obj.get) {
    /* obj is an immutabljs-object
             * NOTE: the canonical check atm would be `Immutable.Iterable.isIterable(obj)`
             * but that would require including immutable as dependency her and it'd be better
             * to keep this library independent of anything.
             */

    obj.forEach(val => {
      // iterate and recurse down
      findAllFieldOccurancesRecursively(fieldName, val, _acc);
    });
  } else if (is("Array", obj) || is("Object", obj)) {
    // vannilla-js array or object
    Object.values(obj).forEach(val => {
      // iterate and recurse down
      findAllFieldOccurancesRecursively(fieldName, val, _acc);
    });
  }

  return _acc;
}

/**
 * Parses an `xsd:dateTime`/ISO-8601-string strictly.
 * Docs on format: <http://www.datypic.com/sc/xsd/t-xsd_dateTime.html>
 * @param {string} dateTime e.g. "2018-08-21T14:05:27.568Z"
 * @returns a `Date`-object, with `Invalid Date` if parsing failed.
 */
export function parseDatetimeStrictly(dateTime) {
  if (is("Date", dateTime)) {
    // already parsed
    return dateTime;
  } else if (!is("String", dateTime)) {
    // won't be able to parse
    return undefined;
  }
  const validXsdDateTimeString = !!dateTime.match(
    /^-?\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(([+-]\d{2}:\d{2})|Z)?/
  );
  const asDateTime = new Date(dateTime);
  if (validXsdDateTimeString && isValidNumber(asDateTime.valueOf())) {
    return asDateTime;
  } else {
    return new Date("Invalid Date"); // string here is just any unparsable date-string to get `Invalid Date`
  }
}

export function isValidDate(dateObj) {
  return dateObj && isValidNumber(dateObj.valueOf());
}

/**
 * Renders the javascript-date to an xsd:dateTime / ISO-8601 date-string
 * with the local timezone at the end (in contrast to `dateTime.toISOString()`
 * that normalizes the time to GMT first).
 * adapted from: <http://usefulangle.com/post/30/javascript-get-date-time-with-offset-hours-minutes>
 * @param {Date} dateTime
 */
export function toLocalISODateString(dateTime) {
  /* ensure two digits, i.e. add 0 before 
   * offsetHours, offsetMins,  date, month, hrs, mins or secs if they are less than 10
   */
  const pad = n => (n + "").padStart(2, "0");

  const timezoneOffsetInMins = dateTime.getTimezoneOffset();
  const offsetHours = pad(parseInt(Math.abs(timezoneOffsetInMins / 60)));
  const offsetMins = pad(Math.abs(timezoneOffsetInMins % 60));

  /* 
   * Add an opposite sign to the offset
   * If offset is 0, it means timezone is UTC
   * => timezoneString: Timezone difference in hours and minutes
   * String such as +5:30 or -6:00 or Z
   */
  let timezoneString;
  if (timezoneOffsetInMins < 0) {
    timezoneString = "+" + offsetHours + ":" + offsetMins;
  } else if (timezoneOffsetInMins > 0) {
    timezoneString = "-" + offsetHours + ":" + offsetMins;
  } else if (timezoneOffsetInMins == 0) {
    timezoneString = "Z";
  }

  const year = dateTime.getFullYear();
  const month = pad(dateTime.getMonth() + 1);
  const date = pad(dateTime.getDate());
  const hours = pad(dateTime.getHours());
  const mins = pad(dateTime.getMinutes());
  const secs = pad(dateTime.getSeconds());

  /* Current datetime
   * String such as 2016-07-16T19:20:30
   */
  const currentDatetime =
    year + "-" + month + "-" + date + "T" + hours + ":" + mins + ":" + secs;

  return currentDatetime + timezoneString;
}

/**
 * Method to create a simple Label for a given uri
 * @param str
 * @returns {*}
 */
export function generateSimpleTransitionLabel(str) {
  if (str) {
    const indexOfLastSharp = str.lastIndexOf("#");

    if (indexOfLastSharp != -1 && indexOfLastSharp + 1 < str.length) {
      return str.substr(indexOfLastSharp + 1);
    }
  }
  return str;
}
