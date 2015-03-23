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

package won.protocol.message.processor.impl;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import won.protocol.message.WonMessage;
import won.protocol.message.processor.WonMessageProcessor;
import won.protocol.message.processor.exception.WonMessageProcessingException;

/**
 * Checks all signatures found in a WonMessage. It is assumed that the message is well-formed.
 */
public class SignatureCheckingWonMessageProcessor implements WonMessageProcessor
{
  private final Logger logger = LoggerFactory.getLogger(getClass());
  @Override
  public WonMessage process(final WonMessage message) throws WonMessageProcessingException {
    logger.warn("signature check not yet implemented!");
    return message;
  }
}
