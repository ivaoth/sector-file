/* eslint-disable */
const run_command_1 = require('./run_command');
const path_1 = require('path');
const current = run_command_1.run('git rev-parse --abbrev-ref HEAD').trim();
const base = path_1.resolve(__dirname, '../..');
if (current !== 'master') {
  console.log('Not currently on master');
  process.exitCode = 1;
} else {
  if (process.argv.length !== 3) {
    console.log('Merge GitHub PR into the master branch');
    console.log();
    console.log(`${process.argv[0]} ${process.argv[1]} PR_NUMBER`);
    console.log();
  } else {
    const prNumber = process.argv[2];
    run_command_1.run(`git fetch upstream pull/${prNumber}/head:pr${prNumber}`);
    run_command_1.run(
      `git filter-branch -f --msg-filter "${process.argv[0]} ${path_1.resolve(
        base,
        'scripts/github/github_closes.js'
      )} ${prNumber}" master..pr${prNumber}`
    );
    run_command_1.run(`git cherry-pick master..pr${prNumber}`);
  }
}
