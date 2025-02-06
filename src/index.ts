import { ComponentSettings, Manager, MCEvent } from '@managed-components/types'

// Get the user ID stored in the client, if it does not exist, then do not set it.
const getUserId = (event: MCEvent): string | null => {
  const userId = event.payload.user_id
  if (!userId) {
    return null
  }
  return userId
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

  return eventId
}

export interface EventData {
  event_type: string
  user_id?: string
  event_properties: Record<string, any>
  user_properties: Record<string, any>
  groups: Record<string, any>
  event_id: number
  session_id: string
  [key: string]: any // Other top level properties
}

export default async function (manager: Manager, settings: ComponentSettings) {
  const getEventData = (
    event: MCEvent,
    pageview: boolean,
    ecomPayload?: any
  ) => {
    const { client } = event
    const payload = ecomPayload ? ecomPayload : event.payload
    // eventData builds the eventData object to be used in the request body
    const userId = getUserId(event)
    delete payload.eu_data

    const eventData: EventData = {
      event_type: pageview ? 'pageview' : payload.event_type,
      ...(userId && {
        user_id: userId,
      }),
      event_properties: { url: client.url },
      user_properties: {},
      groups: {},
      event_id: getEventId(event),
      session_id: getSessionId(event),
    }
    /*
    Maps the event properties, user properties and groups. 
    Will overwrite the top level properties (user_id/session_id/os_name/etc) if they are defined in the Zaraz UI - else it'll use the default values defined above.
    */
    for (const [key, value] of Object.entries(payload)) {
      if (key.startsWith('event_properties.')) {
        const _key = key.substring(17)
        eventData.event_properties[_key] = value
      } else if (key.startsWith('user_properties.')) {
        eventData.user_properties[key.substring(16)] = value
      } else if (key.startsWith('groups.')) {
        eventData.groups[key.substring(7)] = value
      } else {
        eventData[key] = value
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
    const isEUEndpoint = !!event.payload.eu_data
    const eventData = getEventData(event, true)
    sendEvent(eventData, isEUEndpoint)
  })

  manager.addEventListener('event', async event => {
    const isEUEndpoint = !!event.payload.eu_data
    const eventData = getEventData(event, false)
    sendEvent(eventData, isEUEndpoint)
  })

  manager.addEventListener('ecommerce', async event => {
    const isEUEndpoint = !!event.payload.eu_data
    const ecomPayload = ecomDataMap(event)
    const eventData = getEventData(event, false, ecomPayload)
    sendEvent(eventData, isEUEndpoint)
  })

  // sendEvent function is the main functions to send a server side request
  const sendEvent = async (eventData: any, isEUEndpoint: boolean) => {
    const requestBody = {
      api_key: settings.api_key,
      ...(settings.min_id_length && {
        options: { min_id_length: settings.min_id_length },
      }), //if user configured a min_id_length in the options, include the options object
      events: [eventData],
    }

    const endpoint = isEUEndpoint
      ? 'https://api.eu.amplitude.com/2/httpapi'
      : 'https://api2.amplitude.com/2/httpapi'

    manager.fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    })
  }
}
