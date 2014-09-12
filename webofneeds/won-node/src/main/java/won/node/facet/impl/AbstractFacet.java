package won.node.facet.impl;

import com.google.common.util.concurrent.ListenableFuture;
import com.hp.hpl.jena.rdf.model.Model;
import com.hp.hpl.jena.rdf.model.ModelFactory;
import com.hp.hpl.jena.rdf.model.Resource;
import com.hp.hpl.jena.rdf.model.StmtIterator;
import org.apache.jena.riot.Lang;
import org.apache.jena.riot.RDFDataMgr;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import won.node.service.DataAccessService;
import won.node.service.impl.NeedFacingConnectionCommunicationServiceImpl;
import won.node.service.impl.OwnerFacingConnectionCommunicationServiceImpl;
import won.protocol.exception.*;
import won.protocol.message.WonMessage;
import won.protocol.message.WonMessageBuilder;
import won.protocol.message.WonMessageType;
import won.protocol.model.Connection;
import won.protocol.model.Need;
import won.protocol.model.NeedState;
import won.protocol.need.NeedProtocolNeedClientSide;
import won.protocol.owner.OwnerProtocolOwnerServiceClientSide;
import won.protocol.repository.rdfstorage.RDFStorageService;
import won.protocol.vocabulary.WON;

import java.io.StringWriter;
import java.net.URI;
import java.util.concurrent.ExecutorService;

/**
 * Created with IntelliJ IDEA.
 * User: gabriel
 * Date: 16.09.13
 * Time: 17:09
 * To change this template use File | Settings | File Templates.
 */
public abstract class AbstractFacet implements Facet
{
  private final Logger logger = LoggerFactory.getLogger(getClass());

  /**
   * Client talking another need via the need protocol
   */
  protected NeedProtocolNeedClientSide needProtocolNeedService;
  /**
   * Client talking to the owner side via the owner protocol
   */
  protected OwnerProtocolOwnerServiceClientSide ownerProtocolOwnerService;

  /**
   * Client talking to this need service from the need side
   */
  protected NeedFacingConnectionCommunicationServiceImpl needFacingConnectionCommunicationService;
  /**
   * Client talking to this need service from the owner side
   */
  protected OwnerFacingConnectionCommunicationServiceImpl ownerFacingConnectionCommunicationService;

  protected NeedProtocolNeedClientSide needFacingConnectionClient;
  protected OwnerProtocolOwnerServiceClientSide ownerFacingConnectionClient;

  protected won.node.service.impl.URIService URIService;

  protected ExecutorService executorService;

  protected DataAccessService dataService;

  protected RDFStorageService rdfStorageService;

  /**
   *
   * This function is invoked when an owner sends an open message to a won node and usually executes registered facet specific code.
   * It is used to open a connection which is identified by the connection object con. A rdf graph can be sent along with the request.
   *
   * @param con the connection object
   * @param content a rdf graph describing properties of the event. The null releative URI ('<>') inside that graph,
   *                as well as the base URI of the graph will be attached to the resource identifying the event.
   * @throws NoSuchConnectionException if connectionURI does not refer to an existing connection
   * @throws IllegalMessageForConnectionStateException if the message is not allowed in the current state of the connection
   */
  @Override
  public void openFromOwner(final Connection con, final Model content, final WonMessage wonMessage)
          throws NoSuchConnectionException, IllegalMessageForConnectionStateException {
    //inform the other side

    // distinguish between the new message format (WonMessage) and the old parameters
    // ToDo (FS): remove this distinction if the old parameters are not used anymore
    if (wonMessage != null) {

      if (wonMessage.getMessageEvent().getReceiverURI() != null) {
        executorService.execute(new Runnable()
        {
          @Override
          public void run() {
            try {
              needFacingConnectionClient.open(con, content, wonMessage);
            } catch (Exception e) {
              logger.warn("caught Exception in openFromOwner", e);
            }
          }
        });
      }

    } else {

      if (con.getRemoteConnectionURI() != null) {
        executorService.execute(new Runnable()
        {
          @Override
          public void run() {
            try {
              needFacingConnectionClient.open(con, content, wonMessage);
            } catch (Exception e) {
              logger.warn("caught Exception in openFromOwner", e);
            }
          }
        });
      }
    }
  }

