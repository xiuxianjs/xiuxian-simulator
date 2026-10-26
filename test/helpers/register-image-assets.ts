import { registerHooks } from 'node:module';

// Mirror the build's static asset imports without invoking the image renderer.
registerHooks({
  load(url, context, nextLoad) {
    if (/\.(png|jpe?g|webp|gif|svg|s?css|ttf|otf|woff2?)$/.test(url)) return { format: 'module', source: `export default ${JSON.stringify(url)}`, shortCircuit: true };
    return nextLoad(url, context);
  }
});
