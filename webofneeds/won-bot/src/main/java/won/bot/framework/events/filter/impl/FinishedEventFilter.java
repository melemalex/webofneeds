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

package won.bot.framework.events.filter.impl;

import won.bot.framework.events.event.Event;
import won.bot.framework.events.listener.EventListener;
import won.bot.framework.events.event.impl.listener.FinishedEvent;
import won.bot.framework.events.filter.EventFilter;

/**
 * Filter that only accepts a FinishedEvent for a specific listener.
 */
public class FinishedEventFilter implements EventFilter
{
  EventListener listener;

  public FinishedEventFilter(final EventListener listener)
  {
    this.listener = listener;
  }

  @Override
  public boolean accept(final Event event)
  {
    if (event instanceof FinishedEvent){
      if ( ((FinishedEvent)event).getListener() == listener) return true;
    }
    return false;
  }
}
