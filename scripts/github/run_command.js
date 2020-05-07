/* eslint-disable */
const child_process_1 = require('child_process');
exports.run = (command) => {
  return child_process_1.execSync(command).toString();
};