  /**
   *
   * This function is invoked when an owner sends a close message to a won node and usually executes registered facet specific code.
   *It is used to close a connection which is identified by the connection object con. A rdf graph can be sent along with the request.
   *
   * @param con the connection object
   * @param content a rdf graph describing properties of the event. The null releative URI ('<>') inside that graph,
   *                as well as the base URI of the graph will be attached to the resource identifying the event.
   * @throws NoSuchConnectionException if connectionURI does not refer to an existing connection
   * @throws IllegalMessageForConnectionStateException if the message is not allowed in the current state of the connection
   */
  @Override
  public void closeFromOwner(final Connection con, final Model content, final WonMessage wonMessage)
          throws NoSuchConnectionException, IllegalMessageForConnectionStateException {
    //inform the other side
    if (con.getRemoteConnectionURI() != null) {
      executorService.execute(new Runnable()
      {
        @Override
        public void run()
        {
          try {
              needFacingConnectionClient.close(con, content, wonMessage);
          } catch (Exception e) {
              logger.warn("caught Exception in closeFromOwner: ",e);
          }
        }
      });
    }
  }

  /**
   * This function is invoked when an owner sends a text message to a won node and usually executes registered facet specific code.
   * It is used to indicate the sending of a chat message with by the specified connection object con
   * to the remote partner.
   *
   *
   * @param con the connection object
   * @param message  the chat message
   * @throws NoSuchConnectionException if connectionURI does not refer to an existing connection
   * @throws IllegalMessageForConnectionStateException if the message is not allowed in the current state of the connection
   */
  @Override
  public void sendMessageFromOwner(final Connection con, final Model message, final WonMessage wonMessage)
          throws NoSuchConnectionException, IllegalMessageForConnectionStateException {
    //inform the other side
    executorService.execute(new Runnable() {
      @Override
      public void run() {
        try {
            needFacingConnectionClient.sendMessage(con, message, wonMessage);
        } catch (Exception e) {
            logger.warn("caught Exception in textMessageFromOwner: ",e);
        }
      }
    });
  }

  /**
   *
   * This function is invoked when an won node sends an open message to another won node and usually executes registered facet specific code.
   * It is used to open a connection which is identified by the connection object con. A rdf graph can be sent along with the request.
   *
   * @param con the connection object
   * @param content a rdf graph describing properties of the event. The null releative URI ('<>') inside that graph,
   *                as well as the base URI of the graph will be attached to the resource identifying the event.
   * @throws NoSuchConnectionException if connectionURI does not refer to an existing connection
   * @throws IllegalMessageForConnectionStateException if the message is not allowed in the current state of the connection
   */
  @Override
  public void openFromNeed(final Connection con, final Model content, final WonMessage wonMessage)
          throws NoSuchConnectionException, IllegalMessageForConnectionStateException {
    //inform the need side

    // distinguish between the new message format (WonMessage) and the old parameters
    // ToDo (FS): remove this distinction if the old parameters are not used anymore
    if (wonMessage != null) {
      executorService.execute(new Runnable()
      {
        @Override
        public void run() {
          try {
            ownerFacingConnectionClient.open(wonMessage.getMessageEvent().getReceiverURI(),
                                             content,
                                             wonMessage);
          } catch (Exception e) {
            logger.warn("caught Exception in openFromNeed:", e);
          }
        }
      });
    } else {
      executorService.execute(new Runnable()
      {
        @Override
        public void run() {
          try {
            ownerFacingConnectionClient.open(con.getConnectionURI(), content, wonMessage);
          } catch (Exception e) {
            logger.warn("caught Exception in openFromNeed:", e);
          }
        }
      });
    }
  }

  /**
   *
   * This function is invoked when an won node sends a close message to another won node and usually executes registered facet specific code.
   * It is used to close a connection which is identified by the connection object con. A rdf graph can be sent along with the request.
   *
   * @param con the connection object
   * @param content a rdf graph describing properties of the event. The null releative URI ('<>') inside that graph,
   *                as well as the base URI of the graph will be attached to the resource identifying the event.
   * @throws NoSuchConnectionException if connectionURI does not refer to an existing connection
   * @throws IllegalMessageForConnectionStateException if the message is not allowed in the current state of the connection
   */
  @Override
  public void closeFromNeed(final Connection con, final Model content, final WonMessage wonMessage)
          throws NoSuchConnectionException, IllegalMessageForConnectionStateException {
    //inform the need side
    executorService.execute(new Runnable()
    {
      @Override
      public void run()
      {
        try {
          ownerFacingConnectionClient.close(con.getConnectionURI(), content, wonMessage);
        } catch (Exception e) {
          logger.warn("caught Exception in closeFromNeed:", e);
        }
      }
    });
  }

