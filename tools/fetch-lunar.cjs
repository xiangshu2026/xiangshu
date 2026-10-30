
const fs = require('fs');
const path = require('path');
const dir = 'E:\\deepseek工作区\\xiangshu\\vendor';
fs.mkdirSync(dir, { recursive: true });
(async () => {
  const meta = await (await fetch('https://registry.npmmirror.com/lunar-javascript/latest')).json();
  console.log('version=' + meta.version);
  const tar = meta.dist.tarball;
  console.log('tarball=' + tar);
  const buf = Buffer.from(await (await fetch(tar)).arrayBuffer());
  fs.writeFileSync(path.join(dir, 'lunar-javascript.tgz'), buf);
  console.log('bytes=' + buf.length);
})().catch(e => { console.error('ERR ' + e.message); process.exit(1); });
