// Ported from https://github.com/passsy/gradle-GitVersioner
// Inspired by https://medium.com/@passsy/use-different-build-numbers-for-every-build-automatically-using-a-gradle-script-35577cd31b19

const execa = require('execa');
const fs = require('fs');

let rootDir = process.env.APPCENTER_SOURCE_DIRECTORY;
if (process.argv[2] == 'runner') rootDir = __dirname;
rootDir = rootDir || process.argv[2] || __dirname;

const GitVersion = {
  name: '',
  version: 0,
  branchName: null,
  shortBranch: '',
  branchVersion: 0,
  localChanges: 0,
  commit: null,

  toString() {
    if (this.name == null || this.name === '') {
      this.name = `name='${this.name}',
        version=${this.version},
        branchName='${this.branchName}',
        shortBranch='${this.shortBranch}'
        branchVersion=${this.branchVersion}}`;
    }

    return this.name;
  },
};

main();

async function main() {
  await generateVersionName();

  const packageFile =
    process.env.APPCENTER_REACTNATIVE_PACKAGE || `${__dirname}/../package.json`;

  const packageVersion = require(packageFile).version.split('-')[0];

  fs.writeFileSync(
    `${rootDir}/../.env.versions`,
    `
export PACKAGE_VERSION="${packageVersion}"
export GIT_VERSION_NAME="${GitVersion.name}"
export VERSION="${GitVersion.version}"
export IOS_VERSION="${packageVersion}"
export ANDROID_VERSION_NAME="${packageVersion}"
export IOS_VERSION_BUILD_NUMBER="${GitVersion.version}"
export ANDROID_VERSION_CODE="${GitVersion.version}"
`,
  );

  console.dir(GitVersion);
  console.log(`wrote ${GitVersion.toString()} to ${rootDir}/../.env.versions`);
}

