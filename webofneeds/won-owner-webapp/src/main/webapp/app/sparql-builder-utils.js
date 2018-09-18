/**
 * Module for utility-functions for string-building sparql-queries.
 * NOTE: This is a super-hacky/-fragile approach and should be replaced by a proper lib / ast-utils
 */

import won from "./won-es6.js";
import {
  isValidNumber,
  isValidDate,
  toLocalISODateString,
  is,
} from "./utils.js";
import { Parser as SparqlParser } from "sparqljs";

/**
 *
 * @param {Object} prefixes key-value pairs of prefix and full URL
 * @param {String} selectDistinct the variable to select
 * @param {Array<String>} where any operations to add to the `WHERE`-block
 * @param {*} orderBy Array of objects like `{order: "ASC", variable: "?geoDistance"}`
 */
export function sparqlQuery({ prefixes, selectDistinct, where, orderBy }) {
  let orderByStr;
  if (orderBy && is("Array", orderBy)) {
    const orderClauses = orderBy
      .map(o => `${o.order}(${o.variable})`)
      .join(" ");
    orderByStr = orderClauses ? "ORDER BY " + orderClauses : "";
  }

  const queryTemplate = `
${prefixesString(prefixes)}
SELECT DISTINCT ${selectDistinct}
WHERE {
  ${where.join(" ")}
} ${orderByStr}`;

  return new SparqlParser().parse(queryTemplate);
}

/**
 * returns e.g.:
 * ```
 * {
 *   prefixes: { s: "http://schema.org/", ...},
 *   operations: [
 *      "FILTER (?currency = 'EUR')",... ],
 *      "?is s:priceSpecification ?pricespec .", ...],
 *    ],
 * }
 * ```
 * The defaults are empty objects and arrays as properties.
 *
 * @param {*} returnValue
 */
export function wellFormedFilter(returnValue) {
  return Object.assign(emptyFilter(), returnValue);
}

export function emptyFilter() {
  return {
    prefixes: {},
    operations: [], // basic graph patterns, filters etc. anything that goes into the where clause
  };
}

/**
 * Concatenates filter-objects generated by other functions in this
 * module into a single one.
 * @param {*} filters see `wellFormedFilter` for the returned structure.
 */
export function concatenateFilters(filters) {
  const concatenatedFilter = filters
    .filter(f => f) // filter out undefined filters
    .reduce((acc, f) => {
      if (!f) {
        return acc;
      } else {
        const prefixes = Object.assign({}, acc.prefixes, f.prefixes);
        const operations = acc.operations.concat(f.operations).filter(o => o);
        return {
          prefixes,
          operations,
        };
      }
    }, emptyFilter());

  return concatenatedFilter;
}

/**
 * Collapses a filter's operations and wraps them in
 * an `OPTIONAL` block.
 * @param {*} filter
 */
export function optionalFilter(filter) {
  const joinedOperations = filter.operations.join(" ");
  const operationString =
    joinedOperations && `OPTION { ${joinedOperations} } .`;
  return wellFormedFilter({
    prefixes: filter.prefixes,
    operations: [operationString],
  });
}

/**
 * Concatenates the filters and then calls `optionalFilter`.
 * @param {Array} filters
 */
export function optionalFilters(filters) {
  return optionalFilter(concatenateFilters(filters));
}

/**
 * @param {String} rootSubject: a variable name via which the location is connected
 *  to the rest of the graph-patterns . e.g. `"?location"`. Needs to start with a
 *  variable indicator (i.e. `?`) as other variable names will be derived by
 *  suffixing it.
 * @param {*} location: an object containing `lat` and `lng`
 * @param {Number} radius: distance in km that matches can be away from the location
 * @returns see wellFormedFilter
 */
export function filterInVicinity(rootSubject, location, radius = 10) {
  if (!location || !location.lat || !location.lng) {
    return emptyFilter();
  } else {
    /* "prefix" variable name with root-subject so filter can be used 
     * multiple times for different roots
     * results in e.g. `?location_geo`
     */
    const geoVar = `${rootSubject}_geo`;
    return wellFormedFilter({
      prefixes: {
        s: won.defaultContext["s"],
        won: won.defaultContext["won"],
        geo: "http://www.bigdata.com/rdf/geospatial#",
        geoliteral: "http://www.bigdata.com/rdf/geospatial/literals/v1#",
      },
      operations: [
        `${rootSubject} s:geo ${geoVar}.`,
        `SERVICE geo:search {
  ${geoVar} geo:search "inCircle" .
  ${geoVar} geo:searchDatatype geoliteral:lat-lon .
  ${geoVar} geo:predicate won:geoSpatial .
  ${geoVar} geo:spatialCircleCenter "${location.lat}#${location.lng}" .
  ${geoVar} geo:spatialCircleRadius "${radius}" .
  ${geoVar} geo:distanceValue ${rootSubject}_geoDistance .
}`,
      ],
    });
  }
}

