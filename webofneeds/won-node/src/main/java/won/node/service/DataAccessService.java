/*
 * Copyright 2012  Research Studios Austria Forschungsges.m.b.H.
 *
 *    Licensed under the Apache License, Version 2.0 (the "License");
 *    you may not use this file except in compliance with the License.
 *    You may obtain a copy of the License at
 *
 *        http://www.apache.org/licenses/LICENSE-2.0
 *
 *    Unless required by applicable law or agreed to in writing, software
 *    distributed under the License is distributed on an "AS IS" BASIS,
 *    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *    See the License for the specific language governing permissions and
 *    limitations under the License.
 */

package won.node.service;

import com.hp.hpl.jena.rdf.model.Model;
import com.hp.hpl.jena.rdf.model.Resource;
import won.protocol.repository.rdfstorage.RDFStorageService;
import won.node.service.impl.URIService;
import won.protocol.exception.*;
import won.protocol.model.Connection;
import won.protocol.model.ConnectionEvent;
import won.protocol.model.ConnectionEventType;
import won.protocol.model.ConnectionState;

import java.net.URI;
import java.util.Collection;
import java.util.List;

/**
 * User: fkleedorfer
 * Date: 18.04.14
 */
public interface DataAccessService
{
  Collection<URI> getSupportedFacets(URI needUri) throws NoSuchNeedException;

  /**
   * Returns the first facet found in the model, attached to the null relative URI '<>'.
   * Returns null if there is no such facet.
   * @param content
   * @return
   */
  URI getFacet(Model content);

  /**
   * Adds a triple to the model of the form <> won:hasFacet [facetURI].
   * @param content
   * @param facetURI
   */
  void addFacet(Model content, URI facetURI);

  Connection getConnection(List<Connection> connections, URI facetURI, ConnectionEventType eventType)
      throws ConnectionAlreadyExistsException;

  public Connection createConnection(final URI needURI, final URI otherNeedURI, final URI otherConnectionURI,
    final URI facet, final ConnectionState connectionState, final ConnectionEventType connectionEventType)
    throws NoSuchNeedException, IllegalMessageForNeedStateException, ConnectionAlreadyExistsException;

  ConnectionEvent createConnectionEvent(URI connectionURI, URI originator,
    ConnectionEventType connectionEventType);

  Connection nextConnectionState(URI connectionURI, ConnectionEventType connectionEventType)
                                                        throws NoSuchConnectionException, IllegalMessageForConnectionStateException;

  /**
   * Adds feedback, represented by the subgraph reachable from feedback, to the RDF description of the
   * item identified by forResource
   * @param forResource
   * @param feedback
   * @return true if feedback could be added false otherwise
   */
  boolean addFeedback(URI forResource, Resource feedback);

  void saveAdditionalContentForEvent(Model content, Connection con, ConnectionEvent event);

  void saveAdditionalContentForEvent(Model content, Connection con, ConnectionEvent event,
    Double score);

  void updateRemoteConnectionURI(Connection con, URI remoteConnectionURI);

  void setURIService(URIService URIService);

  void setRdfStorageService(RDFStorageService rdfStorageService);
}
