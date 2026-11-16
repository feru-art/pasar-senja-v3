// Customers: they arrive, take a seat, show an order bubble with a patience bar,
// and either get served or walk out angry. Four kinds, each with its own
// patience, pay and order count — the critic only visits on festival night.

import { CUSTOMERS, DISHES, SEATS } from './config.js';
import { randomPick, randomRange } from './random.js';
import { customerVisualFor } from './characters.js';

/** A fresh customer list: no one seated yet. */
export function createCustomers() {
  return [];
}

/** Which dish ids can be ordered right now (unlocked dishes only). */
export function orderableDishes(unlocked) {
  return Object.keys(DISHES).filter((id) => unlocked.has(id));
}

/** Pick a kind for the next arrival (critic only on night 7). */
export function pickCustomerKind(random, night) {
  if (night >= 7 && random() < 0.18) return 'kritikus';
  const roll = random();
  if (roll < 0.5) return 'sabar';
  if (roll < 0.75) return 'buru';
  return 'boros';
}

/** Seat one customer: kind, orders, patience, seat and a little wobble. */
export function spawnCustomer(random, customers, seats, night, unlocked, event) {
  const freeSeat = seats.find((seat) => !customers.some((c) => c.seat === seat));
  if (!freeSeat) return null;
  const kind = pickCustomerKind(random, night);
  const spec = CUSTOMERS[kind];
  const dishes = orderableDishes(unlocked);
  const orders = [];
  const orderCount = Math.min(spec.orders, dishes.length);
  for (let i = 0; i < orderCount; i += 1) {
    orders.push(randomPick(random, dishes));
  }
  const patienceScale = event ? event.patience : 1.0;
  const customer = {
    id: Math.floor(random() * 1e9),
    kind,
    name: spec.name,
    color: spec.color,
    orders,
    served: [],
    patience: spec.patience * patienceScale * randomRange(random, 0.9, 1.1),
    maxPatience: spec.patience * patienceScale,
    pay: spec.pay,
    seat: freeSeat,
    x: freeSeat.x,
    y: freeSeat.y,
    wobble: random() * Math.PI * 2,
    visual: customerVisualFor(random, kind),
    angry: false,
    leaving: false,
    leaveTimer: 0,
  };
  customers.push(customer);
  return customer;
}

/** Drain patience; returns the customers whose patience just ran out. */
export function updatePatience(customers, step) {
  const angry = [];
  for (const customer of customers) {
    if (customer.leaving) continue;
    customer.patience -= step;
    customer.wobble += step * 2;
    if (customer.patience <= 0) {
      customer.angry = true;
      customer.leaving = true;
      customer.leaveTimer = 0.8;
      angry.push(customer);
    }
  }
  return angry;
}

/** Tick the leaving animation; returns the customers who have walked off. */
export function updateLeaving(customers, step) {
  const gone = [];
  for (const customer of customers) {
    if (!customer.leaving) continue;
    customer.leaveTimer -= step;
    customer.x += step * 220;
    if (customer.leaveTimer <= 0) gone.push(customer);
  }
  return gone;
}

/** Serve a dish to a customer: marks the order done; returns true when it matched. */
export function serveCustomer(customer, dishId) {
  const index = customer.orders.indexOf(dishId);
  if (index === -1) return false;
  customer.orders.splice(index, 1);
  customer.served.push(dishId);
  return true;
}

/** Is this customer fully served (all orders done)? */
export function customerServed(customer) {
  return customer.orders.length === 0;
}

/** How many customers are seated and waiting right now? */
export function waitingCount(customers) {
  return customers.filter((c) => !c.leaving).length;
}

/** The oldest waiting customer who ordered this dish (or null). */
export function findCustomerForDish(customers, dishId) {
  return customers.find((c) => !c.leaving && c.orders.includes(dishId)) ?? null;
}
