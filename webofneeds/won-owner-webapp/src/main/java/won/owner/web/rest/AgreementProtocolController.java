package won.owner.web.rest;

import java.net.URI;
import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

import org.apache.jena.query.Dataset;
import org.apache.jena.rdf.model.Model;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;

import won.protocol.agreement.AgreementProtocolState;
import won.protocol.agreement.AgreementProtocolUris;
import won.protocol.agreement.IncompleteConversationDataException;
import won.protocol.rest.LinkedDataFetchingException;
import won.protocol.util.AuthenticationThreadLocal;
import won.protocol.util.linkeddata.CachingLinkedDataSource;
import won.protocol.util.linkeddata.LinkedDataSource;
import won.protocol.util.linkeddata.WonLinkedDataUtils;

@Controller
@RequestMapping("/rest/agreement")
public class AgreementProtocolController {

	private final Logger logger = LoggerFactory.getLogger(getClass());

	@Autowired
	private LinkedDataSource linkedDataSourceOnBehalfOfNeed;

	public void setLinkedDataSource(LinkedDataSource linkedDataSource) {
		this.linkedDataSourceOnBehalfOfNeed = linkedDataSource;
	}

	@RequestMapping(value = "/getAgreementProtocolUris", method = RequestMethod.GET)
	public ResponseEntity<AgreementProtocolUris> getHighlevelProtocolUris(URI connectionUri) {
		return new ResponseEntity<AgreementProtocolUris>(
				getAgreementProtocolState(connectionUri).getAgreementProtocolUris(), HttpStatus.OK);
	}

	@RequestMapping(value = "/getRetractedUris", method = RequestMethod.GET)
	public ResponseEntity<Set<URI>> getRetractedUris(URI connectionUri) {
		Set<URI> uris = getAgreementProtocolState(connectionUri).getRetractedUris();
		return new ResponseEntity<>(uris, HttpStatus.OK);
	}

	@RequestMapping(value = "/getAgreements", method = RequestMethod.GET)
	public ResponseEntity<Dataset> getAgreements(URI connectionUri) {
		Dataset agreements = getAgreementProtocolState(connectionUri).getAgreements();
		return new ResponseEntity<>(agreements, HttpStatus.OK);
	}

	@RequestMapping(value = "/getAgreementUris", method = RequestMethod.GET)
	public ResponseEntity<Set<URI>> getAgreementUris(URI connectionUri) {
		Set<URI> uris = getAgreementProtocolState(connectionUri).getAgreementUris();
		return new ResponseEntity<>(uris, HttpStatus.OK);
	}

	@RequestMapping(value = "/getAgreement", method = RequestMethod.GET)
	public ResponseEntity<Model> getAgreement(URI connectionUri, String agreementUri) {
		Model agreement = getAgreementProtocolState(connectionUri).getAgreement(URI.create(agreementUri));
		return new ResponseEntity<>(agreement, HttpStatus.OK);
	}

	@RequestMapping(value = "/getPendingProposals", method = RequestMethod.GET)
	public ResponseEntity<Dataset> getProposals(URI connectionUri) {
		Dataset proposals = getAgreementProtocolState(connectionUri).getPendingProposals();
		return new ResponseEntity<>(proposals, HttpStatus.OK);
	}

	@RequestMapping(value = "/getPendingProposalUris", method = RequestMethod.GET)
	public ResponseEntity<Set<URI>> getProposalUris(URI connectionUri) {
		Set<URI> uris = getAgreementProtocolState(connectionUri).getPendingProposalUris();
		return new ResponseEntity<>(uris, HttpStatus.OK);
	}

	@RequestMapping(value = "/getPendingProposal", method = RequestMethod.GET)
	public ResponseEntity<Model> getProposal(URI connectionUri, String proposalUri) {
		Model proposal = getAgreementProtocolState(connectionUri).getPendingProposal(URI.create(proposalUri));
		return new ResponseEntity<>(proposal, HttpStatus.OK);
	}

