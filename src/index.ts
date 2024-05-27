import { ComponentSettings, Manager, MCEvent } from '@managed-components/types'
import UAParser from 'ua-parser-js'

// Get the user ID stored in the client, if it does not exist, then do not set it.
const getUserId = (event: MCEvent): string | null => {
  const { client } = event;
  let userId = event.payload.user_id || client.get('user_id');
  if (!userId) {
    return null;
  }
  if (event.payload.user_id) {
    client.set('user_id', userId, { scope: 'infinite' });
  }
  return userId;
}

// Get the device ID stored in the client, if it does not exist, make a random one, save it in the client, and return it.
const getDeviceId = (event: MCEvent) => {
  const { client } = event
  let deviceId = event.payload.device_id || client.get('device_id')
  if (!deviceId) {
    deviceId = crypto.randomUUID()
    client.set('device_id', deviceId, { scope: 'infinite' })
  }
  return deviceId
}

// Get the session ID stored in the client, if it does not exist, make a new one, save it in the client, and return it.

const getSessionId = (event: MCEvent) => {
  const { client } = event
  let sessionId = client.get('session_id')
  if (!sessionId) {
    sessionId = new Date().getTime().toString()
    client.set('session_id', sessionId, { scope: 'session' })
  }
  return sessionId
}

// Get the Event ID stored in the client, add +1 to it, and set the new value in the client
const getEventId = (event: MCEvent) => {
  const { client } = event
  let eventId = parseInt(client.get('event_id') as string) || 1
  eventId++
  client.set('event_id', eventId.toString(), { scope: 'infinite' })
}

export default async function (manager: Manager, settings: ComponentSettings) {
  const getEventData = (
    event: MCEvent,
    pageview: boolean,
    ecomPayload?: any
  ) => {
    const { client } = event
    const parsedUserAgent = UAParser(client.userAgent)
    const payload = ecomPayload ? ecomPayload : event.payload
    // eventData builds the eventData object to be used in the request body
    const userId = getUserId(event);

    const eventData = {
      event_type: pageview ? 'pageview' : payload.event_type,
      ...(userId && {
        user_id: userId,
      }),
      event_properties: { url: client.url },
      user_properties: {},
      groups: {},
      language: client.language,
      ip: client.ip,
      event_id: getEventId(event),
      session_id: getSessionId(event),
      os_name: parsedUserAgent.os.name,
      os_version: parsedUserAgent.os.version,
      device_manufacturer: parsedUserAgent.device.vendor,
      device_model: parsedUserAgent.device.model,
      device_id: getDeviceId(event),
      ...(payload.app_version && {
        app_version: payload.app_version,
      }),
      ...(payload.insert_id && {
        insert_id: payload.insert_id,
      }),
      ...(payload.revenue && { revenue: payload.revenue }),
      ...(payload.revenueType && { revenueType: payload.revenueType }),
      ...(payload.productId && { productId: payload.productId }),
      ...(payload.quantity && { quantity: payload.quantity }),
    }

    for (const [key, value] of Object.entries(payload)) {
      if (key.startsWith('user_')) {
        eventData.user_properties[key.substring(5)] = value
      } else if (key.startsWith('groups_')) {
        eventData.groups[key.substring(7)] = value
      } else {
        eventData.event_properties[key] = value
      }
    }
    return eventData
  }

  // maps ecommerce data: ampliteude handles only transaction data (order completed/Refunded), the rest of the events will be just added to the event_properties object like any other event, but without the need for triggers)

  const ecomDataMap = (event: MCEvent) => {
    const { type, name } = event
    let { payload } = event
    payload = { ...payload, ...payload.ecommerce }
    delete payload.ecommerce
    if (type === 'ecommerce') {
      payload.event_type = name
      payload.productId = payload.products
        .map((product: any) => product.product_id)
        .join()
      payload.quantity ??= payload.products.reduce(
        (sum: any, product: any) => sum + parseInt(product.quantity, 10),
        0
      )
      payload.revenue = payload.revenue || payload.total || payload.value
      if (name === 'Order Completed') payload.revenueType = 'Purchase'
      else if (name === 'Order Refunded') payload.revenueType = 'Refund'
    }
    return payload
  }

  manager.addEventListener('pageview', async event => {
    const eventData = getEventData(event, true)
    sendEvent(eventData)
  })

  manager.addEventListener('event', async event => {
    const eventData = getEventData(event, false)
    sendEvent(eventData)
  })

  manager.addEventListener('ecommerce', async event => {
    const ecomPayload = ecomDataMap(event)
    const eventData = getEventData(event, false, ecomPayload)
    sendEvent(eventData)
  })

  // sendEvent function is the main functions to send a server side request
  const sendEvent = async (eventData: any) => {
    const requestBody = {
      api_key: settings.api_key,
      ...(settings.min_id_length && {
        options: { min_id_length: settings.min_id_length },
      }), //if user configured a min_id_length in the options, include the options object
      events: [eventData],
    }

    const amplitudeEndpoint = 'https://api2.amplitude.com/2/httpapi'
    manager.fetch(amplitudeEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    })
  }
}
