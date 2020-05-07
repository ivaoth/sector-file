/* eslint-disable */
let msg = '';

if (require.main === module) {
  process.stdin.setEncoding('utf8');

  process.stdin.on('readable', () => {
    const chunk = process.stdin.read();
    if (chunk !== null) {
      msg += chunk;
    }
  });

  process.stdin.on('end', () => {
    const argv = process.argv.slice(2);
    console.log(rewriteMsg(msg, argv[0]));
  });
}

function rewriteMsg(msg, prNo) {
  const lines = msg.split(/\n/);
  lines[0] += ' (#' + prNo + ')';
  lines.push('PR Close #' + prNo);
  return lines.join('\n');
}

exports.rewriteMsg = rewriteMsg;