	@RequestMapping(value = "/getCancellationPendingAgreementUris", method = RequestMethod.GET)
	public ResponseEntity<Set<URI>> getAgreementsProposedToBeCancelledUris(URI connectionUri) {
		Set<URI> uris = getAgreementProtocolState(connectionUri).getCancellationPendingAgreementUris();
		return new ResponseEntity<>(uris, HttpStatus.OK);
	}

	@RequestMapping(value = "/getCancelledAgreementUris", method = RequestMethod.GET)
	public ResponseEntity<Set<URI>> getCancelledAgreementUris(URI connectionUri) {
		Set<URI> uris = getAgreementProtocolState(connectionUri).getCancelledAreementUris();
		return new ResponseEntity<>(uris, HttpStatus.OK);
	}

	@RequestMapping(value = "/getRejectedUris", method = RequestMethod.GET)
	public ResponseEntity<Set<URI>> getRejectedProposalUris(URI connectionUri) {
		Set<URI> uris = getAgreementProtocolState(connectionUri).getRejectedUris();
		return new ResponseEntity<>(uris, HttpStatus.OK);
	}

	private Dataset getConversationDataset(URI connectionUri) {
		try {
			AuthenticationThreadLocal.setAuthentication(SecurityContextHolder.getContext().getAuthentication());
			return WonLinkedDataUtils.getConversationAndNeedsDataset(connectionUri, linkedDataSourceOnBehalfOfNeed);
		} finally {
			// be sure to remove the principal from the threadlocal
			AuthenticationThreadLocal.remove();
		}
	}

	private AgreementProtocolState getAgreementProtocolState(URI connectionUri) {
		Set<URI> recrawled = new HashSet<>();
		while(true) {
			//we leave the loop either with a runtime exception or with the result
			try {
				Dataset conversationDataset = getConversationDataset(connectionUri);
				return AgreementProtocolState.of(conversationDataset);
			} catch (IncompleteConversationDataException e) {
				// we may have tried to crawl a conversation dataset of which messages
				// were still in-flight. we allow one re-crawl attempt per exception before
				// we throw the exception on:
				URI connectionContainerUri  = WonLinkedDataUtils.getEventContainerURIforConnectionURI(connectionUri, linkedDataSourceOnBehalfOfNeed);
				URI remoteConnectionUri = WonLinkedDataUtils.getRemoteConnectionURIforConnectionURI(connectionUri, linkedDataSourceOnBehalfOfNeed);
				if (!recrawl(recrawled, connectionUri, e.getMissingMessageUri(), e.getReferringMessageUri(), connectionContainerUri, connectionUri, remoteConnectionUri)){
					throw e;
				}
			} catch (LinkedDataFetchingException e) {
				if (!recrawl(recrawled, connectionUri, e.getResourceUri())){
					throw e;
				}
			} 
		}
	}

	private boolean recrawl(Set<URI> recrawled, URI connectionUri, URI... uris) {
		Set<URI> urisToCrawl = new HashSet<URI>();
		Arrays.stream(uris)
			.filter(x -> ! recrawled.contains(x))
			.forEach(urisToCrawl::add);
		if (urisToCrawl.isEmpty()) {
			if (logger.isDebugEnabled()) {
				logger.debug("connection {}: not recrawling again: {}", connectionUri, Arrays.toString(uris));
			}
			return false;
		}
		if (logger.isDebugEnabled()) {
			logger.debug("connection {}, recrawling: {}", connectionUri, urisToCrawl);
		}
		if (linkedDataSourceOnBehalfOfNeed instanceof CachingLinkedDataSource) {
			urisToCrawl.stream().forEach(((CachingLinkedDataSource)linkedDataSourceOnBehalfOfNeed)::invalidate);
		}
		recrawled.addAll(urisToCrawl);
		return true;
	}

}
