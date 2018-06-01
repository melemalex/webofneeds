import angular from "angular";
import Immutable from "immutable"; // also exports itself as (window).L
import L from "../../leaflet-bundleable.js";
import {
  attach,
  searchNominatim,
  reverseSearchNominatim,
  nominatim2draftLocation,
  // leafletBounds,
  delay,
  getIn,
} from "../../utils.js";
import { doneTypingBufferNg, DomCache } from "../../cstm-ng-utils.js";

import { initLeaflet } from "../../won-utils.js";

const serviceDependencies = ["$scope", "$element", "$sce"];
function genComponentConf() {
  const prevLocationBlock = (
    displayBlock,
    selectLocationFnctName,
    prevLocation
  ) => `
  <!-- PREVIOUS LOCATION -->
  <li class="rp__searchresult" ng-if="${displayBlock}">
      <svg class="rp__searchresult__icon" style="--local-primary:var(--won-subtitle-gray);">
          <!-- TODO: create and use a more appropriate icon here -->
          <use xlink:href="#ico16_indicator_location" href="#ico16_indicator_location"></use>
      </svg>
      <a class="rp__searchresult__text" href=""
          ng-click="${selectLocationFnctName}(${prevLocation})"
          ng-bind-html="self.highlight(${prevLocation}.name, self.lastSearchedFor)">
      </a>
      (previous)
  </li>`;

  const searchResultsBlock = (searchResults, selectLocationFnctName) => `
  <!-- SEARCH RESULTS -->
  <li class="rp__searchresult" 
      ng-repeat="result in ${searchResults}">
      <svg class="rp__searchresult__icon" style="--local-primary:var(--won-subtitle-gray);">
          <use xlink:href="#ico16_indicator_location" href="#ico16_indicator_location"></use>
      </svg>
      <a class="rp__searchresult__text" href=""
          ng-click="${selectLocationFnctName}(result)"
          ng-bind-html="self.highlight(result.name, self.lastSearchedFor)">
      </a>
  </li>`;

  const template = `
        <!-- FROM LOCATION SEARCH BOX -->
        <div class="rp__searchbox">
            <input
                type="text"
                id="rp__from-searchbox__inner"
                class="rp__searchbox__inner"
                placeholder="Start Location"
                ng-class="{'rp__searchbox__inner--withreset' : self.fromShowResetButton}"/>
            <svg class="rp__searchbox__icon clickable" 
                 style="--local-primary:var(--won-primary-color);"
                 ng-if="self.fromShowResetButton"
                 ng-click="self.resetFromLocation()">
                    <use xlink:href="#ico36_close" href="#ico36_close"></use>
            </svg>
        </div>
        <!-- LIST OF SUGGESTED LOCATIONS -->
        <ul class="rp__searchresults" ng-class="{ 
            'rp__searchresults--filled': self.showFromResultDropDown(), 
            'rp__searchresults--empty': !self.showFromResultDropDown() 
        }">
            <!-- CURRENT GEOLOCATION -->
            <li class="rp__searchresult" 
                ng-if="self.showCurrentLocationResult()">
                <svg class="rp__searchresult__icon" style="--local-primary:var(--won-subtitle-gray);">
                    <use xlink:href="#ico16_indicator_location" href="#ico36_location_current"></use>
                </svg>
                <a class="rp__searchresult__text" href=""
                    ng-click="self.selectedFromLocation(self.currentLocation)"
                    ng-bind-html="self.highlight(self.currentLocation.name, self.lastSearchedFor)">
                </a>
            </li>
            
            ${prevLocationBlock(
              "self.showFromPrevLocation()",
              "self.selectedFromLocation",
              "self.fromPreviousLocation"
            )}
            ${searchResultsBlock(
              "self.fromSearchResults",
              "self.selectedFromLocation"
            )}
        </ul>

        <!-- TO LOCATION SEARCH BOX -->
        <div class="rp__searchbox">
            <input
                type="text"
                id="rp__to-searchbox__inner"
                class="rp__searchbox__inner"
                placeholder="Destination"
                ng-class="{'rp__searchbox__inner--withreset' : self.toShowResetButton}"/>
            <svg class="rp__searchbox__icon clickable" 
                 style="--local-primary:var(--won-primary-color);"
                 ng-if="self.toShowResetButton"
                 ng-click="self.resetToLocationAndSearch()">
                    <use xlink:href="#ico36_close" href="#ico36_close"></use>
            </svg>
        </div>
        <!-- LIST OF SUGGESTED LOCATIONS -->
        <ul class="rp__searchresults" ng-class="{ 
            'rp__searchresults--filled': self.showToResultDropDown(), 
            'rp__searchresults--empty': !self.showToResultDropDown() 
        }">
   
            ${prevLocationBlock(
              "self.showToPrevLocation()",
              "self.selectedToLocation",
              "self.toPreviousLocation"
            )}
            ${searchResultsBlock(
              "self.toSearchResults",
              "self.selectedToLocation"
            )}
        </ul>

        <div class="rp__mapmount" id="rp__mapmount"></div>
            `;

  // TODO: add attribute if not valid -> use attribute to disable publish
  class Controller {
    constructor() {
      attach(this, serviceDependencies, arguments);
      this.domCache = new DomCache(this.$element);

      this.map = initLeaflet(this.mapMount());
      //this.map.on("click", e => onMapClick(e, this));

      // debug output
      window.rp4dbg = this;

      // TODO: do I need this?
      //   this.locationIsSaved = !!this.initialLocation;

      this.fromAddedLocation = this.initialFromLocation;
      this.fromPreviousLocation = undefined;
      this.fromShowResetButton = false;

      this.toAddedLocation = this.initialToLocation;
      this.toPreviousLocation = undefined;
      this.toShowResetButton = false;

      // needs to happen after constructor finishes, otherwise
      // the component's callbacks won't be registered.
      delay(0).then(() => this.showInitialLocations());

      // only works if we have access to the current location
      // TODO: if we do have access, set this as the default fromLocation?
      // Issue: if form checking is implemented checking whether both/no fields are filled,
      // putting down geoLocation as fromLocation by default requires user to make the form valid again
      // just closing the picker would result in an error message!
      this.determineCurrentLocation();

      doneTypingBufferNg(
        e => this.doneTypingFrom(e),
        this.fromTextfieldNg(),
        300
      );
      //doneTypingBufferNg(e => this.doneTypingTo(e), this.toTextfieldNg(), 300);
    }

    showInitialLocations() {
      // TODO: zoom/center to show one/both markers?
      this.fromAddedLocation = this.initialFromLocation;
      this.toAddedLocation = this.initialToLocation;

      let markedLocations = [];

      if (this.initialFromLocation) {
        markedLocations.push(this.initialFromLocation);
        this.fromShowResetButton = true;
        this.fromTextfield().value = this.initialFromLocation.name;
      }

      if (this.initialToLocation) {
        markedLocations.push(this.initialToLocation);
        this.toShowResetButton = true;
        this.toTextfield().value = this.initialToLocation.name;
      }

      this.placeMarkers(markedLocations);

      this.$scope.$apply();
    }

    // TODO: implement
    checkValidity() {
      // validity check
      // set validity - invalid if exactly one location is undefined
    }

    selectedFromLocation(location) {
      // save new location value
      this.onRouteUpdated({
        fromLocation: location,
        toLocation: this.toAddedLocation,
      });
      this.fromAddedLocation = location;

      // represent new value to user
      this.checkValidity();
      this.resetSearchResults();
      this.fromTextfield().value = location.name;
      this.fromShowResetButton = true;

      let markers = [];
      markers.push(location);
      if (this.toAddedLocation) {
        markers.push(this.toAddedLocation);
      }
      this.placeMarkers(markers);
      this.markers[0].openPopup();
      // TODO: fit map around selected locations
      // this.map.fitBounds(leafletBounds(location), { animate: true });
    }

    selectedToLocation(location) {
      // save new location value
      this.onRouteUpdated({
        fromLocation: this.fromAddedLocation,
        toLocation: location,
      });
      this.toAddedLocation = location;

      // represent new value to user
      this.checkValidity();
      this.resetSearchResults(); // picked one, can hide the rest if they were there
      this.toTextfield().value = location.name;
      this.toShowResetButton = true;

      let markers = [];
      markers.push(location);
      if (this.fromAddedLocation) {
        markers.push(this.fromAddedLocation);
      }
      this.placeMarkers(markers);
      this.markers[0].openPopup();
      // TODO: fit map around selected locations
      // this.map.fitBounds(leafletBounds(location), { animate: true });
    }

    doneTypingFrom() {
      const fromText = this.fromTextfield().value;

      this.resetToSearchResults(); // reset search results of other field

      if (this.fromAddedLocation !== undefined) {
        this.fromShowResetButton = false;
        this.$scope.$apply(() => {
          this.resetFromLocation();
        });
      }

      if (!fromText) {
        this.$scope.$apply(() => {
          this.resetFromSearchResults();
        });
      } else {
        // search for new results
        // TODO: sort results by distance/relevance/???
        // TODO: limit amount of shown results
        searchNominatim(fromText).then(searchResults => {
          const parsedResults = scrubSearchResults(searchResults, fromText);
          this.$scope.$apply(() => {
            this.fromSearchResults = parsedResults;
            //this.lastSearchedFor = { name: text };
            this.lastSearchedFor = fromText;
          });
        });
      }
    }

    doneTypingTo() {
      const toText = this.toTextfield().value;

      this.resetFromSearchResults(); // reset search results of other field

      if (this.toAddedLocation !== undefined) {
        this.toShowResetButton = false;
        this.$scope.$apply(() => {
          this.resetToLocation();
        });
      }

      if (!toText) {
        this.$scope.$apply(() => {
          this.resetToSearchResults();
        });
      } else {
        // search for new results
        // TODO: sort results by distance/relevance/???
        // TODO: limit amount of shown results
        searchNominatim(toText).then(searchResults => {
          const parsedResults = scrubSearchResults(searchResults, toText);
          this.$scope.$apply(() => {
            this.toSearchResults = parsedResults;
            //this.lastSearchedFor = { name: text };
            this.lastSearchedFor = toText;
          });
        });
      }
    }

    placeMarkers(locations) {
      if (this.markers) {
        //remove previously placed markers
        for (let m of this.markers) {
          this.map.removeLayer(m);
        }
      }

      this.markers = locations.map(location =>
        L.marker([location.lat, location.lng]).bindPopup(location.name)
      );

      for (let m of this.markers) {
        this.map.addLayer(m);
      }
    }

    resetLocations() {
      this.resetFromLocation();
      this.resetToLocation();
    }

    resetFromLocation() {
      this.fromPreviousLocation = this.fromAddedLocation;
      this.fromAddedLocation = undefined;

      let markers = [];
      if (this.toAddedLocation) {
        markers.push(this.toAddedLocation);
      }
      this.placeMarkers(markers);

      this.fromShowResetButton = false;
      this.fromTextfield().value = "";

      this.onRouteUpdated({
        fromLocation: undefined,
        toLocation: this.toAddedLocation,
      });

      this.checkValidity();
    }

    resetToLocation() {
      this.toPreviousLocation = this.toAddedLocation;
      this.toAddedLocation = undefined;

      let markers = [];
      if (this.fromAddedLocation) {
        markers.push(this.fromAddedLocation);
      }
      this.placeMarkers(markers);

      this.toShowResetButton = false;
      this.toTextfield().value = "";

      this.onRouteUpdated({
        fromLocation: this.fromAddedLocation,
        toLocation: undefined,
      });

      this.checkValidity();
    }

    resetSearchResults() {
      this.resetFromSearchResults();
      this.resetToSearchResults();
    }

    resetFromSearchResults() {
      this.fromSearchResults = undefined;
      this.fromLastSearchedFor = undefined;
    }
    resetToSearchResults() {
      this.toSearchResults = undefined;
      this.toLastSearchedFor = undefined;
    }

    showFromPrevLocationResult() {
      return (
        !this.fromAddedLocation &&
        this.fromPreviousLocation &&
        getIn(this, ["fromPreviousLocation", "name"]) !==
          getIn(this, ["currentLocation", "name"])
      );
    }

    showFromResultDropdown() {
      let showGeo = !this.fromAddedLocation && this.currentLocation;
      let showPrev = this.showFromPrevLocationResult();

      return (
        (this.fromSearchResults && this.fromSearchResults.length > 0) ||
        showGeo ||
        showPrev
      );
    }

    showToPrevLocationResult() {
      return (
        this.toAddedLocation === undefined &&
        this.toPreviousLocation !== undefined
      );
    }

    showToResultDropDown() {
      let showPrev = this.showToPrevLocationResult();
      return (
        (this.toSearchResults && this.toSearchResults.length > 0) || showPrev
      );
    }

    determineCurrentLocation() {
      if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
          currentLocation => {
            const geoLat = currentLocation.coords.latitude;
            const geoLng = currentLocation.coords.longitude;
            const geoZoom = 13; // TODO: use `currentLocation.coords.accuracy` to control coarseness of query / zoom-level

            // center map around geolocation only if there's no initial location
            if (!this.initialFromLocation) {
              this.map.setZoom(geoZoom);
              this.map.panTo([geoLat, geoLng]);
            }

            reverseSearchNominatim(geoLat, geoLng, geoZoom).then(
              searchResult => {
                const location = nominatim2draftLocation(searchResult);
                this.$scope.$apply(() => {
                  this.currentLocation = location;
                });
              }
            );
          },
          err => {
            //error handler
            if (err.code === 2) {
              alert("Position is unavailable!"); //TODO toaster
            }
          },
          {
            //options
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 0,
          }
        );
      }
    }

    /**
     * Taken from <http://stackoverflow.com/questions/15519713/highlighting-a-filtered-result-in-angularjs>
     * @param text
     * @param search
     * @return {*}
     */
    highlight(text, search) {
      if (!text) {
        text = "";
      }
      if (!search) {
        return this.$sce.trustAsHtml(text);
      }
      return this.$sce.trustAsHtml(
        text.replace(
          new RegExp(search, "gi"),
          '<span class="highlightedText">$&</span>'
        )
      );
    }

    fromTextfieldNg() {
      return this.domCache.ng("#rp__from-searchbox__inner");
    }

    fromTextfield() {
      return this.domCache.dom("#rp__from-searchbox__inner");
    }

    toTextfieldNg() {
      return this.domCache.ng("#rp__to-searchbox__inner");
    }

    toTextfield() {
      return this.domCache.dom("#rp__to-searchbox__inner");
    }

    mapMountNg() {
      return this.domCache.ng(".rp__mapmount");
    }

    mapMount() {
      return this.domCache.dom(".rp__mapmount");
    }
  }
  Controller.$inject = serviceDependencies;

  return {
    restrict: "E",
    controller: Controller,
    controllerAs: "self",
    bindToController: true, //scope-bindings -> ctrl
    scope: {
      onRouteUpdated: "&",
      initialFromLocation: "=",
      initialToLocation: "=",
    },
    template: template,
  };
}

function scrubSearchResults(searchResults) {
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

// TODO: disable this? pick from first and to only if from is selected?
// function onMapClick(e, ctrl) {
//   //`this` is the mapcontainer here as leaflet
//   // apparently binds itself to the function.
//   // This code was moved out of the controller
//   // here to avoid confusion resulting from
//   // this binding.
//   reverseSearchNominatim(
//     e.latlng.lat,
//     e.latlng.lng,
//     ctrl.map.getZoom() // - 1
//   ).then(searchResult => {
//     const location = nominatim2draftLocation(searchResult);

//     //use coords of original click though (to allow more detailed control)
//     location.lat = e.latlng.lat;
//     location.lng = e.latlng.lng;
//     ctrl.$scope.$apply(() => {
//       ctrl.selectedLocation(location);
//     });
//   });
// }

export default angular
  .module("won.owner.components.routePicker", [])
  .directive("wonRoutePicker", genComponentConf).name;

window.searchNominatim4dbg = searchNominatim;
window.reverseSearchNominatim4dbg = reverseSearchNominatim;
window.nominatim2wonLocation4dbg = nominatim2draftLocation;
