// stripe setup to update with production key
const stripe = require("stripe")(process.env.STRIPE_API);

exports.getPaymentSession = async (req, res) => {
  console.log(`Received request to get payment session`);

  const priceId = getPriceIdForProduct(req.body.product);
  const customerEmail = req.body.email;

  try {
    const session = await stripe.checkout.sessions.create({
      customer_email: customerEmail,
      payment_method_types: ["card"],
      subscription_data: {
        trial_from_plan: true,
      },
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: process.env.SUCCESS_URL,
      cancel_url: process.env.CANCEL_URL,
    });

    console.log(
      `Successfully process payment session for user ${req.body.email}!`
    );
    res.status(200).send({
      status: "success",
      msg: "session retrieved successfully",
      session: JSON.stringify(session),
    });
  } catch (err) {
    console.log(
      `An error occurred while retrieving session for ${req.body.product}: ${err}`
    );
    res.status(500);
    res.send({ err, status: "error" });
  }
};

function getPriceIdForProduct(product) {
  if (product === "plus") {
    return process.env.STRIPE_PLUS_PRICE_MONTHLY;
  } else if (product === "plus-yearly") {
    return process.env.STRIPE_PLUS_PRICE_YEARLY;
  }
}
