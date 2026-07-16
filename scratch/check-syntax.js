const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../src/commands/actions/69.js');
const c = fs.readFileSync(file, 'utf8');
console.log("LENGTH:", c.length);
console.log("END:", JSON.stringify(c.slice(-100)));

try {
  eval(c);
  console.log("EVAL SUCCESS");
} catch (e) {
  console.error("EVAL ERROR:", e);
}

try {
  require(file);
  console.log("REQUIRE SUCCESS");
} catch (e) {
  console.error("REQUIRE ERROR:", e);
}