  /**
   * This function is invoked when a won node sends a text message to another won node and usually executes registered facet specific code.
   * It is used to indicate the sending of a chat message with by the specified connection object con
   * to the remote partner.
   *
   *
   * @param con the connection object
   * @param message  the chat message
   * @throws NoSuchConnectionException if connectionURI does not refer to an existing connection
   * @throws IllegalMessageForConnectionStateException if the message is not allowed in the current state of the connection
   */
  @Override
  public void sendMessageFromNeed(final Connection con, final Model message, final WonMessage wonMessage)
          throws NoSuchConnectionException, IllegalMessageForConnectionStateException {
    //send to the need side
    executorService.execute(new Runnable() {
      @Override
      public void run() {
        try {
          ownerFacingConnectionClient.sendMessage(con.getConnectionURI(), message, wonMessage);
        } catch (Exception e) {
          logger.warn("caught Exception in textMessageFromNeed:", e);
        }
      }
    });
  }

  /**
   * This function is invoked when a matcher sends a hint message to a won node and
   * usually executes registered facet specific code.
   * It notifies the need of a matching otherNeed with the specified match score. Originator
   * identifies the entity making the call. Normally, originator is a matching service.
   * A rdf graph can be sent along with the request.
   *
   * @param con the connection object
   * @param score      match score between 0.0 (bad) and 1.0 (good). Implementations treat lower values as 0.0 and higher values as 1.0.
   * @param originator an URI identifying the calling entity
   * @param content (optional) an optional RDF graph containing more detailed information about the hint. The null releative URI ('<>') inside that graph,
   *                as well as the base URI of the graph will be attached to the resource identifying the match event.
   * @throws won.protocol.exception.NoSuchNeedException
   *          if needURI is not a known need URI
   * @throws won.protocol.exception.IllegalMessageForNeedStateException
   *          if the need is not active
   */
  @Override
  public void hint(final Connection con, final double score,
                   final URI originator, final Model content, final WonMessage wonMessage)
      throws NoSuchNeedException, IllegalMessageForNeedStateException {

    Model remoteFacetModelCandidate = content;
    if (wonMessage == null)
      remoteFacetModelCandidate = changeHasRemoteFacetToHasFacet(content);

    final Model remoteFacetModel = remoteFacetModelCandidate;

    try {
      WonMessageBuilder builder = new WonMessageBuilder();
      URI messageURI = URIService.createMessageEventURI(con.getConnectionURI());
      final WonMessage hintNotification = builder
        .setMessageURI(messageURI)
        .setWonMessageType(WonMessageType.HINT_NOTIFICATION)
        .setSenderNodeURI(originator) // ToDo (FS): get matcher ID from wonMessage when we can rely on a wonMessage being there
        .setReceiverURI(con.getConnectionURI())
        .setReceiverNeedURI(con.getNeedURI())
        .setReceiverNodeURI(URI.create(URIService.getGeneralURIPrefix()))
        .addContent(URI.create(messageURI.toString() + "/content"), remoteFacetModel, null)
        .build();

      executorService.execute(new Runnable()
      {
        @Override
        public void run() {
          //here, we don't really need to handle exceptions, as we don't want to flood matching services with error messages
          try {
            ownerProtocolOwnerService.hint(
              con.getNeedURI(), con.getRemoteNeedURI(),
              score, originator, remoteFacetModel, hintNotification);
          } catch (NoSuchNeedException e) {
            logger.warn("error sending hint message to owner - no such need:", e);
          } catch (IllegalMessageForNeedStateException e) {
            logger.warn("error sending hint content to owner - illegal need state:", e);
          } catch (Exception e) {
            logger.warn("error sending hint content to owner:", e);
          }
        }
      });
    } catch (WonMessageBuilderException e) {
      logger.warn("error creating HintNotificationMessage", e);
    }
  }

