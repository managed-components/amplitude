# Amplitude Managed Component

## Supported Event Types

`pageview`, `ecommerce`, `event`

## General Information

This Managed Component (MC) uses [Amplitude’s HTTP API v2](https://www.docs.developers.amplitude.com/analytics/apis/http-v2-api-quickstart/). It employs the Fetch API to send server-side requests to Amplitude’s endpoint. The MC assigns a User ID (UUID), Session ID (timestamp at the beginning of a session), and Event ID (counter) to every visitor. It uses the KV storage to save these.

---

## Tool Settings

#### API Key `string` _required_

`api_key` Used to pass your Amplitude's Project API key. See [Find your Amplitude Project API Credentials](https://www.docs.developers.amplitude.com/analytics/find-api-credentials/) for help locating your credentials.

#### Minimun Id Length `Integer`, _optional_

`min_id_length` Use this field to override the Device IDs and User IDs minimum length. For more information, see Amplitude's docs for [Options](https://www.docs.developers.amplitude.com/analytics/apis/http-v2-api/#options).

## Fields Description

Fields are properties that can/must be sent with certain events.

### Required Fields

##### Event Type `string` _required_

`event_type` Amplitude's `event_type` property should be holding the event name. In this implementation, the event name will be set to 'pageview' for a pageview event type. In case of event or ecommerce event types, it will recieve `payload.event_type`. For example, in WebCM, `webcm.track('event', {event_type: 'signup'})` will result in sending `event_type: 'signup'`.

---

### Optional Fields

Amplitude distinguishes between Event Properties, User Properties, and Group Properties. To use these features, follow the instructions below.

##### Event Properties `object` _optional_

`event_properties` All Properties are by default sent as `event_properties`. This is true with the exception of properties that begin with `user_` or `groups_` prefixes.

##### User Properties `object` _optional_

`user_properties` To send `user_properties`, name your fields/event parameters with the prefix `"user_"`. For example, in WebCM: `webcm.track('event', { name: 'signup', user_name: 'My Name' })`. Since in WebCM, all event properties are automatically directed to the tool without the need for mapping configuration, the following code should add `user_name` to `user_properties`. It will omit the prefix from the property name, so it will send `name` as the key and `My Name` as the value.

##### Groups `object` _optional_

`groups` To send the `groups` property, name your fields/event parameters with the prefix `“groups_”`. For example, in WebCM: `webcm.track('event', {name: 'signup', groups_company: 'My Company Name'})`. Since in WebCM all of the event properties are automatically directed to the tool (without the need for mapping configuration), the following code should end up adding `groups_company` to `groups`. It will omit the prefix from the property name, so it will send `company` as the key and `My Company` as the value.

##### User ID `string` _optional_

`user_id` The `user_id` field is automatically generated with a random string unless it is specifically provided as a parameter with an event. In such cases, the provided value will override the automatically generated one.

---

## Ecommerce

Amplitude allows sending the following types of ecommerce properties: `price`, `quantity`, `productId`, `revenue` and `revenueType`. You can see their definitions [here](https://www.docs.developers.amplitude.com/analytics/apis/http-v2-api/#keys-for-the-event-argument). In this implementation we do not use the `price` property.

This MC therefore, supports two types of Ecommerce events:

1. Order Completed
2. Order Refunded

You should use exactly these and send them as the `name` property for ecommerce to work. Together with each one, you can send the following properties:

1. `revenue`, `total` or `value` (the MC will first look for `revenue` and if not found, `value` and so on)
2. `products` - an array of products and their details

So for example, in WebCM the following snippet:

```javascript
webcm.track('ecommerce', {
  name: 'Order Completed',
  order_id: '1234',
  total: 30.0,
  revenue: 25.0,
  shipping: 3,
  tax: 2,
  coupon: 'winter-sale',
  currency: 'USD',
  products: [
    {
      product_id: '1111product',
      sku: '1234',
      name: 'Shorts',
      price: 10,
      quantity: 2,
      category: 'shorts',
    },
    {
      product_id: '2222product',
      sku: '5678',
      name: 'T-shirt',
      price: 5,
      quantity: 2,
      category: 'T-shirts',
    },
  ],
})
```

Will result in sending these Event Properties:

- `$price`: `25.0`
- `$productId`: `1111product,2222product`
- `$quantity`: `4`
- `$revenue`: `25.0`
- `$revenueType`: `Purchase`

---
