import {file, path, git} from '@shopify/cli-kit';
import {renderWarning} from '@shopify/cli-kit/node/ui';
import {
  lockfiles,
  type Lockfile,
} from '@shopify/cli-kit/node/node-package-manager';

function missingLockfileWarning() {
  renderWarning({
    headline: 'No lockfile found',
    body:
      `If you don’t commit a lockfile, then your app might install the wrong ` +
      `package versions when deploying. To avoid versioning issues, generate a ` +
      `new lockfile and commit it to your repository.`,
    nextSteps: [
      [
        'Generate a lockfile. Run',
        {
          command: 'npm|yarn|pnpm install',
        },
      ],
      'Commit the new file to your repository',
    ],
  });
}

function multipleLockfilesWarning(lockfiles: Lockfile[]) {
  const packageManagers = {
    'yarn.lock': 'yarn',
    'package-lock.json': 'npm',
    'pnpm-lock.yaml': 'pnpm',
  };

  const lockfileList = lockfiles.map((lockfile) => {
    return `${lockfile} (created by ${packageManagers[lockfile]})`;
  });

  renderWarning({
    headline: 'Multiple lockfiles found',
    body: [
      `Your project contains more than one lockfile. This can cause version ` +
        `conflicts when installing and deploying your app. The following ` +
        `lockfiles were detected:\n`,
      {list: {items: lockfileList}},
    ],
    nextSteps: [
      'Delete any unneeded lockfiles',
      'Commit the change to your repository',
    ],
  });
}

function lockfileIgnoredWarning(lockfile: string) {
  renderWarning({
    headline: 'Lockfile ignored by Git',
    body:
      `Your project’s lockfile isn’t being tracked by Git. If you don’t commit ` +
      `a lockfile, then your app might install the wrong package versions when ` +
      `deploying.`,
    nextSteps: [
      `In your project’s .gitignore file, delete any references to ${lockfile}`,
      'Commit the change to your repository',
    ],
  });
}

export async function checkLockfileStatus(directory: string) {
  if (process.env.LOCAL_DEV) return;

  const availableLockfiles: Lockfile[] = [];
  for (const lockFileName of lockfiles) {
    if (await file.exists(path.resolve(directory, lockFileName))) {
      availableLockfiles.push(lockFileName);
    }
  }

  if (!availableLockfiles.length) {
    return missingLockfileWarning();
  }

  if (availableLockfiles.length > 1) {
    return multipleLockfilesWarning(availableLockfiles);
  }

  try {
    const repo = git.factory(directory);
    const lockfile = availableLockfiles[0]!;
    const ignoredLockfile = await repo.checkIgnore([lockfile]);

    if (ignoredLockfile.length) {
      lockfileIgnoredWarning(lockfile);
    }
  } catch {
    // Not a Git repository, ignore
  }
}