  /**
   *
   * This function is invoked when an won node sends an connect message to another won node and usually executes registered facet specific code.
   * The connection is identified by the connection object con. A rdf graph can be sent along with the request.
   *
   * @param con the connection object
   * @param content a rdf graph describing properties of the event. The null releative URI ('<>') inside that graph,
   *                as well as the base URI of the graph will be attached to the resource identifying the event.
   * @throws NoSuchConnectionException if connectionURI does not refer to an existing connection
   * @throws IllegalMessageForConnectionStateException if the message is not allowed in the current state of the connection
   */
  @Override
  public void connectFromNeed(final Connection con, final Model content, final WonMessage wonMessage)
          throws NoSuchNeedException, IllegalMessageForNeedStateException, ConnectionAlreadyExistsException {


    final Connection connectionForRunnable = con;
    executorService.execute(new Runnable() {
      @Override
      public void run() {
        try {
          ownerProtocolOwnerService.connect(con.getNeedURI(), con.getRemoteNeedURI(),
                  connectionForRunnable.getConnectionURI(), content, wonMessage);
        } catch (WonProtocolException e) {
          // we can't connect the connection. we send a deny back to the owner
          // TODO should we introduce a new protocol method connectionFailed (because it's not an owner deny but some protocol-level error)?
          // For now, we call the close method as if it had been called from the owner side
          // TODO: even with this workaround, it would be good to send a content along with the close (so we can explain what happened).
          logger.warn("could not connectFromNeed, sending close back. Exception was: ",e);
          try {
            // ToDo (FS): wonMessage should be a response type
            ownerFacingConnectionCommunicationService.close(
                    connectionForRunnable.getConnectionURI(), content, wonMessage);
          } catch (Exception e1) {
            logger.warn("caught Exception sending close back from connectFromNeed:", e1);
          }
        }
      }
    });
  }

  /**
   *
   * This function is invoked when an owner sends an open message to the won node and usually executes registered facet specific code.
   * The connection is identified by the connection object con. A rdf graph can be sent along with the request.
   *
   * @param con the connection object
   * @param content a rdf graph describing properties of the event. The null releative URI ('<>') inside that graph,
   *                as well as the base URI of the graph will be attached to the resource identifying the event.
   * @throws NoSuchConnectionException if connectionURI does not refer to an existing connection
   * @throws IllegalMessageForConnectionStateException if the message is not allowed in the current state of the connection
   */
  @Override
  public void connectFromOwner(final Connection con, final Model content, WonMessage wonMessage)
          throws NoSuchNeedException, IllegalMessageForNeedStateException, ConnectionAlreadyExistsException {

    Model remoteFacetModel = null;
    if (wonMessage == null) {
       remoteFacetModel = changeHasRemoteFacetToHasFacet(content);
    }

    final Connection connectionForRunnable = con;
    //send to need

    try {
      final ListenableFuture<URI> remoteConnectionURI = needProtocolNeedService.connect(con.getRemoteNeedURI(),
        con.getNeedURI(), connectionForRunnable.getConnectionURI(), remoteFacetModel, wonMessage);
      this.executorService.execute(new Runnable(){
        @Override
        public void run() {
          try{
            if (logger.isDebugEnabled()) {
              logger.debug("saving remote connection URI");
            }
            dataService.updateRemoteConnectionURI(con, remoteConnectionURI.get());
          } catch (Exception e) {
            logger.warn("Error saving connection {}. Stacktrace follows", con);
            logger.warn("Error saving connection ", e);
          }
        }
      });

    } catch (WonProtocolException e) {
      // we can't connect the connection. we send a close back to the owner
      // TODO should we introduce a new protocol method connectionFailed (because it's not an owner deny but some protocol-level error)?
      // For now, we call the close method as if it had been called from the remote side
      // TODO: even with this workaround, it would be good to send a content along with the close (so we can explain what happened).
      logger.warn("could not connectFromOwner, sending close back. Exception was: ",e);
      try {

        // this WonMessage is not valid (the sender part) since it should be send from the remote WON node
        // but it should be replaced with a response message anyway
        WonMessageBuilder builder = new WonMessageBuilder();
        WonMessage closeWonMessage = builder
          .setMessageURI(URIService.createMessageEventURI(con.getConnectionURI()))
          .setWonMessageType(WonMessageType.CLOSE)
          .setSenderURI(wonMessage.getMessageEvent().getSenderURI())
          .setSenderNeedURI(wonMessage.getMessageEvent().getSenderNeedURI())
          .setSenderNodeURI(wonMessage.getMessageEvent().getSenderNodeURI())
          .setReceiverURI(wonMessage.getMessageEvent().getSenderURI())
          .setReceiverNeedURI(wonMessage.getMessageEvent().getSenderNeedURI())
          .setReceiverNodeURI(wonMessage.getMessageEvent().getSenderNodeURI())
          .build();

        needFacingConnectionCommunicationService.close(
                connectionForRunnable.getConnectionURI(), content, closeWonMessage);
      } catch (Exception e1) {
        logger.warn("caught Exception sending close back from connectFromOwner::", e1);
      }
    } catch (Exception e) {
        logger.warn("caught Exception in connectFromOwner: ",e);
    }
  }

