const fetch = require('node-fetch');
async function run() {
  const res = await fetch("https://cbt-mandiri.vercel.app/api/login", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({username: "admin", password: "123"})
  });
  const text = await res.text();
  console.log("Status:", res.status);
  console.log("Body:", text);
}
run();
