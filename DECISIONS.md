# Decisions and assumptions

## Assumptions

The acceptance criteria do not say how "top rated" is chosen. There is no admin screen in the brief, so the five featured products are the highest rated products in the catalogue. Ties go to the higher number of reviews, then the lower product id. A category page uses the same order. The first three are shown as top rated, and the rest of that category are the additional products.

"Text matching" means the search term appears in the product title or description. Matching is case-insensitive and is not a regular expression. Title matches are listed before description-only matches. The category name is not searched.

"Contact details" are name, email, phone, and message. The phone number is required. The product in the email comes from the catalogue, not from a hidden field on the form.

The sales inbox receives the email. The customer does not get a copy. Their address is the Reply-To, so a salesperson can reply to them. The thank-you message is **Thank you for your enquiry!** and it is shown only after the mail server accepts the message.

A successful enquiry is also stored in memory so the API can return an id. That store is lost when the backend restarts. There is no public list of enquiries.

Product prices are shown in US dollars because the Fake Store prices are dollar amounts. Category labels are capitalised for display. The stored category value is unchanged.

An unknown product or category is a normal error response, not an empty crash. If the upstream catalogue is down or slow, the API returns a short message and does not include the upstream address.

## What was simplified

There is no screen for someone to hand-pick the five featured products. The rating rule above stands in until an admin exists.

The visual design is a simple responsive layout. The brief says the creative work is still being done, so the pages are structured so the CSS can be replaced without changing the data flow.

Enquiries are not stored in a database. Email delivery is the acceptance criterion. A database would matter once someone needs to search old enquiries.

There is no customer account, payment, or stock count. None of those are in the criteria.

The app is a web catalogue, not a mobile app. One client was required.

Docker Compose runs locally. It is not deployed to AWS. The containers are ordinary Node and Mailpit images, so they can move to ECS or another AWS container service later without a rewrite.

## How this can grow

The product source is a `ProductProvider`. `FakeStoreProductProvider` is the only implementation, and it is the only code that calls Fake Store. A later source implements the same interface and is passed into the app. Product JSON uses a local image path such as `/api/products/1/image`. The client never sees an upstream URL.

Email is an `EmailSender`. `SmtpEmailSender` is the Nodemailer implementation. The enquiry flow calls `sendEnquiry` and does not know which provider sends the mail. Another provider replaces that class. SMTP host, port, credentials, from address, and sales inbox are environment variables.

The React app talks only to this backend. Pages, search, and the enquiry form can change while the provider boundary stays put.

Enquiries go through an `EnquiryRepository`. The current one is in memory. A database repository can replace it behind the same `add` method.

## Another day

I would persist enquiries, then add a way for the business to choose the five featured products instead of deriving them from ratings.

I would add a customer confirmation only if the business wants one. The current criterion is the sales inbox.

I would replace the placeholder layout with the real creative work, and deploy the same Compose services to AWS with a real SMTP provider configured through environment variables.
