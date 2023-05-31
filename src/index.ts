import { ComponentSettings, Manager, MCEvent} from '@managed-components/types'
import UAParser from 'ua-parser-js';
import { randomUUID } from 'crypto';

// Get the user ID stored in the client, if it does not exist, make a random one, save it in the client, and return it. 
const getUserId = (event: MCEvent) => { 
  const { client } = event 
  let userId = client.get('user_id');
  if (!userId) {
    userId = randomUUID();
    client.set('user_id', userId, { scope: 'infinite' });
  }
  return userId;
}
// Get the session ID stored in the client, if it does not exist, make a new one, save it in the client, and return it.

const getSessionId = (event: MCEvent) => { 
  const { client } = event 
  let sessionId = client.get('session_id');
  if (!sessionId) {
    sessionId = new Date().getTime().toString();
    client.set('session_id', sessionId, { scope: 'session' });
  }
  return sessionId;
}

// Get the Event ID stored in the client, add +1 to it, and set the new value in the client
const getEventId = (event: MCEvent) => { 
  const { client } = event;
  let eventId: any = client.get('event_id');
  if (!eventId) {
    eventId = '1';
    client.set('event_id', eventId, { scope: 'infinite' });
  } else {
    eventId = (parseInt(eventId, 10) + 1).toString();
    client.set('event_id', eventId, { scope: 'infinite' });
  }
  return eventId;
}

export default async function (manager: Manager, settings: ComponentSettings) {
  const getEventData = (event: MCEvent, pageview:boolean) =>{
    const { client, payload } = event
    const parsedUserAgent = UAParser(client.userAgent);
    
    // eventData builds the eventData object to be used in the request body

    const eventData = {
      event_type: pageview? 'pageview' : payload.name,
      user_id: getUserId(event),
      time: `${new Date().getTime()}`, 
      event_properties: {url:client.url},
      user_properties:  {},
      groups: {},
      language: client.language,
      ip: client.ip,
      event_id: getEventId(event),
      session_id: getSessionId(event),
      os_name: parsedUserAgent.os.name, 
      os_version: parsedUserAgent.os.version,
      device_manufacturer: parsedUserAgent.device.vendor ,
      device_model: parsedUserAgent.device.model,
      ...(payload.device_id && {
        device_id: payload.device_id
      }),
      ...(payload.app_version && {
        app_version: payload.app_version,
      }),
      ...(payload.insert_id && {
        insert_id: payload.insert_id,
      }),
    };

    for (const [key, value] of Object.entries(payload)) {
      if (key.startsWith('user_')) {
        eventData.user_properties[key.substring(5)] = value
      } else if (key.startsWith('groups_')) { 
        eventData.groups[key.substring(7)] = value;
      } else if (key.startsWith('ecom_')) { 
        eventData[key.substring(5)] = value;
      }
       else {
        eventData.event_properties[key] = value;
      }
    }
    return eventData;
  }

  // maps ecommerce data: ampliteude handles only transaction data (order completed/Refunded), the rest of the events will be just added to the event_properties object like any other event, but without the need for triggers)
  
  const ecomDataMap = (event:MCEvent) => {
    const { payload, type, name} = event
    if (type === 'ecommerce') {
      switch (name) {
        case 'Order Completed':
          payload.ecom_revenue = payload.revenue || payload.total || payload.value;
          payload.ecom_revenueType = 'Purchase';
          payload.ecom_productId = payload.products.map((product: any) => product.product_id).join();
          payload.ecom_quantity = payload.products.length;
          break
        case 'Order Refunded':
          payload.ecom_revenue = payload.revenue || payload.total || payload.value;
          payload.ecom_revenueType = 'Refund';
          payload.ecom_productId = payload.products.map((product: any) => product.product_id).join();
          payload.ecom_quantity = payload.products.map((product: any) => product.product_id).length;
          break
        default:
      } 
    }
  };

  manager.addEventListener('pageview', async event => {
    const eventData = getEventData(event, true);
    sendEvent(eventData);
  })

  manager.addEventListener('event', async event => {
    const eventData = getEventData(event, false);
    sendEvent(eventData);
  })

   manager.addEventListener('ecommerce', async event => {
    ecomDataMap(event);
    const eventData = getEventData(event, false);
    sendEvent(eventData);
  })
  
  // sendEvent function is the main functions to send a server side request
  const sendEvent = async ( eventData: any) => {
     const requestBody = {
      api_key: settings.api_key || "6a114fa10060d2b05ae4a03b4818066", //delete 
      ...(settings.min_id_length && { options: {min_id_length:settings.min_id_length,}}), //if user configured a min_id_length in the options, include the options object
      events: [eventData]
  }
      const amplitudeEndpoint = 'https://api2.amplitude.com/2/httpapi';
      manager.fetch(amplitudeEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })
  }
}
