/* eslint-disable */
import axios from 'axios';
import { showAlert } from './alerts';

// NOTE: The Stripe public key should be loaded from the server
// For now this is hardcoded, but in production should be fetched from backend
const stripe = Stripe(document.currentScript?.dataset?.stripeKey || 'pk_test_51SMTjw2V9G6KvtY4PjQ93AnfBiIhMKHyfvkOJRFezwESbKwqWXuM9eDhhQ7ymCILslEANs0OIp5vrcXoIbiMjjMz00nTQVznGh');

export const bookTour = async tourId => {
  try {
    // 1) Get checkout session from API
    const session = await axios(
      `http://127.0.0.1:3000/api/v1/bookings/checkout-session/${tourId}`
    );
    console.log(session);

    // 2) Create checkout form + charge credit card
    await stripe.redirectToCheckout({
      sessionId: session.data.session.id
    });
  } catch (err) {
    console.log(err);
    showAlert('error', err);
  }
};
