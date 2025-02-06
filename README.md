# Blinq Fork of Amplitude Managed Component

This is a fork of [Amplitude Managed Component](https://github.com/managed-components/amplitude)

TL;DR - You now will have full control of the entire Amplitude payload. Whereas, previously you didn't.

The main changes we've made here are:

1. The ability to edit/override the top level fields. The main problem Blinq was facing was that the original repo would automatically set the device properties to the userAgent on the client. Which, for our use case we didn't want. Additionally we had no control over this. This fork fixes these problems.
2. Better prefix structure for sending user_properties/event_properties/groups. This fixes some of the bugs from the original repo. For example in the original repo: Sending a value to `user_id` in Zaraz would result in both the `user_id` property and `user_properties.id` to be set. This is NOT desired.
3. All the device properties are not getting set for you. We have found this redundant as you could simply set these yourself in Zaraz. This allows you to have more control over the payload and your analytics.

## Supported Event Types

`pageview`, `ecommerce`, `event`

## General Information

This Managed Component (MC) uses [Amplitude’s HTTP API v2](https://www.docs.developers.amplitude.com/analytics/apis/http-v2-api-quickstart/). It employs the Fetch API to send server-side requests to Amplitude’s endpoint. The MC assigns a User ID (UUID), Session ID (timestamp at the beginning of a session), and Event ID (counter) to every visitor. It uses the KV storage to save these.

---

## Tool Settings

#### API Key `string` _required_

`api_key` Used to pass your Amplitude's Project API key. See [Find your Amplitude Project API Credentials](https://www.docs.developers.amplitude.com/analytics/find-api-credentials/) for help locating your credentials.

#### EU Data Residency `boolean` _optional_

`eu_data` For EU data residency, the project must first be set up inside [Amplitude EU](https://analytics.eu.amplitude.com/signup). Toggle on this field to change the standard endpoint with the EU residency endpoint: `https://api.eu.amplitude.com/2/httpapi`.

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

`event_properties` To send `event_properties`, name your fields/event parameters with the prefix `"event_properties."`. For example, in WebCM: `webcm.track('event', {name: 'signup', event_properties.device: 'iphone'})`. The following code should end up adding `device` to `event_properties`. It will omit the prefix from the property name, so it will send `device` as the key and `iphone` as the value.

##### User Properties `object` _optional_

`user_properties` To send `user_properties`, name your fields/event parameters with the prefix `"user_properties."`. For example, in WebCM: `webcm.track('event', { name: 'signup', user_properties.name: 'My Name' })`. The following code should add `name` to `user_properties`. It will omit the prefix from the property name, so it will send `name` as the key and `My Name` as the value.

##### Groups `object` _optional_

`groups` To send the `groups` property, name your fields/event parameters with the prefix `“groups.”`. For example, in WebCM: `webcm.track('event', {name: 'signup', groups.company: 'My Company Name'})`. The following code should end up adding `company` to `groups`. It will omit the prefix from the property name, so it will send `company` as the key and `My Company` as the value.

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
