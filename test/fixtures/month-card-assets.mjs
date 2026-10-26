// Local test loader: expose the same asset paths a build gives the image components.
// It only supplies URL strings; the mocked renderer never starts a browser or fetches them.
import { registerHooks } from 'node:module';
import { fileURLToPath } from 'node:url';
registerHooks({
  load(url, context, nextLoad) {
    if (/\.(png|ttf|scss)$/.test(url)) {
      return { format: 'module', source: `export default ${JSON.stringify(fileURLToPath(url))};`, shortCircuit: true };
    }
    return nextLoad(url, context);
  }
});
