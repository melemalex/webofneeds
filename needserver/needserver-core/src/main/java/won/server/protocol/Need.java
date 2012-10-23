/*
 * Copyright 2012  Research Studios Austria Forschungsges.m.b.H.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package won.server.protocol;

import won.server.need.Match;

import java.net.URI;
import java.util.Collection;

/**
 * Interface defining the external methods for the owner protocol on the need side, i.e. those methods
 * that are directly or indirectly exposed via Web Service toward the end user application.
 *
 * This is the contract of a single need object
 * <p/>
 * This interface does not deal with authentication and authorization, yet. It is assumed that the caller is authorized
 * and authenticated where necessary.
 * TODO: missing: how will the owner get the chat-messages? However this is solved, it should be declared in this interface.
 */
public interface Need
{
  
  /**
   * Notifies the need of the fact that it attains the specified match score with otherNeed. Originator
   * identifies the entity making the call. Normally, originator is a matching service.
   *
   * @param otherNeed URI of the other need (may be on the local needserver)
   * @param score      match score between 0.0 (bad) and 1.0 (good). Implementations treat lower values as 0.0 and higher values as 1.0.
   * @param originator an URI identifying the calling entity
   */
  public void hint(URI otherNeed, double score, URI originator);

  /**
   * Returns a representation of the need object.
   * TODO: replace String with the type used to hold the content.
   *
   * @return a representation of the need.
   */
  public String read();

  /**
   * Replace the content of the need with the specified content.
   * TODO replace String with the type used to hold the need content
   *
   * @param content
   * @return the URI of the newly created need
   */
  public void update(String content);

  /**
   * Delete the need.
   *
   */
  public void delete();

  /**
   * Returns all matches for the need.
   *
   * @return a collection of matches
   */
  public Collection<Match> getMatches();

  /**
   * Owner-facing method; causes a connectio to the need identified by otherNeedURI to be requested by this need.
   * A short message (max 140 chars) can be sent along with the request. The other need is contacted by calling
   * its requestConnection method.
   *
   * The returned URI is the new transaction's URI, generated automatically and passed to the
   * remote need. When the connection is accepted by the other side, the remote need will generate
   * a transaction URI in its own domain and link it to the URI generated here.
   *
   * @param otherNeedURI the remote need to connect to
   * @param message (optional) a message for the remote need's owner
   * @return an URI identifying the transaction
   */
  public URI connectTo(URI otherNeedURI, String message);

  /**
   * Need-facing method; requests a connection from the need otherNeedURI. The other need refers to the
   * transaction using the specified otherTransactionURI. A short message can be sent along with the
   * request.
   *
   *
   * @param otherNeedURI
   * @param otherTransactionURI
   * @param message
   */
  public void requestConnection(URI otherNeedURI, URI otherTransactionURI, String message);

  /**
   * Retrieves all transaction URIs (regardless of state) for the specified local need URI.
   * @param localNeedURI the local need to get transaction URIs for
   * @return a collection of transaction URIs.
   */
  public Collection<URI> listTransactionURIs(URI localNeedURI);


}
