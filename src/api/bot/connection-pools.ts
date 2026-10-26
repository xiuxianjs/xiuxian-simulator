import { Agent as HTTPAgent } from 'node:http';
import { Agent as HTTPSAgent } from 'node:https';

// Pool connections rather than authenticated clients: each SDK invocation keeps
// its own bid, token, timeout, message trace and presentation callback.
// Do not impose a socket cap that queues battle requests behind notifications.
export const backendConnectionPools = {
  httpAgent: new HTTPAgent({ keepAlive: true, scheduling: 'lifo' }),
  httpsAgent: new HTTPSAgent({ keepAlive: true, scheduling: 'lifo' })
};
