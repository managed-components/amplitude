# Amplitude Managed Component

## Supported Event Types

`pageview`, `ecommerce`, `event`

## General Information

This Managed Component (MC) uses [Amplitude’s HTTP API v2](https://www.docs.developers.amplitude.com/analytics/apis/http-v2-api-quickstart/). It employs the Fetch API to send server-side requests to Amplitude’s endpoint. The MC assigns a User ID (UUID), Session ID (timestamp at the beginning of a session), and Event ID (counter) to every visitor. It uses the KV storage to save these.

---

## Tool Settings

Settings are used to configure the tool in a Component Manager config file.

1. API Key, `string`, _required_
   - See [Find your Amplitude Project API Credentials](https://www.docs.developers.amplitude.com/analytics/find-api-credentials/) for help locating your credentials.
2. Device IDs and User IDs minimum length, number, _optional_

—

## Fields Description

Fields are properties that can/must be sent with certain events.

### Required Fields

- Name, `string` _required_
  - The property `name` (holding the event name) will be sent to Amplitude as `event_type`.

---

### Event, User & Group Fields/Properties `string` _optional_

Amplitude distinguishes between Event Properties, User Properties, and Group Properties. To use these features, follow the instructions below:

- All Properties are by default sent as Event Properties. This is true with the exception of properties that begin with `user_` or `groups_` prefixes.
- To send User Properties, name your fields/event parameters with the prefix `“user_”`. For example, in WebCM: `webcm.track(‘event’, {name: ‘signup’, user_name: ‘My Name’})`. Since in WebCM all of the event properties are automatically directed to the tool (without the need for mapping configuration), the following code should end up adding `user_name` to the User Properties. It will omit the prefix from the property name, so it will send `name` as the key and `My Name` as the value.
- To send Groups Properties, name your fields/event parameters with the prefix `“groups_”`. For example, in WebCM: `webcm.track(‘event’, {name: ‘signup’, groups_company: ‘My Company Name’})`. Since in WebCM all of the event properties are automatically directed to the tool (without the need for mapping configuration), the following code should end up adding `groups_company` to the Groups Properties. It will omit the prefix from the property name, so it will send `company` as the key and `My Company` as the value.

---

### Ecommerce

Amplitude allows sending the following types of ecommerce properties: `price`, `quantity`, `productId`, `revenue` and `revenueType`. You can see their definitions [here](https://www.docs.developers.amplitude.com/analytics/apis/http-v2-api/#keys-for-the-event-argument). In this implementation we do not use the `price` property.

This MC therefore, supports two types of Ecommerce events:

1. Order Completed
2. Order Refunded

You should use exactly these and send them as the `name` property for ecommerce to work. Together with each one, you can send the following properties:

1. `revenue`, `total` or `value` (the

MC will first look for `revenue` and if not found, `value` and so on) 2. `products` - an array of products and their details

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
- `$quantity`: `2`
- `$revenue`: `25.0`
- `$revenueType`: `Purchase`

---
