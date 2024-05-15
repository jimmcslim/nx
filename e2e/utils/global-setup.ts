import { Config } from '@jest/types';
import { workspaceRoot } from '@nx/devkit';
import { startLocalRegistry } from '@nx/js/plugins/jest/local-registry';
import { existsSync, removeSync } from 'fs-extra';
import * as isCI from 'is-ci';
import { join } from 'node:path';
import { registerTsConfigPaths } from '../../packages/nx/src/plugins/js/utils/register';
import { runLocalRelease } from '../../scripts/local-registry/populate-storage';

// TODO: figure out why workspaceRoot and therefore getPublishedVersion() is not working
process.env.PUBLISHED_VERSION = '20.0.0';

export default async function (globalConfig: Config.ConfigGlobals) {
  const isVerbose: boolean =
    process.env.NX_VERBOSE_LOGGING === 'true' || !!globalConfig.verbose;

  /**
   * For e2e-ci we populate the verdaccio storage up front, but for other workflows we need
   * to run the full local release process before running tests.
   */
  const requiresLocalRelease = process.env.NX_TASK_TARGET_TARGET !== 'e2e-ci';

  global.e2eTeardown = await startLocalRegistry({
    localRegistryTarget: '@nx/nx-source:local-registry',
    verbose: isVerbose,
    clearStorage: requiresLocalRelease,
  });

  if (process.env.NX_E2E_SKIP_CLEANUP !== 'true' || !existsSync('./build')) {
    if (!isCI) {
      registerTsConfigPaths(join(__dirname, '../../tsconfig.base.json'));
      const { e2eCwd } = await import('./get-env-info');
      removeSync(e2eCwd);
    }
    if (requiresLocalRelease) {
      console.log('Publishing packages to local registry');
      const publishVersion = process.env.PUBLISHED_VERSION ?? 'major';
      await runLocalRelease(publishVersion, isVerbose);
    }
  }
}
