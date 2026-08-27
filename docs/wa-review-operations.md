# Wear Active review collection workflow

This is the operating process for Judge.me Free, manual WhatsApp outreach, and the approved photo/video reward.

## Offer

- Rs.300 off the customer's next order of Rs.3,000 or more.
- Requires an honest, verified product review containing a photo or video.
- Every rating qualifies. Never ask only satisfied customers or require a positive rating.
- One reward per delivered order.
- The unique discount code expires 30 days after issue and can be used once.
- The media should show the product or fit. The customer's face is optional.

## Judge.me setup

1. Go to Judge.me > Settings > Request reviews > Timing and format.
2. Use the Fulfilled trigger available on the Free plan.
3. Set the first request to 8 days after fulfillment. With a 2–5 working-day delivery window, this gives most customers several days to wear the product.
4. Do not enable a paid Judge.me trial just for reminders. Automatic reminder emails require the Awesome plan; the single WhatsApp follow-up below replaces them.
5. Keep review verification enabled.
6. Keep review content required if the current Free-plan settings allow it.
7. In the review-request email or form introduction, add this wording wherever the Free-plan editor permits:

   `Tell us how the product fits, what you used it for, what you liked, and what we could improve. Add a product photo or video to qualify for Rs.300 off your next order of Rs.3,000 or more. Every honest rating qualifies.`

8. Enable the post-submission prompt for a store review and other items from the same order if those controls are available in the current Free-plan editor.
9. Go to Judge.me > Settings > Request reviews > Links, QR codes and POS review collection. Save the all-products review link for the reviews page and packaging QR code.

## Weekly manual outreach

At 15–20 delivered orders per month, run this twice each week instead of installing another app.

1. Open fulfilled Shopify orders that are 9–11 days old.
2. Confirm the order has likely been delivered. If tracking does not show delivery, do not send the review message yet.
3. Check Judge.me and skip customers who already reviewed.
4. Open the product-specific Judge.me review link when possible. Use the all-products link only as a fallback.
5. Send the first WhatsApp message.
6. If there is no review or opt-out, send one final reminder four days later.
7. Do not send more review reminders after that.

## WhatsApp message

Hi {{ first_name }}, this is Wear Active. We hope your {{ product_name }} is fitting well.

Could you share an honest review? Tell us how it fits, what you used it for, what you liked, and what we could improve:

{{ product_review_link }}

Add a product photo or video and we will send you Rs.300 off your next order of Rs.3,000 or more. Every honest rating qualifies, and your face does not need to appear. Please use the email from your order so Judge.me can verify the review.

Reply STOP if you do not want review reminders.

## One follow-up

Hi {{ first_name }}, a quick reminder about reviewing your {{ product_name }}:

{{ product_review_link }}

An honest photo or video review qualifies for Rs.300 off your next Rs.3,000+ order. You can also reply here if you need help with sizing, quality, or an exchange. Thank you.

## Reward approval and issue

1. Confirm the review is connected to a real delivered order.
2. Confirm it contains a customer photo or video showing the product.
3. Do not judge eligibility by star rating or sentiment.
4. In Shopify, create a unique amount-off discount code:
   - Naming pattern: `WA300-{{ random 6-character suffix }}` (do not expose the order number in the code)
   - Amount off: Rs.300
   - Minimum purchase: Rs.3,000
   - Customer eligibility: the reviewing customer when practical
   - Maximum uses: one
   - Expiry: 30 days from issue
5. Record the reward in the tracker.
6. Send the customer:

   `Thank you for sharing an honest photo/video review. Your Rs.300 reward code is {{ discount_code }}. It is valid for one order of Rs.3,000 or more until {{ expiry_date }}.`

## Tracker fields

- Shopify order number
- Customer name and WhatsApp number
- Product reviewed
- Fulfilled/delivered date
- First email date
- WhatsApp request date
- Follow-up date
- Review submitted date and Judge.me URL
- Verified status
- Photo/video present
- Discount code and expiry
- Redemption status
- Opt-out status

## First 60-day targets

These are operating targets, not market benchmarks.

- At least 10 reviews per 100 delivered orders.
- At least 35% of submitted reviews include a photo or video.
- At least 80% of reviews are verified.
- No more than one WhatsApp follow-up.
- Record every opt-out and never contact that customer again for a review.

## Website rollout threshold

- Keep the Customer Reviews page template unlinked while review volume is sparse.
- At 10–15 useful reviews, add Judge.me's Free Cards Carousel or Reviews Carousel to the homepage.
- At 20–30 reviews, create `/pages/customer-reviews`, assign the `customer-reviews` template, add the Judge.me Reviews Grid (or All Reviews) app block, and add the page to the footer.
- Never hardcode the review average or count in theme code.