async function generateVersionName() {
  // check if git project
  try {
    await execa('git', ['status'], {
      cwd: rootDir,
    });
  } catch (err) {
    if (err.code === 69) {
      console.log(`git returned with error 69
        If you are a mac user that message is telling you is that you need to open the
        application XCode on your Mac OS X/macOS and since it hasn’t run since the last
        update, you need to accept the new license EULA agreement that’s part of the
        updated XCode.`);
    }
    if (err.code > 0) {
      console.log(
        `ERROR: can't generate a git version, this is not a git project
           -> Not a git repository (or any of the parent directories): .git`,
      );
    }
    process.exit(1);
  }

  // try {
  //   await exec(`git fetch --unshallow`, {
  //     cwd: rootDir,
  //   });
  // } catch (err) {
  //   console.log('No need to fetch, everything is here.');
  // }

  // read ext properties
  // const configuration = getPropertyOrDefault(rootProject, "gitVersioner", [:]) as Map
  const configuration = { get() {} };

  const stableBranches = configuration.get('stableBranches') || [
    'master',
    'beta',
  ];
  let defaultBranch = configuration.get('defaultBranch') || 'develop';
  const yearFactor = parseFloat(
    (configuration.get('yearFactor') || '1000').toString(),
  );
  const snapshotEnabled = configuration.get('snapshotEnabled') !== false;
  const localChangesCountEnabled =
    configuration.get('localChangesCountEnabled') !== false;
  // TODO: this is not implemented
  const shortNameClosure = configuration.get('shortName');

  // get information from git
  let currentBranch = process.env.APPCENTER_BRANCH || process.env.MOBILECENTER_BRANCH;
  if (currentBranch == null) ({ stdout: currentBranch }) = await execa(
    'git',
    ['symbolic-ref', '--short', '-q', 'HEAD'],
    {
      cwd: rootDir,
    },
  );

  if (stableBranches.includes(currentBranch)) defaultBranch = currentBranch;

  const { stdout: currentCommit } = await execa('git', ['rev-parse', 'HEAD'], {
    cwd: rootDir,
  });

  const { stdout: log } = await execa(
    'git',
    ['log', '--pretty=format:%at', '--reverse'],
    {
      cwd: rootDir,
    },
  );
  const logs = log === '' ? [] : log.split('\n');
  const initialCommitDate = logs.length > 0 ? logs[0] : 0;

  const { stdout: localChanges } = await execa('git', ['diff-index', 'HEAD'], {
    cwd: rootDir,
  });

  const localChangesCount =
    localChanges === '' ? 0 : localChanges.split('\n').length;
  hasLocalChanges = localChangesCount > 0;

  let diffToDefault = '';
  try {
    const { stdout } = await execa('git', ['rev-list', `${defaultBranch}..`], {
      cwd: rootDir,
    });
    diffToDefault = stdout;
  } catch (err) {
    diffToDefault = await execa(
      'git',
      ['rev-list', `origin/${defaultBranch}..`],
      {
        cwd: rootDir,
      },
    );
  }

  const featurelines = diffToDefault.split('\n');
  const commitsInFeatureBranch = diffToDefault === '' ? 0 : featurelines.length;

  // the sha1 of the latest commit in the default branch
  // TODO: what if there are no common commits.  return `currentCommit`
  const { stdout: lastestDefaultBranchCommitSha1 } = await execa(
    'git',
    ['merge-base', defaultBranch, currentBranch],
    { cwd: rootDir },
  );

  // get additional information
  const { stdout: defaultBranchDatesLog } = await execa(
    'git',
    ['log', '--pretty=format:%at', '-n', '1', lastestDefaultBranchCommitSha1],
    { cwd: rootDir },
  );

  const latestCommitDate =
    defaultBranchDatesLog == null
      ? Number(initialCommitDate)
      : Number(defaultBranchDatesLog);

  // commit count is the first part of the version
  const { stdout: defautBranchCommitCount } = await execa(
    'git',
    ['rev-list', '--count', lastestDefaultBranchCommitSha1],
    { cwd: rootDir },
  );

  const commitCount =
    defautBranchCommitCount == null ? 0 : Number(defautBranchCommitCount);

  // calculate the time part of the version. 2500 == 2 years, 6 months; 300 == 0.3 year
  const YEAR_IN_SECONDS = 60 * 60 * 24 * 365;
  const diff = latestCommitDate - initialCommitDate;

  const time =
    yearFactor <= 0 ? 0 : Math.ceil(diff * yearFactor / YEAR_IN_SECONDS + 0.5);

  // this is the version
  const combinedVersion = commitCount + time;

  let snapshot = '';
  if (localChangesCountEnabled && localChangesCount > 0) {
    snapshot += `(${localChangesCount})`;
  }
  if (snapshotEnabled && hasLocalChanges) {
    snapshot += '-SNAPSHOT';
  }

  const featureBranchCommits =
    commitsInFeatureBranch === 0 ? '' : commitsInFeatureBranch;

  const shortBranch = getTinyBranchName(currentBranch, 2);

  Object.assign(GitVersion, {
    version: combinedVersion,
    branchName: currentBranch,
    commit: currentCommit,
    branchVersion: commitsInFeatureBranch,
    localChanges: localChangesCount,
    shortBranch,
    name: `${combinedVersion}-${shortBranch}${featureBranchCommits}${snapshot}`,
  });

  // return only the version when on the default branch
  if (featureBranchCommits === '') {
    GitVersion.name = `${combinedVersion}${snapshot}`;
  }

  return GitVersion;
}

function getTinyBranchName(originalName, length) {
  const nameBase64 = Buffer.from(originalName).toString('base64');

  if (nameBase64.length < length) {
    const charPos = originalName.length % 26 + 65;
    const lowerCase = String.fromCharCode(charPos).toLowerCase();

    return ''.padEnd(2, lowerCase);
  }

  const outChars = new Array(length);
  const chars = Array.from(nameBase64);

  chars.forEach((char, idx) => {
    const c = chars[idx];
    const pos = idx % length;

    if (outChars[pos] == null) outChars[pos] = 0;

    const next = c.charCodeAt() + outChars[pos];
    outChars[pos] = next % 26;
  });

  return outChars
    .map(i => String.fromCharCode(i + 65))
    .join('')
    .toLowerCase();
}
