const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..', 'pages', 'news');
const files = fs.readdirSync(dir).filter((f) => /^\d+\.html$/.test(f));

const news = files.map((f) => {
  const html = fs.readFileSync(path.join(dir, f), 'utf8');
  const id = f.replace('.html', '');
  const title = ((html.match(/<title>([^<]+)/) || [])[1] || '')
    .replace(/\s*—\s*TNC NEWS$/, '')
    .trim();
  const excerpt = ((html.match(/name="description" content="([^"]+)"/) || [])[1] || '');
  const category = ((html.match(/class="ap-cat"[^>]*>.*?<\/i>([^<]+)/s) || [])[1] || '').trim();
  const author = ((html.match(/fa-regular fa-user[^>]*><\/i>\s*([^<]+)/) || [])[1] || 'TNC 編輯').trim();
  const dateMatch = html.match(/fa-regular fa-clock[^>]*><\/i>\s*([^<]+)/);
  const image = ((html.match(/property="og:image" content="([^"]+)"/) || [])[1] || '');
  return {
    id,
    title,
    category,
    excerpt,
    content: '',
    author,
    date: dateMatch ? dateMatch[1].trim() : '',
    image,
    published: true
  };
}).sort((a, b) => Number(b.id) - Number(a.id));

fs.writeFileSync(
  path.join(__dirname, '..', 'js', 'news-data.json'),
  JSON.stringify({ news }, null, 2),
  'utf8'
);

console.log('Generated', news.length, 'articles');
