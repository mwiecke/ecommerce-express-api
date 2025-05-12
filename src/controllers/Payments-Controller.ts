import { Request, Response } from 'express';
import Stripe from 'stripe';
import orderService from '../Database/Order-Service.js';

const stripe = new Stripe(process.env.STRIPE_SEECRET_KEY!, {
  apiVersion: '2025-03-31.basil',
});

const GetPublishableKEY = (req: Request, res: Response) => {
  res.json({ key: process.env.STRIPE_Publishable_KEY });
};

const payment = async (req: Request, res: Response) => {
  try {
    const user = req.user;

    if (!user) {
      res.status(401).json({ msg: 'Unauthorized' });
      return;
    }

    const userId = (req.user as { id: string }).id;

    const { id: orderId, totalPrice: price } = await orderService.getinf(
      userId
    );

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Order Payment',
            },
            unit_amount: Number(price) * 100,
          },
          quantity: 1,
        },
      ],
      success_url: 'http://localhost:3000/success',
      cancel_url: 'http://localhost:3000/cancel',

      metadata: {
        orderId: orderId,
      },
    });

    res.send({ id: session.id, url: session.url });
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: 'Internal Server Error' });
  }
};

const webhook = async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig!, endpointSecret);
  } catch (err) {
    console.error('Webhook Error:', err);
    res.status(400).send(`Webhook Error: ${(err as Error).message}`);
    return;
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;

    const orderId = session.metadata?.orderId;

    if (orderId) {
      orderService.payment(session.id, orderId, 'COMPLETED');
    }

    res.status(200).json({ received: true });
  }

  if (event.type === 'checkout.session.expired') {
    const session = event.data.object as Stripe.Checkout.Session;
    const orderId = session.metadata?.orderId;

    if (orderId) {
      await orderService.payment(session.id, orderId, 'FAILED');
      console.log('Session expired for order:', orderId);
    }

    res.status(400).json({ msg: 'Session expired for order' });
  }
};

export { GetPublishableKEY, webhook, payment };
