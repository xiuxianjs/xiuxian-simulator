import { onResponse } from 'alemonjs';
import { selects } from './config';
import compatibility from './mwBan';

export { sendMiddlewareReply } from './middlewareReply';

// Keep the existing router registration. Admission now belongs to each combined
// business request; this local compatibility layer must never call the backend.
export default onResponse(selects, (event, next) => {
  if (compatibility(event) === true) {
    return next();
  }
});
