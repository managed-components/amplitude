import { ComponentSettings, Manager, Client} from '@managed-components/types'

export default async function (manager: Manager, settings: ComponentSettings, client: Client) {
// fetching API token
  const api_token = '6a114fa10060d2b05ae4a03b4818066' // settings.api_token - how can I make sure this is what the manager sends me?

  // Pageview event
  manager.addEventListener('pageview', async event => {
    var sendEvents:string[] = []
    const eventsParam:string = JSON.stringify({ //needs to stringify
      'event_type': 'Pageview',
      'user_id':'yair@webcm.com',
      'device_id':'56789'
    }); 
    sendEvents.push(eventsParam)

    // Send server-side request
    manager.fetch('https://api2.amplitude.com/2/httpapi', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        api_key: api_token,
        events: sendEvents
      })
    })
    client.execute("console.log('🦔plitude')")
  }
 )
}