/**
 * Constructs a filter for which holds:
 *
 * `datetime - 12h <= matchedTime <= datetime + 12h`
 *
 * @param {*} rootSubject the sparql-variable that is the `xsd:dateTime`
 * @param {*} datetime the datetime around which to construct a filter-bracket
 * @param {*} hoursBeforeAndAfter
 */
export function filterAboutTime(
  rootSubject,
  datetime,
  hoursBeforeAndAfter = 12
) {
  if (!isValidDate(datetime)) {
    return emptyFilter();
  } else {
    const min = new Date(datetime);
    min.setHours(min.getHours() - hoursBeforeAndAfter);
    const minStr = toLocalISODateString(min);
    const max = new Date(datetime);
    max.setHours(max.getHours() + hoursBeforeAndAfter);
    const maxStr = toLocalISODateString(max);

    return wellFormedFilter({
      prefixes: {
        s: won.defaultContext["s"],
        xsd: won.defaultContext["xsd"],
      },
      operations: [
        `FILTER (${rootSubject} >= "${minStr}"^^xsd:dateTime )`,
        `FILTER (${rootSubject} <= "${maxStr}"^^xsd:dateTime )`,
      ],
    });
  }
}

export function filterFloorSizeRange(rootSubject, min, max) {
  const operations = [];
  const prefixes = {
    s: won.defaultContext["s"],
  };
  const minIsNum = isValidNumber(min);
  const maxIsNum = isValidNumber(max);
  const floorSizeVar = `${rootSubject}_floorSize`;
  if (minIsNum || maxIsNum) {
    operations.push(`${rootSubject} s:floorSize/s:value ${floorSizeVar}.`);
  }
  if (minIsNum) {
    operations.push(`FILTER (${floorSizeVar} >= ${min} )`);
  }
  if (maxIsNum) {
    operations.push(`FILTER (${floorSizeVar} <= ${max} )`);
  }
  return wellFormedFilter({ operations, prefixes });
}

export function filterNumOfRoomsRange(rootSubject, min, max) {
  const prefixes = {
    s: won.defaultContext["s"],
  };
  const operations = [];
  const minIsNum = isValidNumber(min);
  const maxIsNum = isValidNumber(max);
  const numberOfRoomsVar = `${rootSubject}_numberOfRooms`;
  if (minIsNum || maxIsNum) {
    operations.push(`${rootSubject} s:numberOfRooms ${numberOfRoomsVar}.`);
  }
  if (minIsNum) {
    operations.push(`FILTER (${numberOfRoomsVar} >= ${min} )`);
  }
  if (maxIsNum) {
    operations.push(`FILTER (${numberOfRoomsVar} <= ${max} )`);
  }
  return wellFormedFilter({ operations, prefixes });
}

export function filterRentRange(rootSubject, min, max, currency) {
  const prefixes = {
    s: won.defaultContext["s"],
  };
  let operations = [];
  const minIsNum = isValidNumber(min);
  const maxIsNum = isValidNumber(max);
  const pricespecVar = `${rootSubject}_pricespec`;
  const currencyVar = `${rootSubject}_currency`;
  const priceVar = `${rootSubject}_price`;
  if ((minIsNum || maxIsNum) && currency) {
    operations.push(`FILTER (${currencyVar} = "${currency}") `);
    operations = operations.concat([
      `${rootSubject} s:priceSpecification ${pricespecVar} .`,
      `${pricespecVar} s:price ${priceVar} .`,
      `${pricespecVar} s:priceCurrency ${currencyVar} .`,
    ]);
  }
  if (minIsNum) {
    operations.push(`FILTER (${priceVar} >= ${min} )`);
  }
  if (maxIsNum) {
    operations.push(`FILTER (${priceVar} <= ${max} )`);
  }

  return wellFormedFilter({ operations, prefixes });
}

/**
 * @param {*} prefixes an object which' keys are the prefixes
 *  and values the long-form URIs.
 * @returns {String} in the form of e.g.
 * ```
 * prefix s: <http://schema.org/>
 * prefix won: <http://purl.org/webofneeds/model#>
 * ```
 */
export function prefixesString(prefixes) {
  if (!prefixes) {
    return "";
  } else {
    const prefixesStrings = Object.entries(prefixes).map(
      ([prefix, uri]) => `PREFIX ${prefix}: <${uri}>\n`
    );
    return prefixesStrings.join("");
  }
}
//TODO should return a context-def as well
