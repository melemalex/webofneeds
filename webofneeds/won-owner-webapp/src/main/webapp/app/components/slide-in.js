/**
 * Created by quasarchimaere on 20.11.2018.
 */
import won from "../won-es6.js";
import angular from "angular";
import ngAnimate from "angular-animate";
import dropdownModule from "./covering-dropdown.js";
import { attach, delay, getIn } from "../utils.js";
import { actionCreators } from "../actions/actions.js";
import { connect2Redux, parseRestErrorMessage } from "../won-utils.js";

import * as srefUtils from "../sref-utils.js";

import "style/_slidein.scss";

function genSlideInConf() {
  let template = `
        <div class="si__connectionlost" ng-class="{'visible': self.connectionHasBeenLost}">
            <svg class="si__icon">
                <use xlink:href="#ico16_indicator_warning" href="#ico16_indicator_warning"></use>
            </svg>
            <span class="si__title">
                Lost connection &ndash; make sure your internet-connection
                is working, then click &ldquo;reconnect&rdquo;.
            </span>
            <button
                ng-show="self.connectionHasBeenLost && !self.reconnecting"
                ng-click="self.reconnect__start()"
                class="si__button">
                    Reconnect
            </button>
            <svg class="hspinner" ng-show="self.reconnecting">
                <use xlink:href="#ico_loading_anim" href="#ico_loading_anim"></use>
            </svg>
        </div>
        <div class="si__emailverification" ng-class="{'visible': !self.connectionHasBeenLost && (self.verificationToken || (self.loggedIn && !self.emailVerified))}">
            <svg class="si__icon">
                <use xlink:href="#ico16_indicator_warning" href="#ico16_indicator_warning"></use>
            </svg>
            <span class="si__title" ng-if="!self.verificationToken && !self.emailVerified && !self.emailVerificationError">
                E-Mail has not been verified yet, check your Inbox.
            </span>
            <span class="si__title" ng-if="self.processingVerifyEmailAddress && self.verificationToken">
                Verifying the E-Mail address
            </span>
            <span class="si__title" ng-if="!self.processingVerifyEmailAddress && self.emailVerificationError">
                {{ self.parseRestErrorMessage(self.emailVerificationError) }}
            </span>
            <span class="si__title" ng-if="self.loggedIn && self.verificationToken && !self.processingVerifyEmailAddress && self.emailVerified && !self.emailVerificationError">
                E-Mail Address verified
            </span>
            <span class="si__title" ng-if="!self.loggedIn && self.verificationToken && !self.processingVerifyEmailAddress && !self.emailVerificationError">
                E-Mail Address verified (Please Login Now)
            </span>
            <svg class="hspinner" ng-if="self.processingVerifyEmailAddress || self.processingResendVerificationEmail">
                <use xlink:href="#ico_loading_anim" href="#ico_loading_anim"></use>
            </svg>
            <button
              class="si__button"
              ng-if="!self.processingVerifyEmailAddress && !self.processingResendVerificationMail && ((self.loggedIn && !self.emailVerified && !self.emailVerificationError) || (self.verificationToken && self.emailVerificationError))"
              ng-click="self.account__resendVerificationEmail(self.email)">
                Resend Email
            </button>
            <svg class="si__close"
                ng-click="self.router__stateGoCurrent({token: undefined})"
                ng-if="!self.processingVerifyEmailAddress && self.verificationToken && !self.emailVerificationError">
                <use xlink:href="#ico36_close" href="#ico36_close"></use>
            </svg>
            <svg class="si__close"
                ng-click="self.account__verifyEmailAddressSuccess()"
                ng-if="!self.processingVerifyEmailAddress && self.isAlreadyVerifiedError">
                <use xlink:href="#ico36_close" href="#ico36_close"></use>
            </svg>
        </div>
        <div class="si__termsofservice" ng-class="{'visible': self.loggedIn && !self.connectionHasBeenLost && !self.acceptedTermsOfService}">
            <svg class="si__icon">
                <use xlink:href="#ico16_indicator_warning" href="#ico16_indicator_warning"></use>
            </svg>
            <span class="si__title">
                You have not accepted the
                <a target="_blank"
                   href="{{ self.absHRef(self.$state, 'about', {'aboutSection': 'aboutTermsOfService'}) }}">
                   Terms Of Service
                 </a> yet.
            </span>
            <button
              class="si__button"
              ng-if="!self.processingAcceptTermsOfService"
              ng-click="self.account__acceptTermsOfService()">
                Accept
            </button>
            <svg class="hspinner" ng-if="self.processingAcceptTermsOfService">
                <use xlink:href="#ico_loading_anim" href="#ico_loading_anim"></use>
            </svg>
        </div>
        <div class="si__disclaimer" ng-class="{'visible': !self.connectionHasBeenLost && !self.acceptedDisclaimer}">
            <svg class="si__icon">
                <use xlink:href="#ico16_indicator_warning" href="#ico16_indicator_info"></use>
            </svg>
            <div class="si__title">
                This is the demonstrator of an ongoing research project.
            </div>
            <div class="si__text">
                Please keep in mind:
                <ul>
                	<li> Your posts are public. </li>
					        <li> Your user account is not publicly linked to your posts.</li>
                	<li> The connections of your posts are public.</li>
                	<li> The messages you exchange with others are private, but stored in clear text on our servers. </li>
                </ul>     
                <a target="_blank"
                   href="{{ self.absHRef(self.$state, 'about', {'aboutSection': 'aboutPrivacyPolicy'}) }}">
                   See Privacy Policy.
                </a>
                <br />
                We use cookies to track your session using a self-hosted analytics tool.
                <a target="_blank"
                   href="/piwik/index.php?module=CoreAdminHome&action=optOut&language=en">
                   Suppress tracking.
                </a>
	  		    </div>
            <button
                ng-click="self.account__acceptDisclaimer()"
                class="si__bottomButton">
                    Ok, I'll keep that in mind
            </button>
        </div>
        <div class="si__privateaccount" ng-class="{'visible': !self.connectionHasBeenLost && self.privateId}">
            <svg class="si__icon">
                <use xlink:href="#ico16_indicator_warning" href="#ico16_indicator_warning"></use>
            </svg>
            <span class="si__title">
                Warning!
            </span>
            <svg class="si__carret"
                ng-click="self.view__expand"
                ng-if="true">
                <use xlink:href="#ico16_arrow_down" href="#ico16_arrow_down"></use>
            </svg>
            <svg class="si__carret"
                ng-click="self.router__stateGoCurrent({token: undefined})"
                ng-if="false">
                <use xlink:href="#ico16_arrow_up" href="#ico16_arrow_up"></use>
            </svg>
        </div>
    `;

  const serviceDependencies = [
    "$ngRedux",
    "$scope",
    "$state" /*injections as strings here*/,
  ];

  class Controller {
    constructor(/* arguments <- serviceDependencies */) {
      attach(this, serviceDependencies, arguments);
      Object.assign(this, srefUtils); // bind srefUtils to scope
      this.parseRestErrorMessage = parseRestErrorMessage;

      const selectFromState = state => {
        const verificationToken = getIn(state, [
          "router",
          "currentParams",
          "token",
        ]);

        const privateId = getIn(state, [
          "router",
          "currentParams",
          "privateId",
        ]);

        return {
          privateId,
          verificationToken,
          acceptedDisclaimer: getIn(state, ["account", "acceptedDisclaimer"]),
          emailVerified: getIn(state, ["account", "emailVerified"]),
          emailVerificationError: getIn(state, [
            "account",
            "emailVerificationError",
          ]),
          processingVerifyEmailAddress: getIn(state, [
            "process",
            "processingVerifyEmailAddress",
          ]),
          processingAcceptTermsOfService: getIn(state, [
            "process",
            "processingAcceptTermsOfService",
          ]),
          processingResendVerificationEmail: getIn(state, [
            "process",
            "processingResendVerificationEmail",
          ]),
          acceptedTermsOfService: getIn(state, [
            "account",
            "acceptedTermsOfService",
          ]),
          loggedIn: getIn(state, ["account", "loggedIn"]),
          email: getIn(state, ["account", "email"]),
          connectionHasBeenLost: getIn(state, ["messages", "lostConnection"]), // name chosen to avoid name-clash with the action-creator
          reconnecting: getIn(state, ["messages", "reconnecting"]),
          isAlreadyVerifiedError:
            getIn(state, ["account", "emailVerificationError", "code"]) ==
            won.RESPONSECODE.TOKEN_RESEND_FAILED_ALREADY_VERIFIED,
        };
      };

      connect2Redux(selectFromState, actionCreators, [], this);

      this.$scope.$watch("self.verificationToken", verificationToken =>
        this.verifyEmailAddress(verificationToken)
      );
    }

    verifyEmailAddress(verificationToken) {
      delay(0).then(() => {
        if (
          verificationToken &&
          !this.processingVerifyEmailAddress &&
          !(this.emailVerified || this.emailVerificationError)
        ) {
          this.account__verifyEmailAddress(verificationToken);
        }
      });
    }
  }
  Controller.$inject = serviceDependencies;

  return {
    restrict: "E",
    scope: {}, //isolate scope to allow usage within other controllers/components
    controller: Controller,
    controllerAs: "self",
    bindToController: true, //scope-bindings -> ctrl
    template: template,
  };
}

export default angular
  .module("won.owner.components.slideIn", [dropdownModule, ngAnimate])
  .directive("wonSlideIn", genSlideInConf).name;
