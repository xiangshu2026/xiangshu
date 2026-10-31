/* 把 index.html + css + 各 js 打包为单文件 HTML（便于拷到手机/发送） */
const fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const files = ['js/lunar.js','js/xs-data.js','js/xs-bazi.js','js/xs-daily.js','js/xs-avoid.js','js/xs-meihua.js','js/xs-liuyao.js','js/xs-xiaoliuren.js','js/xs-games.js','js/xs-gacha.js','js/xs-records.js','js/xs-prob.js','js/xs-match.js','js/xs-chars.js','js/xs-pool.js','js/xs-interp.js','js/app.js'];
let out = html;
// 内联 CSS
const css = fs.readFileSync(path.join(root, 'assets/app.css'), 'utf8');
out = out.replace(/<link rel="stylesheet" href="assets\/app\.css">/, '<style>\n' + css + '\n</style>');
// 内联 JS
files.forEach(f => {
  let js = fs.readFileSync(path.join(root, f), 'utf8');
  if (/<\/script/i.test(js)) { js = js.replace(/<\/script/gi, '<\\/script'); console.log('注意：' + f + ' 含 </script，已转义'); }
  out = out.replace(new RegExp('<script src="' + f.replace(/[.\/]/g, m => '\\' + m) + '"><\\/script>'), '<script>\n' + js + '\n</script>');
});
if (out.includes('src="js/') || out.includes('href="assets/')) { console.error('仍有未内联的外部引用，构建失败'); process.exit(1); }
fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
const target = path.join(root, 'dist', '象数工坊-单文件版.html');
fs.writeFileSync(target, out, 'utf8');
console.log('已生成 ' + target + '（' + (Buffer.byteLength(out, 'utf8') / 1024).toFixed(0) + ' KB）');
