/*
 * Copyright 2012 Research Studios Austria Forschungsges.m.b.H. Licensed under
 * the Apache License, Version 2.0 (the "License"); you may not use this file
 * except in compliance with the License. You may obtain a copy of the License
 * at http://www.apache.org/licenses/LICENSE-2.0 Unless required by applicable
 * law or agreed to in writing, software distributed under the License is
 * distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */
package won.node.camel.processor;

import java.lang.invoke.MethodHandles;
import java.net.URI;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ExecutorService;

import org.apache.camel.Processor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;

import won.cryptography.service.RandomNumberService;
import won.node.protocol.MatcherProtocolMatcherServiceClientSide;
import won.node.service.linkeddata.generate.LinkedDataService;
import won.node.service.persistence.AtomService;
import won.node.service.persistence.ConnectionService;
import won.node.service.persistence.SocketService;
import won.protocol.jms.MessagingService;
import won.protocol.message.WonMessage;
import won.protocol.message.processor.camel.WonCamelConstants;
import won.protocol.model.Atom;
import won.protocol.model.OwnerApplication;
import won.protocol.repository.AtomMessageContainerRepository;
import won.protocol.repository.AtomRepository;
import won.protocol.repository.ConnectionContainerRepository;
import won.protocol.repository.ConnectionMessageContainerRepository;
import won.protocol.repository.ConnectionRepository;
import won.protocol.repository.DatasetHolderRepository;
import won.protocol.repository.MessageEventRepository;
import won.protocol.repository.OwnerApplicationRepository;
import won.protocol.repository.SocketRepository;
import won.protocol.service.WonNodeInformationService;
import won.protocol.util.RdfUtils;
import won.protocol.util.linkeddata.LinkedDataSource;

/**
 * User: syim Date: 02.03.2015
 */
public abstract class AbstractCamelProcessor implements Processor {
    private final Logger logger = LoggerFactory.getLogger(MethodHandles.lookup().lookupClass());
    @Autowired
    protected MessagingService messagingService;
    @Autowired
    protected DatasetHolderRepository datasetHolderRepository;
    @Autowired
    protected AtomRepository atomRepository;
    @Autowired
    protected ConnectionContainerRepository connectionContainerRepository;
    @Autowired
    protected AtomMessageContainerRepository atomMessageContainerRepository;
    @Autowired
    protected ConnectionRepository connectionRepository;
    @Autowired
    protected ConnectionMessageContainerRepository connectionMessageContainerRepository;
    @Autowired
    protected SocketRepository socketRepository;
    @Autowired
    protected OwnerApplicationRepository ownerApplicationRepository;
    @Autowired
    protected MessageEventRepository messageEventRepository;
    @Autowired
    protected LinkedDataService linkedDataService;
    @Autowired
    protected WonNodeInformationService wonNodeInformationService;
    @Autowired
    protected LinkedDataSource linkedDataSource;
    @Autowired
    protected MatcherProtocolMatcherServiceClientSide matcherProtocolMatcherClient;
    @Autowired
    protected RandomNumberService randomNumberService;
    @Autowired
    protected ExecutorService executorService;
    @Autowired
    protected SocketService socketService;
    @Autowired
    protected AtomService atomService;
    @Autowired
    protected ConnectionService connectionService;

    protected void sendMessageToOwner(WonMessage message, URI atomURI, String fallbackOwnerApplicationId) {
        Atom atom = atomRepository.findOneByAtomURI(atomURI);
        List<OwnerApplication> ownerApplications = atom != null ? atom.getAuthorizedApplications()
                        : Collections.EMPTY_LIST;
        List<String> ownerApplicationIds = toStringIds(ownerApplications);
        // if no owner application ids are authorized, we use the fallback specified (if
        // any)
        if (ownerApplicationIds.isEmpty() && fallbackOwnerApplicationId != null) {
            ownerApplicationIds.add(fallbackOwnerApplicationId);
        }
        Map headerMap = new HashMap<String, Object>();
        headerMap.put(WonCamelConstants.OWNER_APPLICATIONS, ownerApplicationIds);
        if (logger.isDebugEnabled()) {
            logger.debug("sending message to owner of atom {}: {}", atomURI, message.toStringForDebug(true));
        }
        messagingService.sendInOnlyMessage(null, headerMap, RdfUtils.writeDatasetToString(message.getCompleteDataset(),
                        WonCamelConstants.RDF_LANGUAGE_FOR_MESSAGE), "seda:OwnerProtocolOut");
    }

