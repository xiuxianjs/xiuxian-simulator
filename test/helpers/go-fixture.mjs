import { execFileSync } from 'node:child_process';

/** Reuse runner-owned binaries; standalone files retain the original go test path. */
export function goTestFixture(args, options) {
  const binaries = {
    './internal/httpapi': process.env.XIUXIAN_HTTPAPI_TEST_BINARY,
    './internal/service': process.env.XIUXIAN_SERVICE_TEST_BINARY
  };
  const binary = binaries[args[1]];
  const flags = args.slice(2);
  const supported = flags.every((flag, index) => flag === '-run' || flag === '-v' || flag === '-count=1' || flags[index - 1] === '-run');
  if (args[0] !== 'test' || !binary || !supported) return execFileSync('go', args, options);
  return execFileSync(
    binary,
    flags.map(flag => (flag === '-run' ? '-test.run' : flag === '-v' ? '-test.v' : flag === '-count=1' ? '-test.count=1' : flag)),
    options
  );
}