  /**
   * Creates a copy of the specified model, replacing won:hasRemoteFacet by won:hasFacet and vice versa.
   * @param model
   * @return
   */
  private Model changeHasRemoteFacetToHasFacet(Model model) {
    Resource baseRes = model.getResource(model.getNsPrefixURI(""));

    StmtIterator stmtIterator = baseRes.listProperties(WON.HAS_REMOTE_FACET);
    if (!stmtIterator.hasNext())
      throw new IllegalArgumentException("at least one facet must be specified with won:hasRemoteFacet");


    final Model newModel = ModelFactory.createDefaultModel();
    newModel.setNsPrefix("", model.getNsPrefixURI(""));
    newModel.add(model);
    newModel.removeAll(null, WON.HAS_REMOTE_FACET, null);
    newModel.removeAll(null, WON.HAS_FACET, null);
    Resource newBaseRes = newModel.createResource(newModel.getNsPrefixURI(""));
    //replace won:hasFacet
    while (stmtIterator.hasNext()) {
      Resource facet = stmtIterator.nextStatement().getObject().asResource();
      newBaseRes.addProperty(WON.HAS_FACET, facet);
    }
    //replace won:hasRemoteFacet
    stmtIterator = baseRes.listProperties(WON.HAS_FACET);
    if (stmtIterator != null) {
        while (stmtIterator.hasNext()) {
          Resource facet = stmtIterator.nextStatement().getObject().asResource();
          newBaseRes.addProperty(WON.HAS_REMOTE_FACET, facet);
        }
    }
    if (logger.isDebugEnabled()){
      StringWriter modelAsString = new StringWriter();
      RDFDataMgr.write(modelAsString, model, Lang.TTL);
      StringWriter newModelAsString = new StringWriter();
      RDFDataMgr.write(newModelAsString, model, Lang.TTL);
      logger.debug("changed hasRemoteFacet to hasFacet. Old: \n{},\n new: \n{}",modelAsString.toString(), newModelAsString.toString());
    }
    return newModel;

  }

  private boolean isNeedActive(final Need need) {
    return NeedState.ACTIVE == need.getState();
  }

  public void setOwnerFacingConnectionClient(OwnerProtocolOwnerServiceClientSide ownerFacingConnectionClient) {
    this.ownerFacingConnectionClient = ownerFacingConnectionClient;
  }

  public void setDataService(DataAccessService dataService) {
    this.dataService = dataService;
  }

  public void setExecutorService(ExecutorService executorService) {
    this.executorService = executorService;
  }

  public void setURIService(won.node.service.impl.URIService URIService) {
    this.URIService = URIService;
  }

  public void setNeedFacingConnectionClient(NeedProtocolNeedClientSide needFacingConnectionClient) {
    this.needFacingConnectionClient = needFacingConnectionClient;
  }

  public void setOwnerFacingConnectionCommunicationService(OwnerFacingConnectionCommunicationServiceImpl ownerFacingConnectionCommunicationService) {
    this.ownerFacingConnectionCommunicationService = ownerFacingConnectionCommunicationService;
  }

  public void setNeedFacingConnectionCommunicationService(NeedFacingConnectionCommunicationServiceImpl needFacingConnectionCommunicationService) {
    this.needFacingConnectionCommunicationService = needFacingConnectionCommunicationService;
  }

  public void setNeedProtocolNeedService(NeedProtocolNeedClientSide needProtocolNeedServiceClient) {
    this.needProtocolNeedService = needProtocolNeedServiceClient;
  }

  public void setOwnerProtocolOwnerService(OwnerProtocolOwnerServiceClientSide ownerProtocolOwnerService) {
    this.ownerProtocolOwnerService = ownerProtocolOwnerService;
  }

  public void setRdfStorageService(final RDFStorageService rdfStorageService) {
    this.rdfStorageService = rdfStorageService;
  }

}