    protected void sendMessageToOwner(WonMessage message, List<String> ownerApplicationIds) {
        Map headerMap = new HashMap<String, Object>();
        headerMap.put("protocol", "OwnerProtocol");
        headerMap.put(WonCamelConstants.OWNER_APPLICATIONS, ownerApplicationIds);
        if (logger.isDebugEnabled()) {
            logger.debug("sending message to owner: {}", message.toStringForDebug(true));
        }
        messagingService.sendInOnlyMessage(null, headerMap, RdfUtils.writeDatasetToString(message.getCompleteDataset(),
                        WonCamelConstants.RDF_LANGUAGE_FOR_MESSAGE), "seda:OwnerProtocolOut");
    }

    protected void sendMessageToOwner(WonMessage message, String... ownerApplicationIds) {
        Map headerMap = new HashMap<String, Object>();
        headerMap.put(WonCamelConstants.OWNER_APPLICATIONS, Arrays.asList(ownerApplicationIds));
        if (logger.isDebugEnabled()) {
            logger.debug("sending message to owner: {}", message.toStringForDebug(true));
        }
        messagingService.sendInOnlyMessage(null, headerMap, RdfUtils.writeDatasetToString(message.getCompleteDataset(),
                        WonCamelConstants.RDF_LANGUAGE_FOR_MESSAGE), "seda:OwnerProtocolOut");
    }

    protected void sendMessageToNode(WonMessage message) {
        Map headerMap = new HashMap<String, Object>();
        headerMap.put(WonCamelConstants.MESSAGE_HEADER, message);
        if (logger.isDebugEnabled()) {
            logger.debug("sending message to node: {}", message.toStringForDebug(true));
        }
        messagingService.sendInOnlyMessage(null, headerMap, null, "seda:AtomProtocolOut");
    }

    /**
     * Processes the system message (allowing socket implementations) and delivers
     * it, depending on its receiver settings.
     *
     * @param message
     */
    protected void sendSystemMessage(WonMessage message) {
        Map headerMap = new HashMap<String, Object>();
        headerMap.put(WonCamelConstants.MESSAGE_HEADER, message);
        if (logger.isDebugEnabled()) {
            logger.debug("sending system message: {}", message.toStringForDebug(true));
        }
        messagingService.sendInOnlyMessage(null, headerMap, null, "seda:SystemMessageIn");
    }

    /**
     * Sends a system message to the owner without socket processing. Useful for
     * Response messages.
     * 
     * @param message
     */
    protected void sendSystemMessageToOwner(WonMessage message) {
        sendSystemMessageToOwner(message, null);
    }

    /**
     * Sends a system message to the owner without socket processing. Useful for
     * Response messages. Allows for adding the ownerApplicationId to the exchange
     * used during creation and sending of the system message. This is useful for
     * cases in which the owner application cannot determined otherwise, which can
     * happen when atom creation fails. If that value is non-null, it is set as the
     * 'ownerApplicationId' header, which is used in
     * AbstractCamelProcessor#sendMessageToOwner(..) as a fallback to determine the
     * recipients of the message to be sent.
     *
     * @param message
     * @param ownerApplicationId
     */
    protected void sendSystemMessageToOwner(WonMessage message, String ownerApplicationId) {
        Map headerMap = new HashMap<String, Object>();
        headerMap.put(WonCamelConstants.MESSAGE_HEADER, message);
        if (ownerApplicationId != null) {
            headerMap.put(WonCamelConstants.OWNER_APPLICATION_ID, ownerApplicationId);
        }
        if (logger.isDebugEnabled()) {
            logger.debug("sending system message to owner: {}", message.toStringForDebug(true));
        }
        messagingService.sendInOnlyMessage(null, headerMap, null, "seda:SystemMessageToOwner");
    }

    protected List<String> toStringIds(final List<OwnerApplication> ownerApplications) {
        List<String> ownerApplicationIds = new ArrayList<>(ownerApplications.size());
        for (OwnerApplication app : ownerApplications) {
            ownerApplicationIds.add(app.getOwnerApplicationId());
        }
        return ownerApplicationIds;
    }
}
